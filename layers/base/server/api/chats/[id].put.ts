import { updateChat } from '../../repository/chatRepository'
import type { ApiResponse, Chat } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<Chat>> => {
    try {
        const chatId = getRouterParam(event, 'id')
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

        if (!chatId) {
            return {
                success: false,
                message: 'ID de chat requerido',
                error: 'No se proporcionó el ID del chat'
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

        // Preparar datos de actualización
        const updateData: Partial<Chat> = {}

        if (body.title !== undefined) {
            updateData.title = body.title?.trim() || 'Chat sin título'
        }
        if (body.projectId !== undefined) {
            updateData.projectId = body.projectId?.trim() || undefined
        }

        // Actualizar el chat
        const updatedChat = await updateChat(chatId, userId, updateData)

        if (!updatedChat) {
            return {
                success: false,
                message: 'Error al actualizar',
                error: 'No se pudo actualizar el chat'
            }
        }

        return {
            success: true,
            message: 'Chat actualizado exitosamente',
            data: updatedChat
        }
    } catch (error) {
        console.error('Error al actualizar chat:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('no encontrado o no tienes permisos')) {
                return {
                    success: false,
                    message: 'Chat no encontrado',
                    error: error.message
                }
            }
        }

        return {
            success: false,
            message: 'Error al actualizar el chat',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
