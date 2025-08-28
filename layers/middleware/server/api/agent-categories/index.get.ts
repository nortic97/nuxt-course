import { getAllAgentCategories, searchAgentCategories } from '../../repository/agentCategoryRepository'
import type { ApiResponse, PaginatedResponse, AgentCategory } from '../../types/types'

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

        // If there is a search term, use search
        if (search && typeof search === 'string') {
            const categories = await searchAgentCategories(search)
            return {
                success: true,
                message: 'Categories found',
                data: categories
            }
        }

        // Get categories with pagination
        const result = await getAllAgentCategories({
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        return {
            success: true,
            message: 'Categories retrieved successfully',
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
        console.error('Error getting categories:', error)
        return {
            success: false,
            message: 'Error getting categories',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
