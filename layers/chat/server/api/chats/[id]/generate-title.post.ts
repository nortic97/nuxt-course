import type { ApiResponse } from '#layers/middleware/server/types/types'
import { AgentService } from '../../../services/agent-service'
import { MessageService } from '../../../services/message-service'
import { createOpenAIModel, generateChatTitle } from '../../../services/ai-service'
import { useServerApi } from '../../../composables/useServerApi'

export default defineEventHandler(async (event): Promise<ApiResponse<{ title: string }>> => {
    try {
        const chatId = getRouterParam(event, 'id')
        const userId = getHeader(event, 'x-user-id') as string
        const agentId = getHeader(event, 'x-agent-id') as string

        // Validate parameters
        if (!chatId) {
            return {
                success: false,
                message: 'Chat ID required',
                error: 'chatId parameter is mandatory'
            }
        }

        if (!userId) {
            return {
                success: false,
                message: 'User required',
                error: 'x-user-id header is mandatory'
            }
        }

        // Get chat messages
        const messages = await MessageService.getChatMessages(chatId, userId)
        
        if (messages.length === 0) {
            return {
                success: false,
                message: 'No messages in chat',
                error: 'Cannot generate title for an empty chat'
            }
        }

        // Find the first user message
        const firstUserMessage = messages.find(msg => msg.role === 'user')
        
        if (!firstUserMessage) {
            return {
                success: false,
                message: 'No user messages found',
                error: 'No user message found to generate a title'
            }
        }

        // Get Agent configuration
        const agent = await AgentService.getAgentByChat(chatId, userId)
        const model = AgentService.getModel(agent)

        // The AI model is created dynamically according to the configured Agent

        // Create AI model dynamically according to the Agent
        const aiModel = AgentService.createAIModelForAgent(agent, useRuntimeConfig()) as any
        const generatedTitle = await generateChatTitle(aiModel, firstUserMessage.content)

        // Update the chat title using the elegant composable
        const { fetch } = useServerApi(event)
        const updateResponse = await fetch<ApiResponse<any>>(`/api/chats/${chatId}`, {
            method: 'PATCH',
            body: {
                title: generatedTitle
            }
        })

        if (!updateResponse.success) {
            return {
                success: false,
                message: 'Error updating title',
                error: 'Could not update chat title'
            }
        }

        return {
            success: true,
            message: 'Title generated successfully',
            data: { title: generatedTitle }
        }

    } catch (error) {
        console.error('Error generating title:', error)
        
        return {
            success: false,
            message: 'Error generating title',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
