import type { Chat, ChatWithMessages, ApiResponse, UserAgentMessagesResponse } from '#layers/middleware/server/types/types'
import { v4 as uuidv4 } from 'uuid'
import useApi from './useApi'

export default function useChats() {
  const { fetch } = useApi()
  const { session } = useAuth()
  const userId = computed(() => session.value?.databaseUserId)
  const { categoriesWithAgents } = useAgentCategories()
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  const isCreating = ref(false)
  const chats = useState<Chat[]>('chats', () => [])
  const emptyChat = ref<Chat | null>(null)

  // Function to fetch chats for a specific agent
  async function _fetchAgentChats(agentId: string): Promise<Chat[]> {
    if (!userId.value) return []

    try {
      const response = await fetch<ApiResponse<UserAgentMessagesResponse>>(
        `/api/users/${userId.value}/agent/${agentId}/messages`,
        {
          headers: {
            ...useRequestHeaders(['cookie']),
            'x-user-id': userId.value?.toString() || ''
          }
        }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error loading chats')
      }

      return response.data.chats.map(chat => ({
        id: chat.id,
        title: chat.title || `Chat with ${response.data?.agent?.name || 'Assistant'}`,
        agentId: agentId,
        userId: userId.value!,
        messageCount: chat.messageCount || 0,
        lastMessageAt: chat.updatedAt || chat.createdAt || new Date(),
        createdAt: chat.createdAt || new Date(),
        updatedAt: chat.updatedAt || chat.createdAt || new Date(),
        isActive: true
      } as Chat))
    } catch (err) {
      console.error('Error fetching agent chats:', err)
      error.value = 'Could not load agent chats'
      return []
    }
  }

  // Function to load chats for all agents
  async function fetchChats(force = false) {
    if ((isLoading.value && !force) || !userId.value) return

    isLoading.value = true
    error.value = null

    try {
      // If there are no categories, try to load them
      if (!categoriesWithAgents.value?.length) {
        await categoriesWithAgents.value // Wait for the promise to resolve
      }

      // Get all agents from the categories
      const allAgentIds = categoriesWithAgents.value.flatMap(cat =>
        cat.agents.map(agent => agent.id)
      )

      // Use a Set to avoid duplicate IDs
      const uniqueAgentIds = [...new Set(allAgentIds)]

      // Fetch chats for each agent in parallel
      const allChats = await Promise.all(
        uniqueAgentIds.map(agentId => _fetchAgentChats(agentId))
      )

      // Flatten and update the state
      chats.value = allChats.flat()
    } catch (err) {
      console.error('Error loading chats:', err)
      error.value = 'Error loading chats. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  // Function to convert Timestamp to Date if necessary
  const parseDate = (date: Date | { toDate: () => Date } | string | null | undefined): Date | null => {
    if (!date) return null
    if (date instanceof Date) return date
    if (typeof date === 'string') return new Date(date)
    if (typeof (date as any).toDate === 'function') return (date as any).toDate()
    return null
  }

  // Fetch recent messages
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

          const response = await fetch<ApiResponse<ChatWithMessages>>(
            `/api/chats/${chat.id}`,
            {
              headers: {
                ...useRequestHeaders(['cookie']),
                'x-user-id': userId.value?.toString() || ''
              }
            }
          )

          if (response.success && response.data) {
            // Update the chat with messages
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

  // Initialize an empty chat locally
  function initializeEmptyChat(agentId?: string): Chat {
    return {
      id: uuidv4(),
      title: 'New Chat',
      userId: session.value?.databaseUserId?.toString() || '',
      agentId: agentId || '',
      messageCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Chat
  }

  async function createChat(agentId: string): Promise<Chat | null> {
    if (isCreating.value) {
      console.warn('A chat creation request is already in progress')
      return null
    }

    if (!agentId) {
      console.error('An agent ID is required to create a chat')
      return null
    }

    // If there is no authenticated user, return a local chat
    const { session } = useAuth()
    const userId = session.value?.databaseUserId
    if (!userId) {
      const newChat = initializeEmptyChat(agentId)
      emptyChat.value = newChat
      return newChat
    }

    isCreating.value = true
    try {
      const requestBody = {
        agentId
      }

      const response = await fetch<ApiResponse<Chat>>('/api/chats', {
        method: 'POST',
        body: requestBody
      })

      if (response.success && response.data) {
        chats.value.unshift(response.data)
        emptyChat.value = null
        return response.data
      }
      throw new Error(response.error || 'Error creating chat')
    } catch (error) {
      console.error('Error creating chat:', error)
      // If there is an error, return a local chat
      const newChat = initializeEmptyChat(agentId)
      emptyChat.value = newChat
      return newChat
    } finally {
      isCreating.value = false
    }
  }

  // Update an existing chat
  async function updateChat(chatId: string, updates: Partial<Chat>) {
    try {
      // Filter only defined fields
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )

      const response = await fetch<ApiResponse<Chat>>(`/api/chats/${chatId}`, {
        method: 'PATCH',
        body: filteredUpdates
      })

      if (response.success && response.data) {
        // Update the chat in the local list
        const index = chats.value.findIndex(c => c.id === chatId)
        if (index !== -1) {
          chats.value[index] = { ...chats.value[index], ...response.data }
        }
        return response.data
      }
      throw new Error(response.error || 'Error updating chat')
    } catch (error) {
      console.error('Error updating chat:', error)
      throw error
    }
  }

  // Delete a chat
  async function deleteChat(chatId: string) {
    try {
      const response = await fetch<ApiResponse<null>>(`/api/chats/${chatId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        // Remove the chat from the local list
        chats.value = chats.value.filter(c => c.id !== chatId)
      } else {
        throw new Error(response.error || 'Error deleting chat')
      }
    } catch (err) {
      console.error('Error deleting chat:', err)
      error.value = 'Could not delete chat. Please try again.'
      // Do not throw the error to avoid interrupting the UI, the error is shown in the 'error' variable
    }
  }

  // Create and navigate to a new chat
  async function createChatAndNavigate(
    options: { agentId?: string } = {}
  ) {
    // Use the default agent if one is not provided
    const agentId = options.agentId || '50e79d2f-994e-4155-b2cd-c120c3da2c09'

    const chat = await createChat(agentId)

    if (!chat) {
      console.error('Could not create chat')
      return
    }

    // Navigate to the corresponding route
    const route = `/chats/${chat.id}`

    await navigateTo(route)
    return chat
  }

  // Load chats when the component is mounted
  onMounted(() => {
    fetchChats()
  })

  // If the userId changes, reload the chats
  watch(userId, (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
      fetchChats(true)
    }
  })

  return {
    chats,
    createChat,
    createChatAndNavigate,
    updateChat,
    deleteChat,
    fetchChats,
    prefetchChatMessages,
    emptyChat: readonly(emptyChat),
    isLoading: readonly(isLoading),
    error: readonly(error),
    userId: readonly(userId)
  }
}