import { v4 as uuidv4 } from 'uuid'
import { createOrUpdateUserViaAPI } from '../../repository/userRepository'
import { getChatsByUserViaAPI, createChatViaAPI } from '../../repository/chatRepository'
import { getFirstAvailableAgentViaAPI } from '../../repository/agentRepository'

async function getRedirectUrl(userId: string): Promise<string> {
  const defaultRedirect = '/';

  try {
    // 1. Obtener los chats del usuario
    const chats = await getChatsByUserViaAPI(userId, {
      limit: 1,
      orderBy: 'lastMessageAt',
      orderDirection: 'desc'
    });

    // 2. Si hay chats, redirigir al más reciente
    if (chats.length > 0) {
      const mostRecentChat = chats[0];
      if (mostRecentChat?.id) {
        return `/chats/${mostRecentChat.id}`;
      }
      console.warn('Chat encontrado pero sin ID válido:', mostRecentChat);
    }

    // 3. Si no hay chats, obtener un agente disponible
    console.log('No se encontraron chats existentes. Buscando agente disponible...');
    const availableAgent = await getFirstAvailableAgentViaAPI(userId);

    if (!availableAgent?.id) {
      console.warn('No hay agentes disponibles para el usuario:', userId);
      return defaultRedirect;
    }

    // 4. Crear un nuevo chat con el agente disponible
    console.log(`Creando nuevo chat con el agente: ${availableAgent.id}`);
    const newChat = await createChatViaAPI(userId, {
      title: 'Nuevo Chat',
      agentId: availableAgent.id
    });

    if (!newChat?.id) {
      throw new Error('No se pudo crear el nuevo chat');
    }

    return `/chats/${newChat.id}`;

  } catch (error) {
    console.error('Error en getRedirectUrl:', error instanceof Error ? error.message : 'Error desconocido');
    return defaultRedirect;
  }
}

export default defineOAuthGoogleEventHandler({
  config: {
  },
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
      name: user.name ?? null,
      avatar: user.picture,
      provider: 'google',
    }

    try {
      // Usar el repository de la capa auth que llama a la API de la capa base
      const dbUser = await createOrUpdateUserViaAPI(googleUser)

      await setUserSession(event, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          avatar: user.picture,
          provider: 'google',
        },
        databaseUserId: dbUser.id,
        loggedInAt: new Date(),
      })

      // Usar el ID del usuario de la base de datos para obtener/crear chats
      const redirectUrl = await getRedirectUrl(dbUser.id)
      return sendRedirect(event, redirectUrl)
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