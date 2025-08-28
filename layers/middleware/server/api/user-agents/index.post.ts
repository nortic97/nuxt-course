import { createUserAgent } from '../../repository/userAgentRepository'
import type { ApiResponse, UserAgent } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<UserAgent>> => {
    try {
        const body = await readBody(event)

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Data required',
                error: 'No data sent in the request body'
            }
        }

        // Validate required fields
        if (!body.userId || !body.agentId) {
            return {
                success: false,
                message: 'Missing required data',
                error: 'userId and agentId are mandatory'
            }
        }

        // Prepare data
        const userAgentData = {
            userId: body.userId.trim(),
            agentId: body.agentId.trim(),
            paymentId: body.paymentId?.trim() || undefined,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
        }

        // Validate expiration date if provided
        if (userAgentData.expiresAt && userAgentData.expiresAt <= new Date()) {
            return {
                success: false,
                message: 'Invalid expiration date',
                error: 'The expiration date must be in the future'
            }
        }

        // Create the access
        const newUserAgent = await createUserAgent(userAgentData)

        return {
            success: true,
            message: 'Agent access created successfully',
            data: newUserAgent
        }
    } catch (error) {
        console.error('Error creating access:', error)

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('already has active access')) {
                return {
                    success: false,
                    message: 'Duplicate access',
                    error: error.message
                }
            }

            if (error.message.includes('does not exist or is not active')) {
                return {
                    success: false,
                    message: 'Invalid user or agent',
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
            message: 'Error creating agent access',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
