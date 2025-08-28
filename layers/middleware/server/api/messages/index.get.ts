import { getMessagesByChat, getRecentMessagesByChat, searchMessagesByContent } from '../../repository/messageRepository'
import type { PaginatedResponse, Message } from '../../types/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<Message | (Message & { chatTitle?: string })>> => {
    const query = getQuery(event)

    try {
        const userId = getHeader(event, 'x-user-id') as string

        // Validate that userId is provided
        if (!userId) {
            return {
                success: false,
                message: 'User required',
                error: 'x-user-id header is mandatory',
                data: [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        const {
            chatId,
            page = 1,
            limit = 50,
            orderBy = 'createdAt',
            orderDirection = 'asc',
            recent,
            search
        } = query

        // If searching by content
        if (search && typeof search === 'string') {
            const result = await searchMessagesByContent(userId, search, {
                page: Number(page),
                limit: Number(limit)
            })

            return {
                success: true,
                message: 'Messages found successfully',
                data: result.documents,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                    hasNext: result.hasNext,
                    hasPrev: result.hasPrev
                }
            }
        }

        // Validate that chatId is provided for other operations
        if (!chatId || typeof chatId !== 'string') {
            return {
                success: false,
                message: 'Chat ID required',
                error: 'The chatId parameter is mandatory',
                data: [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        // If recent messages are requested (no pagination)
        if (recent === 'true') {
            const messages = await getRecentMessagesByChat(chatId, userId, Number(limit) || 20)

            return {
                success: true,
                message: 'Recent messages retrieved successfully',
                data: messages,
                pagination: {
                    page: 1,
                    limit: messages.length,
                    total: messages.length,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        // Get messages with pagination
        const result = await getMessagesByChat(chatId, userId, {
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        return {
            success: true,
            message: 'Messages retrieved successfully',
            data: result.documents,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev
            }
        }
    } catch (error) {
        console.error('Error getting messages:', error)

        // Handle specific errors
        let errorMessage = 'Error getting messages'
        if (error instanceof Error) {
            if (error.message.includes('not found or you do not have permission')) {
                errorMessage = 'Chat not found or permission denied'
            }
        }

        return {
            success: false,
            message: errorMessage,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: [],
            pagination: {
                page: Number(query.page) || 1,
                limit: Number(query.limit) || 50,
                total: 0,
                hasNext: false,
                hasPrev: false
            }
        }
    }
})
