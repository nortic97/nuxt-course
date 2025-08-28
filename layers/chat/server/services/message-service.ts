import type { Message } from '#layers/middleware/server/types/types'

/**
 * Service to get messages from the middleware layer
 */
export class MessageService {
  /**
   * Gets all messages from a chat to build the history
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
        console.error('Error getting messages from chat:', chatId)
        return []
      }

      // Filter only active messages and sort by date
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
      console.error('Error getting messages:', error)
      return []
    }
  }

  /**
   * Converts messages from the internal format to the format required by OpenAI
   */
  static formatMessagesForOpenAI(messages: Message[], systemPrompt: string) {
    const formattedMessages = [
      {
        id: 'system-prompt',
        role: 'system',
        content: systemPrompt
      }
    ]

    // Add messages from the history
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
