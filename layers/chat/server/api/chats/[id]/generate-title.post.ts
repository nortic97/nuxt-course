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

        // Validar parámetros
        if (!chatId) {
            return {
                success: false,
                message: 'ID de chat requerido',
                error: 'Parámetro chatId es obligatorio'
            }
        }

        if (!userId) {
            return {
                success: false,
                message: 'Usuario requerido',
                error: 'Header x-user-id es obligatorio'
            }
        }

        // Obtener mensajes del chat
        const messages = await MessageService.getChatMessages(chatId, userId)
        
        if (messages.length === 0) {
            return {
                success: false,
                message: 'No hay mensajes en el chat',
                error: 'No se puede generar título para un chat vacío'
            }
        }

        // Buscar el primer mensaje del usuario
        const firstUserMessage = messages.find(msg => msg.role === 'user')
        
        if (!firstUserMessage) {
            return {
                success: false,
                message: 'No hay mensajes de usuario',
                error: 'No se encontró mensaje de usuario para generar título'
            }
        }

        // Obtener configuración del Agent
        const agent = await AgentService.getAgentByChat(chatId, userId)
        const model = AgentService.getModel(agent)

        // El modelo AI se crea dinámicamente según el Agent configurado

        // Crear modelo AI dinámicamente según el Agent
        const aiModel = AgentService.createAIModelForAgent(agent, useRuntimeConfig()) as any
        const generatedTitle = await generateChatTitle(aiModel, firstUserMessage.content)

        // Actualizar el título del chat usando el composable elegante
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
                message: 'Error actualizando título',
                error: 'No se pudo actualizar el título del chat'
            }
        }

        return {
            success: true,
            message: 'Título generado exitosamente',
            data: { title: generatedTitle }
        }

    } catch (error) {
        console.error('Error generando título:', error)
        
        return {
            success: false,
            message: 'Error al generar título',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
