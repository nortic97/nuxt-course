import { updateChat } from '../../repository/chatRepository'
import type { ApiResponse, Chat } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<Chat>> => {
    try {
        const chatId = getRouterParam(event, 'id')
        const body = await readBody(event)
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

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Data required',
                error: 'No data sent in the request body'
            }
        }

        // Prepare update data
        const updateData: Partial<Chat> = {}

        if (body.title !== undefined) {
            updateData.title = body.title?.trim() || 'Untitled Chat'
        }

        // Update the chat
        const updatedChat = await updateChat(chatId, userId, updateData)

        if (!updatedChat) {
            return {
                success: false,
                message: 'Error during update',
                error: 'Could not update the chat'
            }
        }

        return {
            success: true,
            message: 'Chat updated successfully',
            data: updatedChat
        }
    } catch (error) {
        console.error('Error updating chat:', error)

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
            message: 'Error updating chat',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
