import type { Timestamp } from 'firebase-admin/firestore'

// Interfaz para la respuesta de la API
interface ApiResponse<T> {
    success: boolean
    message: string
    data?: T
    error?: string
}

// Interfaz para respuesta paginada
interface PaginatedResponse<T> {
    success: boolean
    message: string
    data: T[]
    error?: string
    pagination: {
        page: number
        limit: number
        total: number
        hasNext: boolean
        hasPrev: boolean
    }
}

// Interfaz para el chat (compatible con la capa base)
interface Chat {
    id: string
    title: string
    userId: string
    agentId: string
    isActive: boolean
    createdAt: Timestamp | Date
    updatedAt: Timestamp | Date
    lastMessageAt?: Timestamp | Date
    messageCount: number
    metadata?: {
        [key: string]: unknown
    }
}

// Interfaz para crear un chat
interface CreateChatData {
    title?: string
    agentId: string
}

/**
 * Obtener chats de un usuario usando la API de la capa base
 */
export async function getChatsByUserViaAPI(
    userId: string,
    options: {
        page?: number
        limit?: number
        orderBy?: string
        orderDirection?: 'asc' | 'desc'
    } = {}
): Promise<Chat[]> {
    try {
        const { page = 1, limit = 10, orderBy = 'lastMessageAt', orderDirection = 'desc' } = options

        const response = await $fetch('/api/chats', {
            method: 'GET',
            headers: {
                'x-user-id': userId
            },
            query: {
                page,
                limit,
                orderBy,
                orderDirection
            }
        }) as PaginatedResponse<Chat>

        if (!response.success) {
            throw new Error(response.error || 'Error al obtener chats')
        }

        return response.data || []
    } catch (error) {
        console.error('Error en getChatsByUserViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al obtener chats'
        )
    }
}

/**
 * Crear un nuevo chat usando la API de la capa base
 */
export async function createChatViaAPI(
    userId: string,
    chatData: CreateChatData
): Promise<Chat> {
    try {
        const response = await $fetch('/api/chats', {
            method: 'POST',
            headers: {
                'x-user-id': userId
            },
            body: {
                title: chatData.title,
                agentId: chatData.agentId
            }
        }) as ApiResponse<Chat>

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Error al crear chat')
        }

        return response.data
    } catch (error) {
        console.error('Error en createChatViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al crear chat'
        )
    }
}

/**
 * Obtener un chat específico por ID usando la API de la capa base
 */
export async function getChatByIdViaAPI(
    chatId: string,
    userId: string
): Promise<Chat | null> {
    try {
        const response = await $fetch(`/api/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'x-user-id': userId
            }
        }) as ApiResponse<Chat>

        if (!response.success) {
            if (response.error?.includes('no encontrado')) {
                return null
            }
            throw new Error(response.error || 'Error al obtener chat')
        }

        return response.data || null
    } catch (error) {
        console.error('Error en getChatByIdViaAPI:', error)
        // Si es un error 404, retornar null
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
            return null
        }
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al obtener chat'
        )
    }
}
