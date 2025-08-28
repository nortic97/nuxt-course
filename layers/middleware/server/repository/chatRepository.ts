import { firestoreClient } from '../utils/firebase.client'
import { Timestamp } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import {
    createDocument,
    updateDocument,
    getDocumentById,
    getPaginatedDocuments,
    validateRequiredFields
} from '../utils/firestore.helpers'
import { getUserById } from './userRepository'
import { checkUserAgentAccess } from './userAgentRepository'
import type {
    Chat,
    ChatWithMessages,
    Message,
    PaginationParams
} from '../types/types'

const COLLECTION_NAME = 'chats'

// Create a new chat
export async function createChat(data: {
    id?: string
    title?: string
    userId: string
    agentId: string
}): Promise<Chat> {
    // Validate required fields
    const validation = validateRequiredFields(data, ['userId', 'agentId'])
    if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
    }

    // Check that the user exists and is active
    const user = await getUserById(data.userId)
    if (!user || !user.isActive) {
        throw new Error('The specified user does not exist or is not active')
    }

    // Check that the user has access to the agent
    const accessCheck = await checkUserAgentAccess(data.userId, data.agentId)
    if (!accessCheck.hasAccess) {
        throw new Error(`You do not have access to this agent: ${accessCheck.reason}`)
    }

    // Generate a chat ID if one is not provided
    const chatId = data.id || uuidv4()

    // Create the chat
    const chatData: any = {
        id: chatId,
        title: data.title?.trim() || 'New Chat',
        userId: data.userId,
        agentId: data.agentId,
        isActive: true,
        messageCount: 0,
        lastMessageAt: Timestamp.now()
    }

    return await createDocument<Chat>(COLLECTION_NAME, chatData, chatId)
}

// Get chat by ID
export async function getChatById(id: string): Promise<Chat | null> {
    return await getDocumentById<Chat>(COLLECTION_NAME, id)
}

// Get chat by ID for a specific user
export async function getChatByIdForUser(
    id: string,
    userId: string
): Promise<Chat | null> {
    const chat = await getChatById(id)

    if (!chat || chat.userId !== userId || !chat.isActive) {
        return null
    }

    return chat
}

// Get chat with messages
export async function getChatWithMessages(
    id: string,
    userId?: string
): Promise<ChatWithMessages | null> {
    const chat = userId
        ? await getChatByIdForUser(id, userId)
        : await getChatById(id)

    if (!chat) {
        return null
    }

    // Get messages from the chat
    const messagesQuery = await firestoreClient
        .collection('messages')
        .where('chatId', '==', id)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'asc')
        .get()

    const messages = messagesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Message[]

    return {
        ...chat,
        messages
    }
}

// Get all chats of a user with pagination
export async function getChatsByUser(
    userId: string,
    params: PaginationParams = {}
): Promise<{
    documents: Chat[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 10, orderBy = 'lastMessageAt', orderDirection = 'desc' } = params

    return await getPaginatedDocuments<Chat>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: [
            { field: 'userId', operator: '==', value: userId },
            { field: 'isActive', operator: '==', value: true }
        ]
    })
}

// Update chat
export async function updateChat(
    id: string,
    userId: string,
    data: Partial<Omit<Chat, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'agentId'>>
): Promise<Chat | null> {
    // Check that the chat exists and belongs to the user
    const existingChat = await getChatByIdForUser(id, userId)
    if (!existingChat) {
        throw new Error('Chat not found or you do not have permission to modify it')
    }

    // Prepare update data
    const updateData: Partial<Chat> = {}

    if (data.title !== undefined) {
        updateData.title = data.title.trim() || 'Untitled Chat'
    }

    return await updateDocument<Chat>(COLLECTION_NAME, id, updateData)
}

// Update message count and last activity
export async function updateChatActivity(
    chatId: string,
    incrementMessageCount: boolean = true
): Promise<void> {
    const chat = await getChatById(chatId)
    if (!chat) {
        throw new Error('Chat not found')
    }

    const updateData: Partial<Chat> = {
        lastMessageAt: Timestamp.now()
    }

    if (incrementMessageCount) {
        updateData.messageCount = (chat.messageCount || 0) + 1
    }

    await updateDocument<Chat>(COLLECTION_NAME, chatId, updateData)
}

// Deactivate chat (soft delete)
export async function deactivateChat(id: string, userId: string): Promise<void> {
    // Check that the chat exists and belongs to the user
    const existingChat = await getChatByIdForUser(id, userId)
    if (!existingChat) {
        throw new Error('Chat not found or you do not have permission to delete it')
    }

    await updateDocument<Chat>(COLLECTION_NAME, id, { isActive: false })
}

// Search chats by title
export async function searchChatsByTitle(
    userId: string,
    searchTerm: string,
    params: PaginationParams = {}
): Promise<{
    documents: Chat[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 10 } = params

    // Firestore does not have native full-text search, we use prefix search
    const searchTermLower = searchTerm.toLowerCase().trim()

    const querySnapshot = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .where('title', '>=', searchTermLower)
        .where('title', '<', searchTermLower + '\uf8ff')
        .orderBy('title')
        .orderBy('lastMessageAt', 'desc')
        .get()

    const allResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Chat[]

    // Apply manual pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const documents = allResults.slice(startIndex, endIndex)

    return {
        documents,
        total: allResults.length,
        hasNext: endIndex < allResults.length,
        hasPrev: page > 1
    }
}

// Get user chat statistics
export async function getUserChatStats(userId: string): Promise<{
    totalChats: number
    totalMessages: number
    chatsThisMonth: number
    mostUsedAgent?: string
}> {
    const chatsQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    const chats = chatsQuery.docs.map(doc => doc.data()) as Chat[]

    // Calculate statistics
    const totalChats = chats.length
    const totalMessages = chats.reduce((sum, chat) => sum + (chat.messageCount || 0), 0)

    // Chats this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const chatsThisMonth = chats.filter(chat => {
        const createdAt = chat.createdAt as Timestamp | Date | undefined
        const createdAtDate =
            createdAt && typeof (createdAt as Timestamp).toDate === 'function'
                ? (createdAt as Timestamp).toDate()
                : createdAt
        return createdAtDate && createdAtDate >= thisMonth
    }).length

    // Most used agent
    const agentCounts: Record<string, number> = {}
    chats.forEach(chat => {
        agentCounts[chat.agentId] = (agentCounts[chat.agentId] || 0) + 1
    })

    const agentKeys = Object.keys(agentCounts)
    const mostUsedAgent = agentKeys.length > 0
        ? agentKeys.reduce((a, b) => (agentCounts[a] || 0) > (agentCounts[b] || 0) ? a : b)
        : undefined

    return {
        totalChats,
        totalMessages,
        chatsThisMonth,
        mostUsedAgent
    }
}
