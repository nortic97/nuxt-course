import { v4 as uuidv4 } from 'uuid'
import { createOrUpdateUserViaAPI } from '../../repository/userRepository'
import type { GoogleUser } from '../../../shared/types/types'
import { logger } from '#layers/middleware/server/utils/logger'

// Function to generate a temporary chat ID
function generateTempChatId(): string {
  return `${uuidv4()}`
}

async function getRedirectUrl(_userId: string): Promise<string> {
  // Create a temporary chat ID
  const tempChatId = generateTempChatId()
  // Redirect to the temporary chat
  return `/chats/${tempChatId}`;
}

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {

    if (!user.email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email is required',
      })
    }

    const googleUser: GoogleUser = {
      id: uuidv4(),
      email: user.email,
      name: user.name ?? undefined,
      avatar: user.picture,
      provider: 'google',
    }

    try {
      // Use the auth layer repository which calls the base layer API
      const dbUser = await createOrUpdateUserViaAPI(googleUser)

      // Configure the user session
      const sessionData = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          avatar: user.picture,
          provider: 'google' as const,
        },
        databaseUserId: dbUser.id,
        loggedInAt: new Date().toISOString(),
        // Add the temporary chat to the session
        tempChatId: generateTempChatId()
      }
      await setUserSession(event, sessionData)

      // Set a secure HTTP-Only cookie with the user ID
      setCookie(event, 'x-user-id', dbUser.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      })

      // Use the user ID from the database to get/create chats
      const redirectUrl = await getRedirectUrl(dbUser.id)
      return sendRedirect(event, redirectUrl || '/')
    } catch (error) {
      logger.error('Error creating/updating user', error as Error, {
        email: user.email,
        provider: 'google'
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Error processing user',
      })
    }
  },
  onError(event, error) {
    logger.error('Error in Google authentication', error as Error, {
      path: event.path,
      method: event.method
    })
    return sendRedirect(event, '/')
  },
})