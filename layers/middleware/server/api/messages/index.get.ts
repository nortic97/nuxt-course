import { getMessagesByChat, getRecentMessagesByChat, searchMessagesByContent } from '../../repository/messageRepository'
import type { PaginatedResponse, Message } from '../../types/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<Message | (Message & { chatTitle?: string })>> => {
    const query = getQuery(event)

    try {
        const userId = getHeader(event, 'x-user-id') as string

        // Validar que se proporcione el userId
        if (!userId) {
            return {
                success: false,
                message: 'Usuario requerido',
                error: 'Header x-user-id es obligatorio',
                data: [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        const {
            chatId,
            page = 1,
            limit = 50,
            orderBy = 'createdAt',
            orderDirection = 'asc',
            recent,
            search
        } = query

        // Si hay búsqueda por contenido
        if (search && typeof search === 'string') {
            const result = await searchMessagesByContent(userId, search, {
                page: Number(page),
                limit: Number(limit)
            })

            return {
                success: true,
                message: 'Mensajes encontrados exitosamente',
                data: result.documents,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                    hasNext: result.hasNext,
                    hasPrev: result.hasPrev
                }
            }
        }

        // Validar que se proporcione chatId para otras operaciones
        if (!chatId || typeof chatId !== 'string') {
            return {
                success: false,
                message: 'Chat ID requerido',
                error: 'El parámetro chatId es obligatorio',
                data: [],
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        // Si se solicitan mensajes recientes (sin paginación)
        if (recent === 'true') {
            const messages = await getRecentMessagesByChat(chatId, userId, Number(limit) || 20)

            return {
                success: true,
                message: 'Mensajes recientes obtenidos exitosamente',
                data: messages,
                pagination: {
                    page: 1,
                    limit: messages.length,
                    total: messages.length,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        // Obtener mensajes con paginación
        const result = await getMessagesByChat(chatId, userId, {
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        return {
            success: true,
            message: 'Mensajes obtenidos exitosamente',
            data: result.documents,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev
            }
        }
    } catch (error) {
        console.error('Error al obtener mensajes:', error)

        // Manejar errores específicos
        let errorMessage = 'Error al obtener los mensajes'
        if (error instanceof Error) {
            if (error.message.includes('no encontrado o no tienes permisos')) {
                errorMessage = 'Chat no encontrado o sin permisos'
            }
        }

        return {
            success: false,
            message: errorMessage,
            error: error instanceof Error ? error.message : 'Error desconocido',
            data: [],
            pagination: {
                page: Number(query.page) || 1,
                limit: Number(query.limit) || 50,
                total: 0,
                hasNext: false,
                hasPrev: false
            }
        }
    }
})
