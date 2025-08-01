import type { GoogleUser, GitHubUser } from '../../shared/types/types'
import type { Timestamp } from 'firebase-admin/firestore'

// Interfaz para la respuesta de la API
interface ApiResponse<T> {
    success: boolean
    message: string
    data?: T
    error?: string
}

// Interfaz para el usuario de la base de datos (compatible con la capa base)
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
 * Crear o actualizar usuario usando la API de la capa base
 * Esta función mantiene la separación de responsabilidades:
 * - La capa auth maneja la autenticación
 * - La capa base maneja la persistencia de datos
 */
export async function createOrUpdateUserViaAPI(userData: GoogleUser | GitHubUser): Promise<DatabaseUser> {
    try {
        // Llamar a la API de la capa base
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
            throw new Error(response.error || 'Error al crear/actualizar usuario')
        }

        return response.data
    } catch (error) {
        console.error('Error en createOrUpdateUserViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al crear/actualizar usuario'
        )
    }
}

/**
 * Obtener usuario por ID usando la API de la capa base
 */
export async function getUserByIdViaAPI(userId: string): Promise<DatabaseUser | null> {
    try {
        const response = await $fetch(`/api/users/${userId}`, {
            method: 'GET'
        }) as ApiResponse<DatabaseUser>

        if (!response.success) {
            if (response.error?.includes('no encontrado')) {
                return null
            }
            throw new Error(response.error || 'Error al obtener usuario')
        }

        return response.data || null
    } catch (error) {
        console.error('Error en getUserByIdViaAPI:', error)
        // Si es un error 404, retornar null
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
            return null
        }
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al obtener usuario'
        )
    }
}

/**
 * Verificar si un usuario existe y está activo
 */
export async function isUserActiveViaAPI(userId: string): Promise<boolean> {
    try {
        const user = await getUserByIdViaAPI(userId)
        return user?.isActive === true
    } catch (error) {
        console.error('Error en isUserActiveViaAPI:', error)
        return false
    }
}