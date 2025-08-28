import type { Timestamp } from 'firebase-admin/firestore'
import { $fetch } from 'ofetch'

// Interface for the API response
interface ApiResponse<T> {
    success: boolean
    message: string
    data?: T
    error?: string
}

// Interface for paginated response
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

// Interface for a chat (compatible with the base layer)
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

// Interface for creating a chat
interface CreateChatData {
    title?: string
    agentId: string
}

/**
 * Get chats for a user using the base layer API
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
            throw new Error(response.error || 'Error fetching chats')
        }

        return response.data || []
    } catch (error) {
        console.error('Error in getChatsByUserViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Unknown error fetching chats'
        )
    }
}

/**
 * Create a new chat using the base layer API
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
            throw new Error(response.error || 'Error creating chat')
        }

        return response.data
    } catch (error) {
        console.error('Error in createChatViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Unknown error creating chat'
        )
    }
}

/**
 * Get a specific chat by ID using the base layer API
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
            if (response.error?.includes('not found')) {
                return null
            }
            throw new Error(response.error || 'Error fetching chat')
        }

        return response.data || null
    } catch (error) {
        console.error('Error in getChatByIdViaAPI:', error)
        // If it's a 404 error, return null
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
            return null
        }
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Unknown error fetching chat'
        )
    }
}
