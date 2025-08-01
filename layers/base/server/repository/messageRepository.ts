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
} from '../types/firestore'

const COLLECTION_NAME = 'messages'

// Crear nuevo mensaje
export async function createMessage(data: {
    chatId: string
    content: string
    role: MessageRole
    userId: string
    metadata?: Record<string, unknown>
}): Promise<Message> {
    // Validar campos requeridos
    const validation = validateRequiredFields(data, ['chatId', 'content', 'role', 'userId'])
    if (!validation.isValid) {
        throw new Error(`Campos requeridos faltantes: ${validation.missingFields.join(', ')}`)
    }

    // Verificar que el chat existe y pertenece al usuario
    const chat = await getChatByIdForUser(data.chatId, data.userId)
    if (!chat) {
        throw new Error('Chat no encontrado o no tienes permisos para agregar mensajes')
    }

    // Crear el mensaje
    const messageData = {
        chatId: data.chatId,
        content: data.content.trim(),
        role: data.role,
        userId: data.userId,
        isActive: true,
        metadata: data.metadata || undefined
    }

    const newMessage = await createDocument<Message>(COLLECTION_NAME, messageData)

    // Actualizar actividad del chat
    await updateChatActivity(data.chatId, true)

    return newMessage
}

// Obtener mensaje por ID
export async function getMessageById(id: string): Promise<Message | null> {
    return await getDocumentById<Message>(COLLECTION_NAME, id)
}

// Obtener mensajes de un chat con paginación
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
    // Verificar que el usuario tiene acceso al chat
    const chat = await getChatByIdForUser(chatId, userId)
    if (!chat) {
        throw new Error('Chat no encontrado o no tienes permisos para ver los mensajes')
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

// Obtener mensajes recientes de un chat (sin paginación)
export async function getRecentMessagesByChat(
    chatId: string,
    userId: string,
    limit: number = 20
): Promise<Message[]> {
    // Verificar que el usuario tiene acceso al chat
    const chat = await getChatByIdForUser(chatId, userId)
    if (!chat) {
        throw new Error('Chat no encontrado o no tienes permisos para ver los mensajes')
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

    // Retornar en orden cronológico (más antiguo primero)
    return messages.reverse()
}

// Actualizar mensaje
export async function updateMessage(
    id: string,
    userId: string,
    data: Partial<Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'chatId' | 'userId' | 'role'>>
): Promise<Message | null> {
    // Verificar que el mensaje existe
    const existingMessage = await getMessageById(id)
    if (!existingMessage) {
        throw new Error('Mensaje no encontrado')
    }

    // Verificar que el usuario tiene acceso al chat
    const chat = await getChatByIdForUser(existingMessage.chatId, userId)
    if (!chat) {
        throw new Error('No tienes permisos para modificar este mensaje')
    }

    // Solo permitir actualizar contenido y metadata
    const updateData: Partial<Message> = {}

    if (data.content !== undefined) {
        updateData.content = data.content.trim()
    }
    if (data.metadata !== undefined) {
        updateData.metadata = data.metadata
    }

    return await updateDocument<Message>(COLLECTION_NAME, id, updateData)
}

// Desactivar mensaje (soft delete)
export async function deactivateMessage(id: string, userId: string): Promise<void> {
    // Verificar que el mensaje existe
    const existingMessage = await getMessageById(id)
    if (!existingMessage) {
        throw new Error('Mensaje no encontrado')
    }

    // Verificar que el usuario tiene acceso al chat
    const chat = await getChatByIdForUser(existingMessage.chatId, userId)
    if (!chat) {
        throw new Error('No tienes permisos para eliminar este mensaje')
    }

    await updateDocument<Message>(COLLECTION_NAME, id, { isActive: false })
}

// Buscar mensajes por contenido
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

    // Obtener todos los chats del usuario
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

    // Buscar mensajes que contengan el término (limitado por Firestore)
    const searchTermLower = searchTerm.toLowerCase().trim()

    // Firestore no tiene búsqueda full-text, esta es una implementación básica
    const messagesQuery = await firestoreClient
        .collection(COLLECTION_NAME)
        .where('chatId', 'in', chatIds.slice(0, 10)) // Firestore limita 'in' a 10 elementos
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(100) // Obtener más para filtrar localmente
        .get()

    // Filtrar mensajes que contengan el término de búsqueda
    const allResults = messagesQuery.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Message)
        .filter(message => message.content.toLowerCase().includes(searchTermLower))
        .map(message => ({ ...message, chatTitle: chatTitles.get(message.chatId) }));

    // Aplicar paginación manual
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

// Obtener estadísticas de mensajes de usuario
export async function getUserMessageStats(userId: string): Promise<{
    totalMessages: number
    messagesThisWeek: number
    messagesThisMonth: number
    averageMessagesPerChat: number
}> {
    // Obtener todos los chats del usuario
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

    // Obtener mensajes (en lotes debido a limitación de Firestore)
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

    // Calcular estadísticas
    const totalMessages = allMessages.length

    const now = new Date()
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const messagesThisWeek = allMessages.filter(msg =>
        msg.createdAt.toDate() >= thisWeek
    ).length

    const messagesThisMonth = allMessages.filter(msg =>
        msg.createdAt.toDate() >= thisMonth
    ).length

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
