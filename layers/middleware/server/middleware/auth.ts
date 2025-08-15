import type { H3Event } from 'h3'
import { createError, getRequestHeader, defineEventHandler, getCookie } from 'h3'
import { ofetch } from 'ofetch'

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
    //console.log(`Acceso permitido a ruta pública: ${url}`)
    // Si es una ruta de usuario con ID, agregar el ID al contexto
    const userIdMatch = url.match(/^\/api\/users\/([a-f0-9-]+)/)
    if (userIdMatch && userIdMatch[1]) {
      event.context.userId = userIdMatch[1]
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

  console.log(`Verificando autenticación para ruta protegida: ${url}`)

  // Obtener el ID de usuario del header o de la cookie
  let userId = getRequestHeader(event, 'x-user-id')

  // Si no está en el header, buscar en las cookies
  if (!userId) {
    userId = getCookie(event, 'x-user-id')
    console.log('x-user-id from cookie:', userId)
  }

  // Si no hay userId, devolver error de no autorizado
  if (!userId) {
    console.error('Acceso no autorizado a ruta protegida:', url)
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado. Por favor inicia sesión.'
    })
  }

  // Si llegamos aquí, el usuario está autenticado
  console.log('Usuario autenticado con ID:', userId)
  event.context.userId = userId

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
      console.error(`Error: User with id ${userId} not found`)
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Agregar la información del usuario al contexto
    event.context.user = user.data
    console.log('User authenticated:', { id: user.data.id, email: user.data.email })

  } catch (error) {
    console.error('Error verifying user:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while verifying user'
    })
  }
})
