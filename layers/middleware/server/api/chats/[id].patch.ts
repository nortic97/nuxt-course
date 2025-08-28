import { updateChat } from '../../repository/chatRepository'
import type { ApiResponse, Chat } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<Chat>> => {
    try {
        const chatId = getRouterParam(event, 'id') as string
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

        // Validate that chatId is provided
        if (!chatId) {
            return {
                success: false,
                message: 'Chat ID required',
                error: 'The id parameter is mandatory'
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

        // Prepare update data (only allowed fields)
        const updateData: Partial<Chat> = {}
        
        if (body.title !== undefined) {
            updateData.title = body.title.trim()
        }

        // Validate that there is something to update
        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                message: 'No data to update',
                error: 'You must provide at least one field to update'
            }
        }

        // Update the chat
        const updatedChat = await updateChat(chatId, userId, updateData)

        if (!updatedChat) {
            return {
                success: false,
                message: 'Error updating chat',
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

            if (error.message.includes('Missing required fields')) {
                return {
                    success: false,
                    message: 'Incomplete data',
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
