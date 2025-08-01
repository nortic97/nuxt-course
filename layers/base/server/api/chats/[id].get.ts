import { getChatWithMessages } from '../../repository/chatRepository'
import type { ApiResponse, ChatWithMessages } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<ChatWithMessages>> => {
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

        // Obtener el chat con mensajes
        const chatWithMessages = await getChatWithMessages(chatId, userId)

        if (!chatWithMessages) {
            return {
                success: false,
                message: 'Chat no encontrado',
                error: 'No existe un chat con el ID proporcionado o no tienes permisos para verlo'
            }
        }

        return {
            success: true,
            message: 'Chat obtenido exitosamente',
            data: chatWithMessages
        }
    } catch (error) {
        console.error('Error al obtener chat:', error)
        return {
            success: false,
            message: 'Error al obtener el chat',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
