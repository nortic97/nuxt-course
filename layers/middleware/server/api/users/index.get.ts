import { getUserById, getAllUsers } from '../../repository/userRepository'
import type { ApiResponse, PaginatedResponse, User } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<User> | PaginatedResponse<User>> => {
    try {
        const query = getQuery(event)
        const uid = getHeader(event, 'x-user-uid') as string

        // Si hay UID en header, obtener usuario específico (para compatibilidad con auth existente)
        if (uid) {
            const user = await getUserById(uid)

            if (!user) {
                return {
                    success: false,
                    message: 'Usuario no encontrado',
                    error: 'No existe un usuario con el UID proporcionado'
                }
            }

            return {
                success: true,
                message: 'Usuario obtenido exitosamente',
                data: user
            }
        }

        // Si no hay UID, listar usuarios con paginación
        const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } = query

        const result = await getAllUsers({
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        return {
            success: true,
            message: 'Usuarios obtenidos exitosamente',
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
        console.error('Error al obtener usuario(s):', error)
        return {
            success: false,
            message: 'Error al obtener los usuarios',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
