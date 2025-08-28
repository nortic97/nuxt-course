import { getChatWithMessages } from '../../repository/chatRepository'
import type { ApiResponse, ChatWithMessages } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<ChatWithMessages>> => {
    try {
        const chatId = getRouterParam(event, 'id')
        const userId = getHeader(event, 'x-user-id') as string

        // Validate that userId is provided
        if (!userId) {
            return {
                success: false,
                message: 'User required',
                error: 'x-user-id header is mandatory'
            }
        }

        if (!chatId) {
            return {
                success: false,
                message: 'Chat ID required',
                error: 'Chat ID was not provided'
            }
        }

        // Get the chat with messages
        const chatWithMessages = await getChatWithMessages(chatId, userId)

        if (!chatWithMessages) {
            return {
                success: false,
                message: 'Chat not found',
                error: 'A chat with the provided ID does not exist or you do not have permission to view it'
            }
        }

        return {
            success: true,
            message: 'Chat retrieved successfully',
            data: chatWithMessages
        }
    } catch (error) {
        console.error('Error getting chat:', error)
        return {
            success: false,
            message: 'Error getting chat',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
