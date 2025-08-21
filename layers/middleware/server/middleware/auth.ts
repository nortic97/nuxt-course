import type { H3Event } from 'h3'
import { createError, getRequestHeader, defineEventHandler, getCookie } from 'h3'
import { ofetch } from 'ofetch'
import { logger } from '../utils/logger'

// Middleware para verificar autenticación y usuario
// Verifica el header x-user-id y lo agrega al contexto del evento

// Rutas que NO requieren autenticación
const publicRoutes = [
  '/api/auth',
  '/auth',
  '/_nuxt',
  '/__nuxt',
  '/_ipx',
  '/favicon.ico',
  '/api/users' // Permitir todas las rutas de usuarios (incluye /api/users/[id])
]

// Rutas que SI requieren autenticación
const protectedRoutes = [
  '/api/chat',
  '/api/chats',
  '/api/agent',
  '/api/agents',
  // '/api/user', // Comentamos esta para permitir el registro
  // '/api/users', // Comentamos esta para permitir la creación de usuarios
  '/chat',
  '/chats',
  '/profile'
]

export default defineEventHandler(async (event: H3Event) => {
  const url = event.node.req.url || ''

  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(route => {
    // Si la URL comienza con la ruta pública o es una ruta de usuario con ID
    return url.startsWith(route) ||
      /^\/api\/users\/[a-f0-9-]+$/.test(url.split('?')[0])
  })

  // Si es una ruta pública, continuar sin verificar autenticación
  if (isPublicRoute) {
    // Si es una ruta de usuario con ID, agregar el ID al contexto
    const userIdMatch = url.match(/^\/api\/users\/([a-f0-9-]+)/)
    if (userIdMatch && userIdMatch[1]) {
      event.context.userId = userIdMatch[1]
      logger.debug('Acceso a ruta pública con ID de usuario', { 
        url, 
        userId: userIdMatch[1] 
      })
    }
    return
  }

  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some(route =>
    url.startsWith(route)
  )

  // Si no es una ruta protegida, continuar sin verificar autenticación
  if (!isProtectedRoute) {
    return
  }

  logger.debug('Verificando autenticación para ruta protegida', { url })

  // Obtener el ID de usuario del header o de la cookie
  let userId = normalizeUserId(getRequestHeader(event, 'x-user-id'))
  const authSource = userId ? 'header' : null

  // Si no está en el header, buscar en las cookies
  if (!userId) {

    userId = normalizeUserId(getCookie(event, 'x-user-id'))

    if (userId) {
      logger.debug('x-user-id obtenido de la cookie', { userId })
    }
  } else {
    logger.debug('x-user-id obtenido del header', { userId })
  }

  // Si no hay userId, devolver error de no autorizado
  if (!userId) {
    logger.warn('Intento de acceso no autorizado', { 
      url, 
      method: event.node.req.method,
      ip: event.node.req.socket.remoteAddress
    })
    
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado: Se requiere autenticación',
    })
  }

  // Si llegamos aquí, el usuario está autenticado
  event.context.userId = userId
  logger.info('Usuario autenticado', { userId })

  // Verificar si el usuario existe
  try {
    // Obtener la URL base del host
    const host = event.node.req.headers.host || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    const user = await ofetch(`${baseUrl}/api/users/${userId}`, {
      headers: {
        'x-user-id': userId as string,
        'x-forwarded-proto': protocol,
        'host': host
      }
    })

    if (!user) {
      const error = new Error('Usuario no encontrado')
      logger.error('Error al verificar el usuario', error, { userId })
      
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuario no encontrado'
      })
    }

    // Agregar la información del usuario al contexto
    event.context.user = user.data
    logger.debug('Usuario verificado', { 
      userId: user.data.id, 
      email: user.data.email,
      ip: event.node.req.socket.remoteAddress
    })

  } catch (error) {
    logger.error('Error al verificar el usuario', error as Error, { userId })
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Error interno del servidor al verificar el usuario',
    })
  }
})

/**
 * Normaliza el userId para asegurar que sea un string válido
 * @param userId - El userId que puede ser string, objeto, o undefined
 * @returns string normalizado o null si no es válido
 */
function normalizeUserId(userId: any): string | null {
  if (!userId) return null

  // Si ya es string, devolverlo
  if (typeof userId === 'string') {
    return userId.trim()
  }

  // Si es un objeto, convertir a JSON string
  if (typeof userId === 'object') {
    console.warn('userId es un objeto, convirtiendo a string:', userId)
    return JSON.stringify(userId)
  }

  // Para otros tipos (number, etc.), convertir a string
  return String(userId)
}

