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

        // Validar que se proporcione el userId
        if (!userId) {
            return {
                success: false,
                message: 'Usuario requerido',
                error: 'Header x-user-id es obligatorio'
            }
        }

        // Validar que se envió el body
        if (!body) {
            return {
                success: false,
                message: 'Datos requeridos',
                error: 'No se enviaron datos en el cuerpo de la petición'
            }
        }

        // Validar campos requeridos
        if (!body.chatId || !body.content || !body.role) {
            return {
                success: false,
                message: 'Datos requeridos faltantes',
                error: 'chatId, content y role son obligatorios'
            }
        }

        // Validar rol
        const validRoles = [MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM]
        if (!validRoles.includes(body.role)) {
            return {
                success: false,
                message: 'Rol inválido',
                error: `El rol debe ser uno de: ${validRoles.join(', ')}`
            }
        }

        // Preparar datos del mensaje
        const messageData = {
            chatId: body.chatId.trim(),
            content: body.content.trim(),
            role: body.role as MessageRole,
            userId: userId,
            metadata: body.metadata || {}
        }

        // Validar que el contenido no esté vacío
        if (!messageData.content) {
            return {
                success: false,
                message: 'Contenido requerido',
                error: 'El contenido del mensaje no puede estar vacío'
            }
        }

        // Crear el mensaje del usuario
        const newMessage = await createMessage(messageData)

        // Si es un mensaje de usuario, generar respuesta automática de OpenAI
        if (messageData.role === MessageRole.USER) {
            try {
                // Obtener datos del Agent
                const agent = await AgentService.getAgentByChat(messageData.chatId, userId)
                const systemPrompt = AgentService.getSystemPrompt(agent)
                const model = AgentService.getModel(agent)
                const provider = AgentService.getProvider(agent)

                // Obtener historial de mensajes del chat
                const chatMessages = await MessageService.getChatMessages(messageData.chatId, userId)
                
                // Incluir el mensaje recién creado en el historial
                const allMessages = [...chatMessages, newMessage]
                
                // Formatear mensajes para AI
                const formattedMessages = MessageService.formatMessagesForOpenAI(allMessages, systemPrompt)

                // Crear modelo AI dinámicamente según el Agent
                const openaiApiKey = useRuntimeConfig().openaiApiKey
                const aiModel = AgentService.createAIModelForAgent(agent, openaiApiKey)
                const aiResponse = await generateChatResponse(aiModel, formattedMessages)

                // Guardar respuesta del AI como nuevo mensaje
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

                // Retornar ambos mensajes (usuario + AI)
                return {
                    success: true,
                    message: 'Mensaje creado y respuesta generada exitosamente',
                    data: newMessage,
                    aiResponse: aiMessage
                }
            } catch (aiError) {
                console.error('Error generando respuesta de OpenAI:', aiError)
                // Continuar y retornar solo el mensaje del usuario si falla OpenAI
            }
        }

        return {
            success: true,
            message: 'Mensaje creado exitosamente',
            data: newMessage
        }
    } catch (error) {
        console.error('Error al crear mensaje:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('no encontrado o no tienes permisos')) {
                return {
                    success: false,
                    message: 'Chat no encontrado',
                    error: error.message
                }
            }

            if (error.message.includes('Campos requeridos faltantes')) {
                return {
                    success: false,
                    message: 'Datos incompletos',
                    error: error.message
                }
            }
        }

        return {
            success: false,
            message: 'Error al crear el mensaje',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
