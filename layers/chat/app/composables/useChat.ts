// composables/useChats.ts
import type { Chat, ChatWithMessages, Message } from '../../../middleware/server/types/types'
import useApi from './useApi'
import { v4 as uuidv4 } from 'uuid'

export default function useChats() {
  const { fetch } = useApi()
  const chats = useState<Chat[]>('chats', () => [])
  const currentChat = useState<ChatWithMessages | null>('current-chat', () => null)
  const messages = useState<Message[]>('chat-messages', () => [])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const _isSending = ref(false)

  // Inicializar un chat vacío
  const initializeEmptyChat = (agentId?: string): ChatWithMessages => ({
    id: uuidv4(),
    title: 'Nuevo chat',
    userId: '',
    agentId: agentId || '',
    messageCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: []
  } as ChatWithMessages)

  // Cargar todos los chats del usuario
  const fetchChats = async (): Promise<Chat[]> => {
    try {
      isLoading.value = true
      error.value = null
      const response = await fetch<{ data: Chat[] }>('/api/chats')
      chats.value = response.data || []
      return chats.value
    } catch (err) {
      error.value = 'Error al cargar los chats'
      console.error('Error fetching chats:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Obtener un chat por su ID con sus mensajes
  const getChat = async (chatId: string): Promise<ChatWithMessages> => {
    try {
      // Si es un nuevo chat, inicializar uno vacío
      if (chatId === 'new') {
        const emptyChat = initializeEmptyChat()
        currentChat.value = emptyChat
        messages.value = []
        return emptyChat
      }

      isLoading.value = true
      error.value = null
      const chat = await fetch<ChatWithMessages>(`/api/chats/${chatId}`)
      currentChat.value = chat
      messages.value = chat.messages || []
      return chat
    } catch (err) {
      // Si hay un error, inicializar un chat vacío
      console.error(`Error fetching chat ${chatId}:`, err)
      const emptyChat = initializeEmptyChat()
      currentChat.value = emptyChat
      messages.value = []
      return emptyChat
    } finally {
      isLoading.value = false
    }
  }

  // Crear un nuevo chat
  const createChat = async (options: { agentId?: string } = {}) => {
    // Si no hay agentId, inicializar un chat vacío localmente
    if (!options.agentId) {
      currentChat.value = initializeEmptyChat()
      messages.value = []
      return currentChat.value
    }
    try {
      const response = await fetch<Chat>('/api/chats', {
        method: 'POST',
        body: options
      })

      chats.value.unshift(response)
      return response
    } catch (err) {
      console.error('Error creating chat:', err)
      throw err
    }
  }

  // Actualizar un chat existente
  const updateChat = async (chatId: string, updates: Partial<Chat>) => {
    try {
      const response = await fetch<Chat>(`/api/chats/${chatId}`, {
        method: 'PATCH',
        body: updates
      })

      // Actualizar en la lista local
      const index = chats.value.findIndex(c => c.id === chatId)
      if (index !== -1) {
        chats.value[index] = { ...chats.value[index], ...response }
      }

      return response
    } catch (err) {
      console.error(`Error updating chat ${chatId}:`, err)
      throw err
    }
  }

  // Eliminar un chat
  const deleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      chats.value = chats.value.filter(chat => chat.id !== chatId)
    } catch (err) {
      console.error(`Error deleting chat ${chatId}:`, err)
      throw err
    }
  }

  // Crear y navegar a un nuevo chat
  const createAndNavigate = async (options: { agentId?: string } = {}) => {
    const chat = await createChat(options)
    const path = `/chats/${chat.id}`

    await navigateTo(path)
    return chat
  }

  // Enviar un mensaje
  const sendMessage = async (content: string): Promise<Message> => {
    if (!currentChat.value?.id) {
      throw new Error('No hay un chat activo')
    }

    try {
      _isSending.value = true
      const newMessage = await fetch<Message>(`/api/chats/${currentChat.value.id}/messages`, {
        method: 'POST',
        body: { content }
      })

      // Actualizar la lista de mensajes
      messages.value = [...messages.value, newMessage]

      // Actualizar el último mensaje en la lista de chats
      const chatIndex = chats.value.findIndex(c => c.id === currentChat.value?.id)
      if (chatIndex !== -1) {
        const currentChat = chats.value[chatIndex]
        if (currentChat) {
          chats.value[chatIndex] = {
            ...currentChat,
            lastMessageAt: new Date(),
            messageCount: (currentChat.messageCount || 0) + 1,
            // Asegurarse de que los campos requeridos estén presentes
            userId: currentChat.userId,
            agentId: currentChat.agentId,
            isActive: currentChat.isActive !== false
          }
        }
      }

      return newMessage
    } catch (err) {
      error.value = 'Error al enviar el mensaje'
      console.error('Error sending message:', err)
      throw err
    } finally {
      _isSending.value = false
    }
  }

  // Limpiar el chat actual
  const clearCurrentChat = (): void => {
    currentChat.value = null
    messages.value = []
  }

  return {
    // State
    chats: readonly(chats),
    currentChat: readonly(currentChat),
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isSending: readonly(_isSending),

    // Methods
    fetchChats,
    getChat,
    createChat,
    updateChat,
    deleteChat,
    createAndNavigate,
    sendMessage,
    clearCurrentChat
  }
}