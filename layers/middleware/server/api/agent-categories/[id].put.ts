import { updateAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory, UpdateAgentCategoryRequest } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
  try {
    const categoryId = getRouterParam(event, 'id')
    const body = await readBody(event) as UpdateAgentCategoryRequest

    if (!categoryId) {
      return {
        success: false,
        message: 'Category ID required',
        error: 'Category ID was not provided'
      }
    }

    // Validate that the body was sent
    if (!body) {
      return {
        success: false,
        message: 'Data required',
        error: 'No data was sent in the request body'
      }
    }

    // Validate name if it is being updated
    if (body.name !== undefined && (!body.name || !body.name.trim())) {
      return {
        success: false,
        message: 'Invalid name',
        error: 'The name cannot be empty'
      }
    }

    // Sanitize and validate data
    const updateData: UpdateAgentCategoryRequest = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || undefined
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    // Update the category
    const updatedCategory = await updateAgentCategory(categoryId, updateData)

    if (!updatedCategory) {
      return {
        success: false,
        message: 'Error updating',
        error: 'Could not update the category'
      }
    }

    return {
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    }
  } catch (error) {
    console.error('Error updating category:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Category not found')) {
        return {
          success: false,
          message: 'Category not found',
          error: error.message
        }
      }

      if (error.message.includes('A category with this name already exists')) {
        return {
          success: false,
          message: 'Duplicate category',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error updating category',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
