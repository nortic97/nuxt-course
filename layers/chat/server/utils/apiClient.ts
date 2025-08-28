import { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

export async function apiClient<T = any>(
    event: H3Event,
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
        body?: any
        query?: Record<string, any>
        headers?: Record<string, string>
    } = {}
): Promise<T> {
    const config = useRuntimeConfig()
    const baseUrl = config.public.apiBaseUrl || 'http://localhost:3000/api'

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
    }

    // Pasar el token de autenticación si existe
    const authToken = getHeader(event, 'authorization')
    if (authToken) {
        headers['Authorization'] = authToken
    }

    // Pasar el userId si está disponible
    const userId = getHeader(event, 'x-user-id')
    if (userId) {
        headers['x-user-id'] = userId
    }

    const url = new URL(`${baseUrl}${endpoint}`)

    // Agregar query params
    if (options.query) {
        Object.entries(options.query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value))
            }
        })
    }

    try {
        const response = await $fetch.raw(url.toString(), {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        })

        return response._data as T
    } catch (error: any) {
        if (error.response) {
            const data = error.data || {}
            throw new ApiError(
                error.response.status,
                data.message || 'Error en la petición',
                data.details
            )
        }
        throw new Error(`Error de conexión: ${error.message}`)
    }
}
