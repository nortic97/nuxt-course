import { generateText, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createOllama } from 'ollama-ai-provider'
import type { Message, LanguageModelV1 } from 'ai'

export const createOllamaModel = () => {
  const ollama = createOllama()
  return ollama('llama3.2')
}

export const createOpenAIModel = (apiKey: string, model: string = 'gpt-4o-mini') => {
  const openai = createOpenAI({
    apiKey,
  })
  return openai(model)
}

/**
 * Factory dinámico para crear modelos de AI según el proveedor
 */
// Función para crear modelo Groq (IA gratuita en la nube)
export const createGroqModel = (apiKey: string, model: string = 'llama3-8b-8192') => {
  const groq = createOpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  })
  return groq(model)
}

export const createAIModel = (provider: string, model: string, apiKey?: string) => {
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!apiKey) {
        throw new Error('OpenAI requiere API key')
      }
      return createOpenAIModel(apiKey, model)
    
    case 'groq':
      if (!apiKey) {
        throw new Error('Groq requiere API key')
      }
      return createGroqModel(apiKey, model)
    
    case 'ollama':
      return createOllamaModel()
    
    default:
      console.warn(`Proveedor desconocido: ${provider}, usando Ollama por defecto`)
      return createOllamaModel()
  }
}

/**
 * Detecta el proveedor basado en el modelo
 */
export const detectProvider = (model: string): string => {
  if (model.startsWith('gpt-') || model.includes('openai')) {
    return 'openai'
  }
  if (model.includes('groq') || model.includes('llama3-') || model.includes('mixtral') || model.includes('gemma')) {
    return 'groq'
  }
  if (model.includes('llama') || model.includes('mistral') || model.includes('codellama')) {
    return 'ollama'
  }
  // Por defecto usar Ollama (gratuito)
  return 'ollama'
}

export async function generateChatResponse(
  model: LanguageModelV1,
  messages: Message[]
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid messages format')
  }

  const response = await generateText({
    model,
    messages,
  })

  return response.text.trim()
}

export async function generateChatTitle(
  model: LanguageModelV1,
  firstMessage: string
): Promise<string> {
  const response = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates concise, descriptive titles for chat conversations. Generate a title that captures the essence of the first message in 3 short words or less.',
      },
      {
        role: 'user',
        content: firstMessage,
      },
    ],
  })
  return response.text.trim()
}

export async function streamChatResponse(
  model: LanguageModelV1,
  messages: Message[]
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid messages format')
  }

  return streamText({
    model,
    messages,
  }).textStream
}
