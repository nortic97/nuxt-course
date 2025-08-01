import type { Timestamp } from 'firebase-admin/firestore'

// Interfaz para la respuesta de la API
interface ApiResponse<T> {
    success: boolean
    message: string
    data?: T
    error?: string
}

// Interfaz para el agente con categoría (compatible con la capa base)
interface AgentWithCategory {
    id: string
    name: string
    description?: string
    price: number
    isActive: boolean
    categoryId: string
    createdAt: Timestamp | Date
    updatedAt: Timestamp | Date
    metadata?: {
        [key: string]: unknown
    }
    category: {
        id: string
        name: string
        description?: string
        isActive: boolean
        createdAt: Timestamp | Date
        updatedAt: Timestamp | Date
    }
}

/**
 * Obtener agentes disponibles para un usuario usando la API de la capa base
 */
export async function getAvailableAgentsForUserViaAPI(userId: string): Promise<AgentWithCategory[]> {
    try {
        const response = await $fetch('/api/agents', {
            method: 'GET',
            query: {
                userId: userId
            }
        }) as ApiResponse<AgentWithCategory[]>

        if (!response.success) {
            throw new Error(response.error || 'Error al obtener agentes disponibles')
        }

        return response.data || []
    } catch (error) {
        console.error('Error en getAvailableAgentsForUserViaAPI:', error)
        throw new Error(
            error instanceof Error
                ? error.message
                : 'Error desconocido al obtener agentes disponibles'
        )
    }
}

/**
 * Obtener el primer agente disponible para un usuario (útil para crear chats por defecto)
 */
export async function getFirstAvailableAgentViaAPI(userId: string): Promise<AgentWithCategory | undefined | null> {
    try {
        const agents = await getAvailableAgentsForUserViaAPI(userId)
        return agents.length > 0 ? agents[0] : undefined
    } catch (error) {
        console.error('Error en getFirstAvailableAgentViaAPI:', error)
        return null
    }
}
