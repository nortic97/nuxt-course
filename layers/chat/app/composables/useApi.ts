// composables/useApi.ts
import { useAuth } from '#imports'

export default function useApi() {
    const { session, userId } = useAuth()

    const fetch = async <T>(
        url: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
            body?: Record<string, unknown> | FormData | null
            headers?: Record<string, string>
        } = {}
    ): Promise<T> => {
        const { method = 'GET', body, headers = {} } = options

        // Verificar si hay una sesión activa
        if (!session.value?.databaseUserId) {
            console.error('No hay una sesión de usuario activa')
            throw new Error('No hay una sesión de usuario activa')
        }

        // Configurar headers básicos
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-user-id': userId.value!.toString(),
            ...useRequestHeaders(['cookie']),
            ...headers
        }

        try {
            const response = await $fetch<T>(url, {
                method,
                headers: requestHeaders,
                ...(body && { body }),
                credentials: 'include' // Importante para incluir cookies
            })

            return response
        } catch (error) {
            console.error(`API Error [${method} ${url}]:`, error)

            // Si el error es de autenticación, redirigir al login
            const statusCode = (error as { statusCode?: number })?.statusCode
            if (statusCode === 401) {
                await navigateTo('/login')
            }

            throw error
        }
    }

    return { fetch }
}
