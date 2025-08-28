import type { Agent, Chat } from '#layers/middleware/server/types/types'
import {createAIModel} from "#layers/chat/server/services/ai-service";

/**
 * Service to get Agent data from the middleware layer
 */
export class AgentService {
  /**
   * Gets the data of the Agent associated with a chat
   */
  static async getAgentByChat(chatId: string, userId: string): Promise<Agent | null> {
    try {
      // Call the middleware endpoint to get the chat
      const chatResponse = await $fetch<{ success: boolean; data: Chat }>(`/api/chats/${chatId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (!chatResponse.success || !chatResponse.data) {
        console.error('Chat not found:', chatId)
        return null
      }

      const chat = chatResponse.data

      // If the chat has no agentId, return null
      if (!chat.agentId) {
        console.warn('Chat has no Agent associated:', chatId)
        return null
      }

      // Get the Agent from middleware
      const agentResponse = await $fetch<{ success: boolean; data: Agent }>(`/api/agents/${chat.agentId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (!agentResponse.success || !agentResponse.data) {
        console.error('Agent not found:', chat.agentId)
        return null
      }

      return agentResponse.data
    } catch (error) {
      console.error('Error getting Agent data:', error)
      return null
    }
  }

  /**
   * Gets the system prompt from the Agent or returns a default one
   */
  static getSystemPrompt(agent: Agent | null): string {
    if (agent?.systemPrompt) {
      return agent.systemPrompt
    }
    
    // Default system prompt
    return 'You are a helpful and friendly assistant. Respond clearly and concisely.'
  }

  /**
   * Gets the model from the Agent or returns a default one
   */
  static getModel(agent: Agent | null): string {
    if (agent?.model) {
      return agent.model
    }
    
    // Default model - Ollama (free)
    return 'llama3.2'
  }

  /**
   * Gets the AI provider based on the Agent's model
   */
  static getProvider(agent: Agent | null): string {
    const model = this.getModel(agent)
    
    // Detect provider based on the model
    if (model.startsWith('gpt-') || model.includes('openai')) {
      return 'openai'
    }
    if (model.includes('groq') || model.includes('llama3-') || model.includes('mixtral') || model.includes('gemma')) {
      return 'groq'
    }
    if (model.includes('llama') || model.includes('mistral') || model.includes('codellama')) {
      return 'ollama'
    }
    
    // Default to Ollama (free)
    return 'ollama'
  }

  /**
   * Creates the appropriate AI model for the Agent
   */
  static createAIModelForAgent(agent: Agent | null, runtimeConfig: any) {
    const model = this.getModel(agent)
    const provider = this.getProvider(agent)
    
    console.log(`[AgentService] Using provider: ${provider}, model: ${model}`)
    
    // Select API key based on the provider
    let apiKey: string | undefined
    switch (provider) {
      case 'openai':
        apiKey = runtimeConfig.openaiApiKey
        break
      case 'groq':
        apiKey = runtimeConfig.groqApiKey
        break
      case 'ollama':
        // Ollama does not need an API key
        apiKey = undefined
        break
    }
    
    return createAIModel(provider, model, apiKey)
  }
}
