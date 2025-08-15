import { v4 as uuidv4 } from 'uuid'
import { createOrUpdateUserViaAPI } from '../../repository/userRepository'
import type { GoogleUser } from '../../../shared/types/types'

// Función para generar un ID de chat temporal
function generateTempChatId(): string {
  return `${uuidv4()}`
}

async function getRedirectUrl(_userId: string): Promise<string> {
  // Crear un ID de chat temporal
  const tempChatId = generateTempChatId()
  // Redirigir al chat temporal
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
      // Usar el repository de la capa auth que llama a la API de la capa base
      const dbUser = await createOrUpdateUserViaAPI(googleUser)

      // Configurar la sesión del usuario
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
        // Añadimos el chat temporal a la sesión
        tempChatId: generateTempChatId()
      }
      await setUserSession(event, sessionData)

      // Establecer una cookie HTTP-Only segura con el ID de usuario
      setCookie(event, 'x-user-id', dbUser.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: '/',
      })

      // Usar el ID del usuario de la base de datos para obtener/crear chats
      const redirectUrl = await getRedirectUrl(dbUser.id)
      return sendRedirect(event, redirectUrl || '/')
    } catch (error) {
      console.error('Error creating/updating user:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error al procesar el usuario',
      })
    }
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/')
  },
})