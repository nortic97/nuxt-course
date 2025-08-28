import { deleteAgent } from '../../repository/agentRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const agentId = getRouterParam(event, 'id')

    if (!agentId) {
      return {
        success: false,
        message: 'Agent ID required',
        error: 'Agent ID not provided'
      }
    }

    // Delete the agent (soft delete)
    await deleteAgent(agentId)

    return {
      success: true,
      message: 'Agent deleted successfully',
      data: null
    }
  } catch (error) {
    console.error('Error deleting agent:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Agent not found')) {
        return {
          success: false,
          message: 'Agent not found',
          error: error.message
        }
      }

      if (error.message.includes('has active chats')) {
        return {
          success: false,
          message: 'Cannot delete',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error deleting agent',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
