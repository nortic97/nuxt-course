import { createOrUpdateUser } from '../../repository/userRepository'
import type { ApiResponse, User } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
    try {
        const body = await readBody(event)

        // Validate that the body was sent
        if (!body) {
            return {
                success: false,
                message: 'Data required',
                error: 'No data was sent in the request body'
            }
        }

        // Validate email
        if (!body.email || typeof body.email !== 'string') {
            return {
                success: false,
                message: 'Email required',
                error: 'The email field is mandatory and must be a valid string'
            }
        }

        // Create or update user
        const user = await createOrUpdateUser({
            id: body.id,
            email: body.email.trim().toLowerCase(),
            name: body.name || null,
            avatar: body.avatar || null,
            provider: body.provider || null
        })

        return {
            success: true,
            message: user.createdAt === user.updatedAt ? 'User created successfully' : 'User updated successfully',
            data: user
        }
    } catch (error) {
        console.error('Error creating/updating user:', error)

        // Handle specific errors
        if (error instanceof Error) {
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
            message: 'Error processing user',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
