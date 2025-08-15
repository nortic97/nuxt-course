import type { Chat, ChatWithMessages, ApiResponse, UserAgentMessagesResponse } from '../../../middleware/server/types/types'
import { v4 as uuidv4 } from 'uuid'

export default function useChats() {
  const { session } = useAuth()
  const userId = computed(() => session.value?.databaseUserId)
  const { categoriesWithAgents } = useAgentCategories()
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  const isCreating = ref(false)
  const chats = useState<Chat[]>('chats', () => [])
  const emptyChat = ref<Chat | null>(null)

  // Función para obtener chats de un agente específico
  async function _fetchAgentChats(agentId: string): Promise<Chat[]> {
    if (!userId.value) return []

    try {
      const response = await $fetch<ApiResponse<UserAgentMessagesResponse>>(
        `/api/users/${userId.value}/agent/${agentId}/messages`,
        {
          headers: {
            ...useRequestHeaders(['cookie']),
            'x-user-id': userId.value?.toString() || ''
          }
        }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al cargar los chats')
      }

      const now = new Date()
      return response.data.chats.map(chat => ({
        id: chat.id,
        title: chat.title || `Chat con ${response.data?.agent?.name || 'Asistente'}`,
        agentId: agentId,
        userId: userId.value!,
        messageCount: chat.messageCount || 0,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        projectId: undefined
      } as Chat))
    } catch (err) {
      console.error('Error al cargar chats del agente:', err)
      error.value = 'No se pudieron cargar los chats del agente'
      return []
    }
  }

  // Función para cargar los chats de todos los agentes
  async function fetchChats(force = false) {
    if ((isLoading.value && !force) || !userId.value) return

    isLoading.value = true
    error.value = null

    try {
      // Si no hay categorías, intentar cargarlas
      if (!categoriesWithAgents.value?.length) {
        await categoriesWithAgents.value // Esperar a que se resuelva la promesa
      }

      // Obtener todos los agentes de las categorías
      const allAgentIds = categoriesWithAgents.value.flatMap(cat =>
        cat.agents.map(agent => agent.id)
      )

      // Usar un Set para evitar IDs duplicados
      const uniqueAgentIds = [...new Set(allAgentIds)]

      // Obtener chats de cada agente en paralelo
      const allChats = await Promise.all(
        uniqueAgentIds.map(agentId => _fetchAgentChats(agentId))
      )

      // Aplanar y actualizar el estado
      chats.value = allChats.flat()
    } catch (err) {
      console.error('Error al cargar chats:', err)
      error.value = 'Error al cargar los chats. Por favor, inténtalo de nuevo.'
    } finally {
      isLoading.value = false
    }
  }

  // Función para convertir Timestamp a Date si es necesario
  const parseDate = (date: Date | { toDate: () => Date } | null | undefined): Date | null => {
    if (!date) return null
    return date instanceof Date ? date : date.toDate()
  }

  // Obtener mensajes recientes
  async function prefetchChatMessages() {
    if (!chats.value.length) return

    const recentChats = [...chats.value]
      .sort((a, b) => {
        const dateA = parseDate(a.lastMessageAt)?.getTime() || 0
        const dateB = parseDate(b.lastMessageAt)?.getTime() || 0
        return dateB - dateA
      })
      .slice(0, 2)

    await Promise.all(
      recentChats.map(async (chat) => {
        try {

          const response = await $fetch<ApiResponse<ChatWithMessages>>(
            `/api/chats/${chat.id}`,
            {
              headers: {
                ...useRequestHeaders(['cookie']),
                'x-user-id': userId.value?.toString() || ''
              }
            }
          )

          if (response.success && response.data) {
            // Actualizar el chat con los mensajes
            const index = chats.value.findIndex(c => c.id === chat.id)
            if (index !== -1) {
              chats.value[index] = { ...chats.value[index], ...response.data }
            }
          }
        } catch (error) {
          console.error(`Error fetching messages for chat ${chat.id}:`, error)
        }
      })
    )
  }

  // Inicializar un chat vacío localmente
  function initializeEmptyChat(agentId?: string, projectId?: string): Chat {
    return {
      id: uuidv4(),
      title: 'Nuevo chat',
      userId: session.value?.databaseUserId?.toString() || '',
      agentId: agentId || '',
      projectId: projectId,
      messageCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Chat
  }

  async function createChat(agentId: string, projectId?: string): Promise<Chat | null> {
    if (isCreating.value) {
      //console.warn('Ya hay una solicitud de creación de chat en curso')
      return null
    }

    if (!agentId) {
      //console.error('Se requiere un ID de agente para crear un chat')
      return null
    }

    // Si no hay usuario autenticado, devolver un chat local
    const { session } = useAuth()
    const userId = session.value?.databaseUserId
    if (!userId) {
      const newChat = initializeEmptyChat(agentId, projectId)
      emptyChat.value = newChat
      return newChat
    }

    isCreating.value = true
    try {
      const requestBody = {
        agentId,
        ...(projectId && { projectId })
      }

      const response = await $fetch<ApiResponse<Chat>>('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...useRequestHeaders(['cookie']),
          'x-user-id': userId.toString()
        },
        body: JSON.stringify(requestBody)
      })

      if (response.success && response.data) {
        chats.value.unshift(response.data)
        emptyChat.value = null
        return response.data
      }
      throw new Error(response.error || 'Error al crear el chat')
    } catch (error) {
      console.error('Error creating chat:', error)
      // Si hay un error, devolver un chat local
      const newChat = initializeEmptyChat(agentId, projectId)
      emptyChat.value = newChat
      return newChat
    } finally {
      isCreating.value = false
    }
  }

  // Actualizar un chat existente
  async function updateChat(chatId: string, updates: Partial<Chat>) {
    try {
      // Filtrar solo los campos definidos
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )

      const response = await $fetch<ApiResponse<Chat>>(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...useRequestHeaders(['cookie']),
          'x-user-id': userId.toString()
        },
        body: JSON.stringify(filteredUpdates)
      })

      if (response.success && response.data) {
        // Actualizar el chat en la lista local
        const index = chats.value.findIndex(c => c.id === chatId)
        if (index !== -1) {
          chats.value[index] = { ...chats.value[index], ...response.data }
        }
        return response.data
      }
      throw new Error(response.error || 'Error al actualizar el chat')
    } catch (error) {
      console.error('Error updating chat:', error)
      throw error
    }
  }

  // Obtener chats por proyecto
  function chatsInProject(projectId: string) {
    return computed(() =>
      chats.value.filter(chat => chat.projectId === projectId)
    )
  }

  // Crear y navegar a un nuevo chat
  async function createChatAndNavigate(
    options: { agentId?: string; projectId?: string } = {}
  ) {
    // Usar el agente por defecto si no se proporciona uno
    const agentId = options.agentId || '50e79d2f-994e-4155-b2cd-c120c3da2c09'

    const chat = await createChat(agentId, options.projectId)

    if (!chat) {
      console.error('No se pudo crear el chat')
      return
    }

    // Navegar a la ruta correspondiente
    const route = chat.projectId
      ? `/agents/${chat.projectId}/chats/${chat.id}`
      : `/chats/${chat.id}`

    await navigateTo(route)
    return chat
  }

  // Cargar chats cuando el componente se monte
  onMounted(() => {
    fetchChats()
  })

  // Si el userId cambia, recargar los chats
  watch(userId, (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
      fetchChats(true)
    }
  })

  return {
    chats,
    createChat,
    createChatAndNavigate,
    chatsInProject,
    updateChat,
    fetchChats,
    prefetchChatMessages,
    emptyChat: readonly(emptyChat),
    isLoading: readonly(isLoading),
    error: readonly(error),
    userId: readonly(userId)
  }
}