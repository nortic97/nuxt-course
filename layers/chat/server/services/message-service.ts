import type { Message } from '#layers/middleware/server/types/types'

/**
 * Servicio para obtener mensajes desde la capa middleware
 */
export class MessageService {
  /**
   * Obtiene todos los mensajes de un chat para construir el historial
   */
  static async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    try {
      const response = await $fetch<{ success: boolean; data: Message[] }>(`/api/messages?chatId=${chatId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (!response.success || !response.data) {
        console.error('Error obteniendo mensajes del chat:', chatId)
        return []
      }

      // Filtrar solo mensajes activos y ordenar por fecha
      return response.data
        .filter(msg => msg.isActive)
        .sort((a, b) => {
          // Handle both Date and Timestamp types
          const dateA = a.createdAt instanceof Date 
            ? a.createdAt.getTime() 
            : (a.createdAt as any).toDate?.().getTime() || new Date(a.createdAt as any).getTime()
          const dateB = b.createdAt instanceof Date 
            ? b.createdAt.getTime() 
            : (b.createdAt as any).toDate?.().getTime() || new Date(b.createdAt as any).getTime()
          return dateA - dateB
        })
    } catch (error) {
      console.error('Error obteniendo mensajes:', error)
      return []
    }
  }

  /**
   * Convierte mensajes del formato interno al formato requerido por OpenAI
   */
  static formatMessagesForOpenAI(messages: Message[], systemPrompt: string) {
    const formattedMessages = [
      {
        id: 'system-prompt',
        role: 'system',
        content: systemPrompt
      }
    ]

    // Agregar mensajes del historial
    messages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        formattedMessages.push({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      }
    })

    return formattedMessages
  }
}
