import { deactivateChat } from '../../repository/chatRepository'
import type { ApiResponse } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
    try {
        const chatId = getRouterParam(event, 'id')
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

        // Desactivar el chat (soft delete)
        await deactivateChat(chatId, userId)

        return {
            success: true,
            message: 'Chat eliminado exitosamente',
            data: null
        }
    } catch (error) {
        console.error('Error al eliminar chat:', error)

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
            message: 'Error al eliminar el chat',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
