import { getChatsByUser, getChatsByProject, searchChatsByTitle } from '../../repository/chatRepository'
import type { PaginatedResponse, Chat } from '../../types/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<Chat>> => {
    try {
        const query = getQuery(event)
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
                    limit: 10,
                    total: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        }

        const {
            page = 1,
            limit = 10,
            orderBy = 'lastMessageAt',
            orderDirection = 'desc',
            projectId,
            search
        } = query

        const paginationParams = {
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        }

        let result

        // Si hay búsqueda por título
        if (search && typeof search === 'string') {
            result = await searchChatsByTitle(userId, search, paginationParams)
        }
        // Si hay filtro por proyecto
        else if (projectId && typeof projectId === 'string') {
            result = await getChatsByProject(projectId, userId, paginationParams)
        }
        // Obtener todos los chats del usuario
        else {
            result = await getChatsByUser(userId, paginationParams)
        }

        return {
            success: true,
            message: 'Chats obtenidos exitosamente',
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
        console.error('Error al obtener chats:', error)
        return {
            success: false,
            message: 'Error al obtener los chats',
            error: error instanceof Error ? error.message : 'Error desconocido',
            data: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                hasNext: false,
                hasPrev: false
            }
        }
    }
})
