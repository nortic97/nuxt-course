import { createMessage } from '../../repository/messageRepository'
import type { ApiResponse, Message } from '../../types/firestore'
import { MessageRole } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<Message>> => {
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
            metadata: body.metadata || undefined
        }

        // Validar que el contenido no esté vacío
        if (!messageData.content) {
            return {
                success: false,
                message: 'Contenido requerido',
                error: 'El contenido del mensaje no puede estar vacío'
            }
        }

        // Crear el mensaje
        const newMessage = await createMessage(messageData)

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
