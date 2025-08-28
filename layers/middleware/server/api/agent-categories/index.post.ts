import { createAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory, CreateAgentCategoryRequest } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
    try {
        const body = await readBody(event) as CreateAgentCategoryRequest

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Data required',
                error: 'No data sent in the request body'
            }
        }

        // Validate required fields
        if (!body.name || body.name.trim() === '') {
            return {
                success: false,
                message: 'Name is required',
                error: 'The name field is mandatory'
            }
        }

        // Sanitize and validate data
        const categoryData: CreateAgentCategoryRequest = {
            name: body.name.trim(),
            description: body.description?.trim() || undefined
        }

        // Create the category
        const newCategory = await createAgentCategory(categoryData)

        return {
            success: true,
            message: 'Category created successfully',
            data: newCategory
        }
    } catch (error) {
        console.error('Error creating category:', error)

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('A category with this name already exists')) {
                return {
                    success: false,
                    message: 'Duplicate category',
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
        }

        return {
            success: false,
            message: 'Error creating category',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
