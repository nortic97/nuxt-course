import { AgentService } from '../../../services/agent-service'
import { MessageService } from '../../../services/message-service'
import { streamChatResponse } from '../../../services/ai-service'
import { createMessage } from '#layers/middleware/server/repository/messageRepository'
import { MessageRole } from '#layers/middleware/server/types/types'

export default defineEventHandler(async (event) => {
    try {
        const chatId = getRouterParam(event, 'id')
        const userId = getHeader(event, 'x-user-id') as string
        const body = await readBody(event)

        // Validations
        if (!chatId || !userId || !body?.content) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Required parameters: chatId, userId, content'
            })
        }

        // Validate that the content is not empty after trimming
        const trimmedContent = body.content.trim()
        if (!trimmedContent) {
            throw createError({
                statusCode: 400,
                statusMessage: 'The content cannot be empty'
            })
        }

        // Create user message first
        const userMessage = await createMessage({
            chatId,
            content: trimmedContent,
            role: MessageRole.USER,
            userId,
            metadata: body.metadata || {}
        })

        // Get Agent configuration
        const agent = await AgentService.getAgentByChat(chatId, userId)
        const systemPrompt = AgentService.getSystemPrompt(agent)
        const model = AgentService.getModel(agent)
        const provider = AgentService.getProvider(agent)

        // Get message history
        const chatMessages = await MessageService.getChatMessages(chatId, userId)
        const allMessages = [...chatMessages, userMessage]
        const formattedMessages = MessageService.formatMessagesForOpenAI(allMessages, systemPrompt)

        // Dynamically create AI model based on the Agent
        const openaiApiKey = useRuntimeConfig().openaiApiKey
        const aiModel = AgentService.createAIModelForAgent(agent, useRuntimeConfig())
        
        // Configure streaming response
        setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-cache')
        setHeader(event, 'Connection', 'keep-alive')

        // Generate streaming response
        const stream = await streamChatResponse(aiModel, formattedMessages)
        let fullResponse = ''

        // Create a ReadableStream for streaming
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        fullResponse += chunk
                        controller.enqueue(new TextEncoder().encode(chunk))
                    }
                    
                    // Save the complete AI response only if there is content
                    if (fullResponse.trim()) {
                        await createMessage({
                            chatId,
                            content: fullResponse.trim(),
                            role: MessageRole.ASSISTANT,
                            userId,
                            metadata: {
                                model,
                                generatedBy: 'openai',
                                streaming: true
                            }
                        })
                    } else {
                        console.warn('No AI response received, empty message will not be saved')
                    }
                    
                    controller.close()
                } catch (error) {
                    console.error('Error in streaming:', error)
                    controller.error(error)
                }
            }
        })

        return sendStream(event, readableStream)

    } catch (error) {
        console.error('Error in streaming endpoint:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error instanceof Error ? error.message : 'Internal server error'
        })
    }
})
