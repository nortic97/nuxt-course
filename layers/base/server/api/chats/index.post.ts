import { createChat } from '../../repository/chatRepository'
import type { ApiResponse, Chat } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<Chat>> => {
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
        if (!body.agentId) {
            return {
                success: false,
                message: 'Agent ID requerido',
                error: 'El campo agentId es obligatorio'
            }
        }

        // Preparar datos del chat
        const chatData = {
            title: body.title?.trim() || undefined,
            userId: userId,
            agentId: body.agentId.trim(),
            projectId: body.projectId?.trim() || undefined
        }

        // Crear el chat
        const newChat = await createChat(chatData)

        return {
            success: true,
            message: 'Chat creado exitosamente',
            data: newChat
        }
    } catch (error) {
        console.error('Error al crear chat:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('no tiene acceso a este agente')) {
                return {
                    success: false,
                    message: 'Acceso denegado',
                    error: error.message
                }
            }

            if (error.message.includes('no existe o no está activo')) {
                return {
                    success: false,
                    message: 'Usuario o agente inválido',
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
            message: 'Error al crear el chat',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
