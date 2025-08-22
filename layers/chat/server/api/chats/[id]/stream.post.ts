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

        // Validaciones
        if (!chatId || !userId || !body?.content) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Parámetros requeridos: chatId, userId, content'
            })
        }

        // Validar que el contenido no esté vacío después del trim
        const trimmedContent = body.content.trim()
        if (!trimmedContent) {
            throw createError({
                statusCode: 400,
                statusMessage: 'El contenido no puede estar vacío'
            })
        }

        // Crear mensaje del usuario primero
        const userMessage = await createMessage({
            chatId,
            content: trimmedContent,
            role: MessageRole.USER,
            userId,
            metadata: body.metadata || {}
        })

        // Obtener configuración del Agent
        const agent = await AgentService.getAgentByChat(chatId, userId)
        const systemPrompt = AgentService.getSystemPrompt(agent)
        const model = AgentService.getModel(agent)
        const provider = AgentService.getProvider(agent)

        // Obtener historial de mensajes
        const chatMessages = await MessageService.getChatMessages(chatId, userId)
        const allMessages = [...chatMessages, userMessage]
        const formattedMessages = MessageService.formatMessagesForOpenAI(allMessages, systemPrompt)

        // Crear modelo AI dinámicamente según el Agent
        const openaiApiKey = useRuntimeConfig().openaiApiKey
        const aiModel = AgentService.createAIModelForAgent(agent, useRuntimeConfig())
        
        // Configurar streaming response
        setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-cache')
        setHeader(event, 'Connection', 'keep-alive')

        // Generar respuesta streaming
        const stream = await streamChatResponse(aiModel, formattedMessages)
        let fullResponse = ''

        // Crear un ReadableStream para el streaming
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        fullResponse += chunk
                        controller.enqueue(new TextEncoder().encode(chunk))
                    }
                    
                    // Guardar respuesta completa del AI solo si hay contenido
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
                        console.warn('No se recibió respuesta del AI, no se guardará mensaje vacío')
                    }
                    
                    controller.close()
                } catch (error) {
                    console.error('Error en streaming:', error)
                    controller.error(error)
                }
            }
        })

        return sendStream(event, readableStream)

    } catch (error) {
        console.error('Error en endpoint streaming:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error instanceof Error ? error.message : 'Error interno del servidor'
        })
    }
})
