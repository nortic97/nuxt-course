import { deleteAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const categoryId = getRouterParam(event, 'id')

    if (!categoryId) {
      return {
        success: false,
        message: 'Category ID required',
        error: 'Category ID was not provided'
      }
    }

    // Delete the category (soft delete)
    await deleteAgentCategory(categoryId)

    return {
      success: true,
      message: 'Category deleted successfully',
      data: null
    }
  } catch (error) {
    console.error('Error deleting category:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Category not found')) {
        return {
          success: false,
          message: 'Category not found',
          error: error.message
        }
      }

      if (error.message.includes('has active agents')) {
        return {
          success: false,
          message: 'Cannot delete',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error deleting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
