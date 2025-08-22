// server/composables/useServerApi.ts
import type { ApiResponse } from '#layers/middleware/server/types/types'

/**
 * Composable para hacer llamadas internas entre endpoints del servidor
 * Similar a useApi pero para uso en el servidor
 */
export function useServerApi(event: any) {
  // Obtener headers del request original
  const userId = getHeader(event, 'x-user-id') as string
  const agentId = getHeader(event, 'x-agent-id') as string
  
  const fetch = async <T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      body?: Record<string, unknown> | null
      headers?: Record<string, string>
    } = {}
  ): Promise<T> => {
    const { method = 'GET', body, headers = {} } = options
    
    // Configurar headers propagando los del request original
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-agent-id': agentId,
      ...headers // Permitir override de headers específicos
    }
    
    // Filtrar headers undefined/null
    Object.keys(requestHeaders).forEach(key => {
      if (!requestHeaders[key]) {
        delete requestHeaders[key]
      }
    })
    
    try {
      // Usar la URL base del runtime config o detectar automáticamente
      const baseUrl = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000'
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
      
      const response = await $fetch<T>(fullUrl, {
        method,
        headers: requestHeaders,
        ...(body && { body })
      })
      
      return response
    } catch (error) {
      console.error(`[ServerApi] Error en llamada interna: ${method} ${url}`, error)
      throw error
    }
  }
  
  return { fetch }
}
