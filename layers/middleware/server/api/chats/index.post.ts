import { createChat } from '../../repository/chatRepository'
import type { ApiResponse, Chat } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<Chat>> => {
    try {
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

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Data required',
                error: 'No data sent in the request body'
            }
        }

        // Validate required fields
        if (!body.agentId) {
            return {
                success: false,
                message: 'Agent ID required',
                error: 'The agentId field is mandatory'
            }
        }

        // Prepare chat data
        const chatData: any = {
            userId: userId,
            agentId: body.agentId.trim()
        }

        // Only add optional fields if they have a value
        if (body.title?.trim()) {
            chatData.title = body.title.trim()
        }

        // Create the chat
        const newChat = await createChat(chatData)

        return {
            success: true,
            message: 'Chat created successfully',
            data: newChat
        }
    } catch (error) {
        console.error('Error creating chat:', error)

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('does not have access to this agent')) {
                return {
                    success: false,
                    message: 'Access denied',
                    error: error.message
                }
            }

            if (error.message.includes('does not exist or is not active')) {
                return {
                    success: false,
                    message: 'Invalid user or agent',
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
            message: 'Error creating chat',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
