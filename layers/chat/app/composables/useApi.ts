// composables/useApi.ts
import { useAuth } from '#layers/auth/app/composables/useAuth'

// Use console on the client only in development
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
    
    // Get the selected agent cookie
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
        
        // Check if there is an active session
        if (!session.value?.databaseUserId || !userId.value) {
            const error = 'There is no active user session'
            logger.error(error, { session: !!session.value, userId: !!userId.value })
            throw new Error(error)
        }

        // Configure basic headers
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-user-id': userId.value.toString(),
            ...useRequestHeaders(['cookie']),
            ...headers
        }

        // Add x-agent-id if available
        if (selectedAgentCookie.value) {
            requestHeaders['x-agent-id'] = selectedAgentCookie.value
        }

        try {
            const response = await $fetch<T>(url, {
                method,
                headers: requestHeaders,
                ...(body && { body }),
                credentials: 'include' // Important to include cookies
            })

            return response
        } catch (error) {
            logger.error('Error in API request', error as Error, {
                url,
                method,
                hasBody: !!body
            })
            throw error
        }
    }

    return { fetch }
}
