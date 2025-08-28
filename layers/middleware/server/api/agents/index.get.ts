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
            userId // To get available agents for a specific user
        } = query

        // If userId is specified, get only the available agents for that user
        if (userId && typeof userId === 'string') {
            const availableAgents = await getAvailableAgentsForUser(userId)
            return {
                success: true,
                message: 'Available agents retrieved successfully',
                data: availableAgents
            }
        }

        // Prepare query parameters
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

        // Get agents
        const result = await getAllAgents(queryParams)

        // If it's a search, return a simple format
        if (search) {
            return {
                success: true,
                message: 'Agents found',
                data: result.documents || result as unknown
            }
        }

        // Return with pagination
        return {
            success: true,
            message: 'Agents retrieved successfully',
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
        console.error('Error getting agents:', error)
        return {
            success: false,
            message: 'Error getting agents',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
