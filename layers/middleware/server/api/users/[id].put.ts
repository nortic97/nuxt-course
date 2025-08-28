import { updateUser } from '../../repository/userRepository'
import type { ApiResponse, User } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
    try {
        const userId = getRouterParam(event, 'id')
        const body = await readBody(event)

        if (!userId) {
            return {
                success: false,
                message: 'User ID required',
                error: 'User ID was not provided'
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

        // Prepare update data (exclude immutable fields)
        const updateData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'email'>> = {}

        if (body.name !== undefined) {
            updateData.name = body.name?.trim() || null
        }
        if (body.avatar !== undefined) {
            updateData.avatar = body.avatar?.trim() || undefined
        }
        if (body.provider !== undefined) {
            updateData.provider = body.provider
        }
        if (body.isActive !== undefined) {
            updateData.isActive = Boolean(body.isActive)
        }
        if (body.subscription !== undefined) {
            updateData.subscription = body.subscription
        }

        // Update the user
        const updatedUser = await updateUser(userId, updateData)

        if (!updatedUser) {
            return {
                success: false,
                message: 'Error during update',
                error: 'Could not update the user'
            }
        }

        return {
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        }
    } catch (error) {
        console.error('Error updating user:', error)

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('User not found')) {
                return {
                    success: false,
                    message: 'User not found',
                    error: error.message
                }
            }
        }

        return {
            success: false,
            message: 'Error updating user',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
