import type { GoogleUser, GitHubUser } from '../../shared/types/types'
import type { Timestamp } from 'firebase-admin/firestore'

// Interface for the API response
interface ApiResponse<T> {
    success: boolean
    message: string
    data?: T
    error?: string
}

// Interface for the database user (compatible with the base layer)
interface DatabaseUser {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
    provider?: 'google' | 'github' | null
    isActive: boolean
    createdAt: Timestamp | Date
    updatedAt: Timestamp | Date
    subscription?: {
        plan: 'free' | 'premium' | 'enterprise'
        expiresAt?: Timestamp | Date
    }
}

/**
 * Create or update a user using the base layer API
 * This function maintains separation of concerns:
 * - The auth layer handles authentication
 * - The base layer handles data persistence
 */
export async function createOrUpdateUserViaAPI(userData: GoogleUser | GitHubUser): Promise<DatabaseUser> {
    try {
        // Call the base layer API
        const response = await $fetch('/api/users', {
            method: 'POST',
            body: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                avatar: userData.avatar,
                provider: userData.provider
            }
        }) as ApiResponse<DatabaseUser>

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Error creating/updating user')
        }

        return response.data
    } catch (error) {
        console.error('Error in createOrUpdateUserViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Unknown error creating/updating user'
        )
    }
}

/**
 * Get a user by ID using the base layer API
 */
export async function getUserByIdViaAPI(userId: string): Promise<DatabaseUser | null> {
    try {
        const response = await $fetch(`/api/users/${userId}`, {
            method: 'GET'
        }) as ApiResponse<DatabaseUser>

        if (!response.success) {
            if (response.error?.includes('not found')) {
                return null
            }
            throw new Error(response.error || 'Error fetching user')
        }

        return response.data || null
    } catch (error) {
        console.error('Error in getUserByIdViaAPI:', error)
        // If it's a 404 error, return null
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
            return null
        }
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Unknown error fetching user'
        )
    }
}

/**
 * Check if a user exists and is active
 */
export async function isUserActiveViaAPI(userId: string): Promise<boolean> {
    try {
        const user = await getUserByIdViaAPI(userId)
        return user?.isActive === true
    } catch (error) {
        console.error('Error in isUserActiveViaAPI:', error)
        return false
    }
}