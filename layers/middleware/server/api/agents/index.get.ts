import { getAllAgents, getAvailableAgentsForUser } from '../../repository/agentRepository'
import type { ApiResponse, PaginatedResponse, AgentWithCategory } from '../../types/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<AgentWithCategory> | ApiResponse<AgentWithCategory[]>> => {
    try {
        const query = getQuery(event)
        const {
            page = 1,
            limit = 10,
            orderBy = 'createdAt',
            orderDirection = 'desc',
            categoryId,
            isActive,
            search,
            minPrice,
            maxPrice,
            userId // Para obtener agentes disponibles para un usuario específico
        } = query

        // Si se especifica userId, obtener solo los agentes disponibles para ese usuario
        if (userId && typeof userId === 'string') {
            const availableAgents = await getAvailableAgentsForUser(userId)
            return {
                success: true,
                message: 'Agentes disponibles obtenidos exitosamente',
                data: availableAgents
            }
        }

        // Preparar parámetros de consulta
        const queryParams = {
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc',
            ...(categoryId && { categoryId: String(categoryId) }),
            ...(isActive !== undefined && { isActive: isActive === 'true' }),
            ...(search && { search: String(search) }),
            ...(minPrice !== undefined && { minPrice: Number(minPrice) }),
            ...(maxPrice !== undefined && { maxPrice: Number(maxPrice) })
        }

        // Obtener agentes
        const result = await getAllAgents(queryParams)

        // Si es una búsqueda, retornar formato simple
        if (search) {
            return {
                success: true,
                message: 'Agentes encontrados',
                data: result.documents || result as unknown
            }
        }

        // Retornar con paginación
        return {
            success: true,
            message: 'Agentes obtenidos exitosamente',
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
        console.error('Error al obtener agentes:', error)
        return {
            success: false,
            message: 'Error al obtener los agentes',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
