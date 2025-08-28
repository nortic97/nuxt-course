import { firestoreClient } from '../utils/firebase.client'
import {
    createDocument,
    updateDocument,
    getDocumentById,
    getPaginatedDocuments,
    validateRequiredFields
} from '../utils/firestore.helpers'
import { getChatByIdForUser, updateChatActivity } from './chatRepository'
import type {
    Message,
    MessageRole,
    PaginationParams
} from '../types/types'

const COLLECTION_NAME = 'messages'

// Create a new message
export async function createMessage(data: {
    chatId: string
    content: string
    role: MessageRole
    userId: string
    metadata?: Record<string, unknown>
}): Promise<Message> {
    // Validate required fields
    const validation = validateRequiredFields(data, ['chatId', 'content', 'role', 'userId'])
    if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`)
    }

    // Verify that the chat exists and belongs to the user
    const chat = await getChatByIdForUser(data.chatId, data.userId)
    if (!chat) {
        throw new Error('Chat not found or you do not have permission to add messages')
    }

    // Create the message
    const messageData = {
        chatId: data.chatId,
        content: data.content.trim(),
        role: data.role,
        userId: data.userId,
        isActive: true,
        metadata: data.metadata || {}
    }

    const newMessage = await createDocument<Message>(COLLECTION_NAME, messageData)

    // Update chat activity
    await updateChatActivity(data.chatId, true)

    return newMessage
}

// Get message by ID
export async function getMessageById(id: string): Promise<Message | null> {
    return await getDocumentById<Message>(COLLECTION_NAME, id)
}

// Get messages from a chat with pagination
export async function getMessagesByChat(
    chatId: string,
    userId: string,
    params: PaginationParams = {}
): Promise<{
    documents: Message[]
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    // Verify that the user has access to the chat
    const chat = await getChatByIdForUser(chatId, userId)
    if (!chat) {
        throw new Error('Chat not found or you do not have permission to view the messages')
    }

    const { page = 1, limit = 50, orderBy = 'createdAt', orderDirection = 'asc' } = params

    return await getPaginatedDocuments<Message>(COLLECTION_NAME, {
        page,
        limit,
        orderBy,
        orderDirection,
        where: [
            { field: 'chatId', operator: '==', value: chatId },
            { field: 'isActive', operator: '==', value: true }
        ]
    })
}

// Get recent messages from a chat (no pagination)
export async function getRecentMessagesByChat(
    chatId: string,
    userId: string,
    limit: number = 20
): Promise<Message[]> {
    // Verify that the user has access to the chat
    const chat = await getChatByIdForUser(chatId, userId)
    if (!chat) {
        throw new Error('Chat not found or you do not have permission to view the messages')
    }

    const querySnapshot = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('chatId', '==', chatId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

    const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Message[]

    // Return in chronological order (oldest first)
    return messages.reverse()
}

// Update message
export async function updateMessage(
    id: string,
    userId: string,
    data: Partial<Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'chatId' | 'userId' | 'role'>>
): Promise<Message | null> {
    // Verify that the message exists
    const existingMessage = await getMessageById(id)
    if (!existingMessage) {
        throw new Error('Message not found')
    }

    // Verify that the user has access to the chat
    const chat = await getChatByIdForUser(existingMessage.chatId, userId)
    if (!chat) {
        throw new Error('You do not have permission to modify this message')
    }

    // Only allow updating content and metadata
    const updateData: Partial<Message> = {}

    if (data.content !== undefined) {
        updateData.content = data.content.trim()
    }
    if (data.metadata !== undefined) {
        updateData.metadata = data.metadata
    }

    return await updateDocument<Message>(COLLECTION_NAME, id, updateData)
}

// Deactivate message (soft delete)
export async function deactivateMessage(id: string, userId: string): Promise<void> {
    // Verify that the message exists
    const existingMessage = await getMessageById(id)
    if (!existingMessage) {
        throw new Error('Message not found')
    }

    // Verify that the user has access to the chat
    const chat = await getChatByIdForUser(existingMessage.chatId, userId)
    if (!chat) {
        throw new Error('You do not have permission to delete this message')
    }

    await updateDocument<Message>(COLLECTION_NAME, id, { isActive: false })
}

// Search messages by content
export async function searchMessagesByContent(
    userId: string,
    searchTerm: string,
    params: PaginationParams = {}
): Promise<{
    documents: Array<Message & { chatTitle?: string }>
    total: number
    hasNext: boolean
    hasPrev: boolean
}> {
    const { page = 1, limit = 20 } = params

    // Get all user chats
    const userChatsQuery = await firestoreClient
        .collection('chats')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    const chatIds = userChatsQuery.docs.map(doc => doc.id)
    const chatTitles = new Map(
        userChatsQuery.docs.map(doc => [doc.id, doc.data().title])
    )

    if (chatIds.length === 0) {
        return {
            documents: [],
            total: 0,
            hasNext: false,
            hasPrev: false
        }
    }

    // Search for messages containing the term (limited by Firestore)
    const searchTermLower = searchTerm.toLowerCase().trim()

    // Firestore does not have full-text search, this is a basic implementation
    const messagesQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('chatId', 'in', chatIds.slice(0, 10)) // Firestore limits 'in' to 10 elements
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(100) // Get more to filter locally
        .get()

    // Filter messages containing the search term
    const allResults = messagesQuery.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Message)
        .filter(message => message.content.toLowerCase().includes(searchTermLower))
        .map(message => ({ ...message, chatTitle: chatTitles.get(message.chatId) }));

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

// Get user message statistics
export async function getUserMessageStats(userId: string): Promise<{
    totalMessages: number
    messagesThisWeek: number
    messagesThisMonth: number
    averageMessagesPerChat: number
}> {
    // Get all user chats
    const userChatsQuery = await firestoreClient
        .collection('chats')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get()

    const chatIds = userChatsQuery.docs.map(doc => doc.id)

    if (chatIds.length === 0) {
        return {
            totalMessages: 0,
            messagesThisWeek: 0,
            messagesThisMonth: 0,
            averageMessagesPerChat: 0
        }
    }

    // Get messages (in batches due to Firestore limitation)
    let allMessages: Message[] = []

    for (let i = 0; i < chatIds.length; i += 10) {
        const batch = chatIds.slice(i, i + 10)
        const messagesQuery = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('chatId', 'in', batch)
            .where('isActive', '==', true)
            .get()

        const batchMessages = messagesQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Message[]

        allMessages = allMessages.concat(batchMessages)
    }

    // Calculate statistics
    const totalMessages = allMessages.length

    const now = new Date()
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const messagesThisWeek = allMessages.filter(msg => {
        const createdAt = msg.createdAt as Date | { toDate: () => Date };
        const createdAtDate = typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
            ? (createdAt as { toDate: () => Date }).toDate()
            : createdAt as Date;
        return createdAtDate >= thisWeek
    }).length

    const messagesThisMonth = allMessages.filter(msg => {
        const createdAt = msg.createdAt as Date | { toDate: () => Date };
        const createdAtDate = typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
            ? (createdAt as { toDate: () => Date }).toDate()
            : createdAt as Date;
        return createdAtDate >= thisMonth
    }).length

    const averageMessagesPerChat = chatIds.length > 0
        ? Math.round(totalMessages / chatIds.length * 100) / 100
        : 0

    return {
        totalMessages,
        messagesThisWeek,
        messagesThisMonth,
        averageMessagesPerChat
    }
}

// Get messages by user and agent
export async function getMessagesByUserAndAgent(
    userId: string,
    agentId: string,
    params: PaginationParams = {}
): Promise<{
    documents: Message[]
    total: number
    hasNext: boolean
    hasPrev: boolean
    chats: Array<{ id: string; title?: string; messageCount: number }>
}> {
    const { page = 1, limit = 50, orderBy = 'createdAt', orderDirection = 'desc' } = params

    // Get all user chats with the specific agent
    const userChatsQuery = await firestoreClient
        .collection('chats')
        .where('userId', '==', userId)
        .where('agentId', '==', agentId)
        .where('isActive', '==', true)
        .get()

    const chatIds = userChatsQuery.docs.map(doc => doc.id)
    const chatData = userChatsQuery.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        messageCount: doc.data().messageCount || 0,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
    }))

    if (chatIds.length === 0) {
        return {
            documents: [],
            total: 0,
            hasNext: false,
            hasPrev: false,
            chats: []
        }
    }

    // Get messages from all chats with pagination
    const allMessages: Message[] = []

    for (let i = 0; i < chatIds.length; i += 10) {
        const batch = chatIds.slice(i, i + 10)
        const messagesQuery = await firestoreClient
            .collection(COLLECTION_NAME)
            .where('chatId', 'in', batch)
            .where('isActive', '==', true)
            .orderBy(orderBy, orderDirection)
            .get()

        const batchMessages = messagesQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Message[]

        allMessages.push(...batchMessages)
    }

    // Sort all messages
    allMessages.sort((a, b) => {
        const aValue = orderBy === 'createdAt' ? a.createdAt : a[orderBy as keyof Message]
        const bValue = orderBy === 'createdAt' ? b.createdAt : b[orderBy as keyof Message]

        if (orderDirection === 'asc') {
            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return -1;
            if (bValue === undefined) return 1;
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    })

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const documents = allMessages.slice(startIndex, endIndex)

    return {
        documents,
        total: allMessages.length,
        hasNext: endIndex < allMessages.length,
        hasPrev: page > 1,
        chats: chatData
    }
}
