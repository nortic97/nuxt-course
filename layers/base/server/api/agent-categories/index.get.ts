import { getAllAgentCategories, searchAgentCategories } from '../../repository/agentCategoryRepository'
import type { ApiResponse, PaginatedResponse, AgentCategory } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<PaginatedResponse<AgentCategory> | ApiResponse<AgentCategory[]>> => {
    try {
        const query = getQuery(event)
        const {
            page = 1,
            limit = 10,
            orderBy = 'name',
            orderDirection = 'asc',
            search
        } = query

        // Si hay término de búsqueda, usar búsqueda
        if (search && typeof search === 'string') {
            const categories = await searchAgentCategories(search)
            return {
                success: true,
                message: 'Categorías encontradas',
                data: categories
            }
        }

        // Obtener categorías con paginación
        const result = await getAllAgentCategories({
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        return {
            success: true,
            message: 'Categorías obtenidas exitosamente',
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
        console.error('Error al obtener categorías:', error)
        return {
            success: false,
            message: 'Error al obtener las categorías',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
