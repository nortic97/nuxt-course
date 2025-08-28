import type { H3Event } from 'h3'
import { createError, getRequestHeader, defineEventHandler, getCookie } from 'h3'
import { ofetch } from 'ofetch'
import { logger } from '../utils/logger'

// Middleware to verify authentication and user
// Verifies the x-user-id header and adds it to the event context

// Routes that DO NOT require authentication
const publicRoutes = [
  '/api/auth',
  '/auth',
  '/_nuxt',
  '/__nuxt',
  '/_ipx',
  '/favicon.ico',
  '/api/users' // Allow all user routes (includes /api/users/[id])
]

// Routes that DO require authentication
const protectedRoutes = [
  '/api/chat',
  '/api/chats',
  '/api/agent',
  '/api/agents',
  // '/api/user', // Commented out to allow registration
  // '/api/users', // Commented out to allow user creation
  '/chat',
  '/chats',
  '/profile'
]

export default defineEventHandler(async (event: H3Event) => {
  const url = event.node.req.url || ''

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => {
    // If the URL starts with the public route or is a user route with an ID
    return url.startsWith(route) ||
      /^\/api\/users\/[a-f0-9-]+$/.test(url.split('?')[0])
  })

  // If it's a public route, continue without checking authentication
  if (isPublicRoute) {
    // If it's a user route with an ID, add the ID to the context
    const userIdMatch = url.match(/^\/api\/users\/([a-f0-9-]+)/)
    if (userIdMatch && userIdMatch[1]) {
      event.context.userId = userIdMatch[1]
      logger.debug('Accessing public route with user ID', { 
        url, 
        userId: userIdMatch[1] 
      })
    }
    return
  }

  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    url.startsWith(route)
  )

  // If it's not a protected route, continue without checking authentication
  if (!isProtectedRoute) {
    return
  }

  logger.debug('Verifying authentication for protected route', { url })

  // Get user ID from header or cookie
  let userId = normalizeUserId(getRequestHeader(event, 'x-user-id'))
  const authSource = userId ? 'header' : null

  // If not in the header, check cookies
  if (!userId) {

    userId = normalizeUserId(getCookie(event, 'x-user-id'))

    if (userId) {
      logger.debug('x-user-id obtained from cookie', { userId })
    }
  } else {
    logger.debug('x-user-id obtained from header', { userId })
  }

  // If there's no userId, return an unauthorized error
  if (!userId) {
    logger.warn('Unauthorized access attempt', { 
      url, 
      method: event.node.req.method,
      ip: event.node.req.socket.remoteAddress
    })
    
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Authentication is required',
    })
  }

  // If we get here, the user is authenticated
  event.context.userId = userId
  logger.info('User authenticated', { userId })

  // Verify if the user exists
  try {
    // Get the base URL from the host
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
      const error = new Error('User not found')
      logger.error('Error verifying user', error, { userId })
      
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Add user information to the context
    event.context.user = user.data
    logger.debug('User verified', { 
      userId: user.data.id, 
      email: user.data.email,
      ip: event.node.req.socket.remoteAddress
    })

  } catch (error) {
    logger.error('Error verifying user', error as Error, { userId })
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while verifying user',
    })
  }
})

/**
 * Normalizes the userId to ensure it's a valid string
 * @param userId - The userId which can be a string, object, or undefined
 * @returns Normalized string or null if invalid
 */
function normalizeUserId(userId: any): string | null {
  if (!userId) return null

  // If it's already a string, return it
  if (typeof userId === 'string') {
    return userId.trim()
  }

  // If it's an object, convert to JSON string
  if (typeof userId === 'object') {
    console.warn('userId is an object, converting to string:', userId)
    return JSON.stringify(userId)
  }

  // For other types (number, etc.), convert to string
  return String(userId)
}
