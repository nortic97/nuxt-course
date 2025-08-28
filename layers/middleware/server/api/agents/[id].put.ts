import { updateAgent } from '../../repository/agentRepository'
import type { ApiResponse, AgentWithCategory, UpdateAgentRequest } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentWithCategory>> => {
  try {
    const agentId = getRouterParam(event, 'id')
    const body = await readBody(event) as UpdateAgentRequest

    if (!agentId) {
      return {
        success: false,
        message: 'Agent ID required',
        error: 'Agent ID was not provided'
      }
    }

    // Validate that the body was sent
    if (!body) {
      return {
        success: false,
        message: 'Required data missing',
        error: 'No data sent in the request body'
      }
    }

    // Validate price if it is being updated
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return {
          success: false,
          message: 'Invalid price',
          error: 'Price must be a number greater than or equal to 0'
        }
      }
    }

    // Validate name if it is being updated
    if (body.name !== undefined && (!body.name || !body.name.trim())) {
      return {
        success: false,
        message: 'Invalid name',
        error: 'Name cannot be empty'
      }
    }

    // Sanitize and validate data
    const updateData: UpdateAgentRequest = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || undefined
    }
    if (body.price !== undefined) {
      updateData.price = Number(body.price)
    }
    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId.trim()
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }
    if (body.model !== undefined) {
      updateData.model = body.model?.trim() || undefined
    }
    if (body.capabilities !== undefined) {
      updateData.capabilities = Array.isArray(body.capabilities)
        ? body.capabilities.filter(cap => typeof cap === 'string' && cap.trim())
        : undefined
    }

    // Update the agent
    const updatedAgent = await updateAgent(agentId, updateData)

    if (!updatedAgent) {
      return {
        success: false,
        message: 'Error during update',
        error: 'Could not update the agent'
      }
    }

    return {
      success: true,
      message: 'Agent updated successfully',
      data: updatedAgent
    }
  } catch (error) {
    console.error('Error updating agent:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Agent not found')) {
        return {
          success: false,
          message: 'Agent not found',
          error: error.message
        }
      }

      if (error.message.includes('An agent with this name already exists')) {
        return {
          success: false,
          message: 'Duplicate agent',
          error: error.message
        }
      }

      if (error.message.includes('The specified category does not exist')) {
        return {
          success: false,
          message: 'Invalid category',
          error: error.message
        }
      }

      if (error.message.includes('price cannot be negative')) {
        return {
          success: false,
          message: 'Invalid price',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error updating agent',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
