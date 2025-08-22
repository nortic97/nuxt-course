import type { Agent, Chat } from '#layers/middleware/server/types/types'
import {createAIModel} from "#layers/chat/server/services/ai-service";

/**
 * Servicio para obtener datos del Agent desde la capa middleware
 */
export class AgentService {
  /**
   * Obtiene los datos del Agent asociado a un chat
   */
  static async getAgentByChat(chatId: string, userId: string): Promise<Agent | null> {
    try {
      // Llamar al endpoint de middleware para obtener el chat
      const chatResponse = await $fetch<{ success: boolean; data: Chat }>(`/api/chats/${chatId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (!chatResponse.success || !chatResponse.data) {
        console.error('Chat no encontrado:', chatId)
        return null
      }

      const chat = chatResponse.data

      // Si el chat no tiene agentId, retornar null
      if (!chat.agentId) {
        console.warn('Chat no tiene Agent asociado:', chatId)
        return null
      }

      // Obtener el Agent desde middleware
      const agentResponse = await $fetch<{ success: boolean; data: Agent }>(`/api/agents/${chat.agentId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (!agentResponse.success || !agentResponse.data) {
        console.error('Agent no encontrado:', chat.agentId)
        return null
      }

      return agentResponse.data
    } catch (error) {
      console.error('Error obteniendo Agent data:', error)
      return null
    }
  }

  /**
   * Obtiene el system prompt del Agent o retorna uno por defecto
   */
  static getSystemPrompt(agent: Agent | null): string {
    if (agent?.systemPrompt) {
      return agent.systemPrompt
    }
    
    // System prompt por defecto
    return 'Eres un asistente útil y amigable. Responde de manera clara y concisa.'
  }

  /**
   * Obtiene el modelo del Agent o retorna uno por defecto
   */
  static getModel(agent: Agent | null): string {
    if (agent?.model) {
      return agent.model
    }
    
    // Modelo por defecto - Ollama (gratuito)
    return 'llama3.2'
  }

  /**
   * Obtiene el proveedor de AI basado en el modelo del Agent
   */
  static getProvider(agent: Agent | null): string {
    const model = this.getModel(agent)
    
    // Detectar proveedor basado en el modelo
    if (model.startsWith('gpt-') || model.includes('openai')) {
      return 'openai'
    }
    if (model.includes('groq') || model.includes('llama3-') || model.includes('mixtral') || model.includes('gemma')) {
      return 'groq'
    }
    if (model.includes('llama') || model.includes('mistral') || model.includes('codellama')) {
      return 'ollama'
    }
    
    // Por defecto Ollama (gratuito)
    return 'ollama'
  }

  /**
   * Crea el modelo de AI apropiado para el Agent
   */
  static createAIModelForAgent(agent: Agent | null, runtimeConfig: any) {
    const model = this.getModel(agent)
    const provider = this.getProvider(agent)
    
    console.log(`[AgentService] Usando proveedor: ${provider}, modelo: ${model}`)
    
    // Seleccionar API key según el proveedor
    let apiKey: string | undefined
    switch (provider) {
      case 'openai':
        apiKey = runtimeConfig.openaiApiKey
        break
      case 'groq':
        apiKey = runtimeConfig.groqApiKey
        break
      case 'ollama':
        // Ollama no necesita API key
        apiKey = undefined
        break
    }
    
    return createAIModel(provider, model, apiKey)
  }
}
