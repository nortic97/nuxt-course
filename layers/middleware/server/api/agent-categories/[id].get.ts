import { getAgentCategoryById } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
  try {
    const categoryId = getRouterParam(event, 'id')

    if (!categoryId) {
      return {
        success: false,
        message: 'Category ID required',
        error: 'Category ID was not provided'
      }
    }

    // Get the category
    const category = await getAgentCategoryById(categoryId)

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
        error: 'A category with the provided ID does not exist'
      }
    }

    return {
      success: true,
      message: 'Category retrieved successfully',
      data: category
    }
  } catch (error) {
    console.error('Error getting category:', error)
    return {
      success: false,
      message: 'Error getting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
