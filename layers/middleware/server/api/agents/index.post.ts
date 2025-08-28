import { createAgent } from '../../repository/agentRepository'
import type { ApiResponse, AgentWithCategory, CreateAgentRequest } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentWithCategory>> => {
    try {
        const body = await readBody(event) as CreateAgentRequest

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Required data missing',
                error: 'No data sent in the request body'
            }
        }

        // Validate required fields
        const requiredFields = ['name', 'price', 'categoryId']
        const missingFields = requiredFields.filter(field =>
            !body[field as keyof CreateAgentRequest] && body[field as keyof CreateAgentRequest] !== 0
        )

        if (missingFields.length > 0) {
            return {
                success: false,
                message: 'Missing required fields',
                error: `The following fields are required: ${missingFields.join(', ')}`
            }
        }

        // Validate data types
        if (typeof body.price !== 'number' || body.price < 0) {
            return {
                success: false,
                message: 'Invalid price',
                error: 'Price must be a number greater than or equal to 0'
            }
        }

        if (!body.name.trim()) {
            return {
                success: false,
                message: 'Invalid name',
                error: 'Name cannot be empty'
            }
        }

        // Sanitize and validate data
        const agentData: CreateAgentRequest = {
            name: body.name.trim(),
            description: body.description?.trim() || undefined,
            price: Number(body.price),
            categoryId: body.categoryId.trim(),
            model: body.model?.trim() || undefined,
            capabilities: Array.isArray(body.capabilities)
                ? body.capabilities.filter(cap => typeof cap === 'string' && cap.trim())
                : undefined
        }

        // Create the agent
        const newAgent = await createAgent(agentData)

        return {
            success: true,
            message: 'Agent created successfully',
            data: newAgent
        }
    } catch (error) {
        console.error('Error creating agent:', error)

        // Handle specific errors
        if (error instanceof Error) {
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

            if (error.message.includes('Missing required fields')) {
                return {
                    success: false,
                    message: 'Incomplete data',
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
            message: 'Error creating agent',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
