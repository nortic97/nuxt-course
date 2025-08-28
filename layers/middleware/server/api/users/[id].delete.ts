import { deactivateUser } from '../../repository/userRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
    try {
        const userId = getRouterParam(event, 'id')

        if (!userId) {
            return {
                success: false,
                message: 'User ID required',
                error: 'User ID was not provided'
            }
        }

        // Deactivate the user (soft delete)
        await deactivateUser(userId)

        return {
            success: true,
            message: 'User deactivated successfully',
            data: null
        }
    } catch (error) {
        console.error('Error deactivating user:', error)

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
            message: 'Error deactivating the user',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
