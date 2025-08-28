import { deactivateChat } from '../../repository/chatRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
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

        // Deactivate the chat (soft delete)
        await deactivateChat(chatId, userId)

        return {
            success: true,
            message: 'Chat deleted successfully',
            data: null
        }
    } catch (error) {
        console.error('Error deleting chat:', error)

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('not found or you do not have permission')) {
                return {
                    success: false,
                    message: 'Chat not found',
                    error: error.message
                }
            }
        }

        return {
            success: false,
            message: 'Error deleting chat',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
