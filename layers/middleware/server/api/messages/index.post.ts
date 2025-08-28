import { createMessage } from '../../repository/messageRepository'
import type {ApiResponse, Message, MessageApiResponse} from '../../types/types'
import { MessageRole } from '../../types/types'
import { AgentService } from '#layers/chat/server/services/agent-service'
import { MessageService } from '#layers/chat/server/services/message-service'
import { generateChatResponse } from '#layers/chat/server/services/ai-service'

export default defineEventHandler(async (event): Promise<MessageApiResponse> => {
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
        if (!body.chatId || !body.content || !body.role) {
            return {
                success: false,
                message: 'Missing required data',
                error: 'chatId, content, and role are mandatory'
            }
        }

        // Validate role
        const validRoles = [MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM]
        if (!validRoles.includes(body.role)) {
            return {
                success: false,
                message: 'Invalid role',
                error: `Role must be one of: ${validRoles.join(', ')}`
            }
        }

        // Prepare message data
        const messageData = {
            chatId: body.chatId.trim(),
            content: body.content.trim(),
            role: body.role as MessageRole,
            userId: userId,
            metadata: body.metadata || {}
        }

        // Validate that the content is not empty
        if (!messageData.content) {
            return {
                success: false,
                message: 'Content required',
                error: 'Message content cannot be empty'
            }
        }

        // Create the user message
        const newMessage = await createMessage(messageData)

        // If it's a user message, generate an automatic AI response
        if (messageData.role === MessageRole.USER) {
            try {
                // Get Agent data
                const agent = await AgentService.getAgentByChat(messageData.chatId, userId)
                const systemPrompt = AgentService.getSystemPrompt(agent)
                const model = AgentService.getModel(agent)
                const provider = AgentService.getProvider(agent)

                // Get chat message history
                const chatMessages = await MessageService.getChatMessages(messageData.chatId, userId)
                
                // Include the newly created message in the history
                const allMessages = [...chatMessages, newMessage]
                
                // Format messages for the AI
                const formattedMessages = MessageService.formatMessagesForOpenAI(allMessages, systemPrompt)

                // Dynamically create AI model based on the Agent
                const openaiApiKey = useRuntimeConfig().openaiApiKey
                const aiModel = AgentService.createAIModelForAgent(agent, openaiApiKey)
                const aiResponse = await generateChatResponse(aiModel, formattedMessages)

                // Save AI response as a new message
                const aiMessageData = {
                    chatId: messageData.chatId,
                    content: aiResponse,
                    role: MessageRole.ASSISTANT,
                    userId: userId,
                    metadata: { 
                        model: model,
                        provider: provider,
                        generatedBy: provider
                    }
                }

                const aiMessage = await createMessage(aiMessageData)

                // Return both messages (user + AI)
                return {
                    success: true,
                    message: 'Message created and response generated successfully',
                    data: newMessage,
                    aiResponse: aiMessage
                }
            } catch (aiError) {
                console.error('Error generating AI response:', aiError)
                // Continue and return only the user's message if AI fails
            }
        }

        return {
            success: true,
            message: 'Message created successfully',
            data: newMessage
        }
    } catch (error) {
        console.error('Error creating message:', error)

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
            message: 'Error creating message',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
