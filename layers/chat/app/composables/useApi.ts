// composables/useApi.ts
import { useAuth } from '#layers/auth/app/composables/useAuth'

// Usar console en el cliente solo en desarrollo
const logger = {
  error: (message: string, ...args: any[]) => {
    if (process.dev) {
      console.error(`[CLIENT] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.dev) {
      console.warn(`[CLIENT] ${message}`, ...args);
    }
  },
  log: (message: string, ...args: any[]) => {
    if (process.dev) {
      console.log(`[CLIENT] ${message}`, ...args);
    }
  }
};

export default function useApi() {
    const { session, userId } = useAuth()
    
    // Obtener la cookie del agente seleccionado
    const selectedAgentCookie = useCookie('x-agent-id', {
        default: () => null
    })

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
        if (!session.value?.databaseUserId || !userId.value) {
            const error = 'No hay una sesión de usuario activa'
            logger.error(error, { session: !!session.value, userId: !!userId.value })
            throw new Error(error)
        }

        // Configurar headers básicos
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-user-id': userId.value.toString(),
            ...useRequestHeaders(['cookie']),
            ...headers
        }

        // Agregar x-agent-id si está disponible
        if (selectedAgentCookie.value) {
            requestHeaders['x-agent-id'] = selectedAgentCookie.value
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
            logger.error('Error en la petición API', error as Error, {
                url,
                method,
                hasBody: !!body
            })
            throw error
        }
    }

    return { fetch }
}
