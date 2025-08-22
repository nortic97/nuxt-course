import type { Timestamp } from 'firebase-admin/firestore'

// Tipos base para Firestore
export interface DocumentBase {
    id: string
    createdAt: Date | Timestamp
    updatedAt: Date | Timestamp
    isActive: boolean
}

// Modelo User (compatible con auth layer)
export interface User extends DocumentBase {
    email: string
    name?: string | null
    avatar?: string
    provider?: 'google' | 'github' // Agregado para compatibilidad con auth
    // Campos adicionales para el sistema de agentes
    subscription?: {
        plan: 'free' | 'premium' | 'enterprise'
        expiresAt?: Timestamp
    }
}

// Modelo AgentCategory
export interface AgentCategory extends DocumentBase {
    name: string
    description: string
    icon?: string // Ícono para la UI
    order?: number // Orden de visualización
}

// Modelo Agent
export interface Agent extends DocumentBase {
    name: string
    description: string
    price: number
    categoryId: string
    isActive: boolean
    model: string // ej: "gpt-4", "claude-3"
    capabilities: string[] // ej: ["text", "image", "code"]
    systemPrompt: string // Prompt base del agente
    temperature?: number
    maxTokens?: number
    isFree: boolean // Si está disponible en el plan gratuito
    icon?: string // Ícono para la UI
    tags?: string[] // Etiquetas para filtrado
}

// Modelo UserAgent (relación muchos a muchos)
export interface UserAgent extends DocumentBase {
    userId: string
    agentId: string
    purchasedAt: Timestamp
    expiresAt?: Timestamp // Opcional: si el acceso expira
    isActive: boolean
    paymentId?: string // ID de la transacción de pago
    usage: {
        messageCount: number
        lastUsedAt: Timestamp
    }
}

// Modelo Chat
export interface Chat extends DocumentBase {
    title?: string
    userId: string
    agentId: string
    messageCount: number
    lastMessageAt?: Date | Timestamp | null
    isActive: boolean
}

// Modelo Message
export interface Message extends DocumentBase {
    content: string
    role: 'user' | 'assistant' | 'system'
    chatId: string
    userId: string
    metadata?: {
        tokens?: number
        model?: string
        processingTime?: number
        [key: string]: unknown
    }
}

// Enums
export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
}

// Tipos con datos poblados (para respuestas de API)
export interface AgentWithCategory extends Agent {
    category: AgentCategory
}

export interface ChatWithDetails extends Chat {
    agent: Agent
    user: User
    messages?: Message[]
}

export interface ChatWithMessages extends Chat {
    messages: Message[]
}

export interface UserWithAgents extends User {
    availableAgents: AgentWithCategory[]
}

// Tipos para UserAgent
export interface CreateUserAgentInput {
    userId: string
    agentId: string
    purchasedAt?: Date | Timestamp
    expiresAt?: Date | Timestamp
    isActive?: boolean
    paymentId?: string
    usage?: {
        messageCount?: number
        lastUsedAt?: Date | Timestamp
    }
}

export interface UpdateUserAgentInput {
    expiresAt?: Date | Timestamp | null
    isActive?: boolean
    paymentId?: string
    usage?: {
        messageCount?: number
        lastUsedAt?: Date | Timestamp
    }
}

// DTOs para requests
export interface CreateAgentCategoryRequest {
    name: string
    description?: string
    [key: string]: unknown
}

export interface UpdateAgentCategoryRequest {
    name?: string
    description?: string
    isActive?: boolean
    [key: string]: unknown
}

export interface CreateAgentRequest {
    name: string
    description?: string
    price: number
    categoryId: string
    model?: string
    capabilities?: string[]
    [key: string]: unknown
}

export interface UpdateAgentRequest {
    name?: string
    description?: string
    price?: number
    categoryId?: string
    isActive?: boolean
    model?: string
    capabilities?: string[]
    [key: string]: unknown
}

export interface CreateChatRequest {
    title?: string
    agentId: string
    initialMessage?: string // Mensaje inicial opcional
    tags?: string[] // Etiquetas opcionales para el chat
}

export interface UpdateChatRequest {
    title?: string
    isActive?: boolean
}

export interface CreateMessageRequest {
    content: string
    role: 'user' | 'assistant' | 'system'
    chatId: string
    metadata?: Record<string, unknown>
}

export interface CreateProjectRequest {
    name: string
    description?: string
    [key: string]: unknown
}

export interface UpdateProjectRequest {
    name?: string
    description?: string
    isActive?: boolean
    [key: string]: unknown
}

// Respuestas de la API
export interface ApiResponse<T = unknown> {
    success: boolean
    message: string
    data?: T
    error?: string
}

export interface MessageApiResponse extends ApiResponse<Message> {
    aiResponse?: Message
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
}

// Parámetros de consulta
export interface PaginationParams {
    page?: number
    limit?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
}

export interface AgentQueryParams extends PaginationParams {
    categoryId?: string
    isActive?: boolean
    search?: string
    minPrice?: number
    maxPrice?: number
}

export interface ChatQueryParams extends PaginationParams {
    userId?: string
    agentId?: string
    isActive?: boolean
    tag?: string // Filtrar por etiqueta
    isPinned?: boolean // Solo chats fijados
}

export interface MessageQueryParams extends PaginationParams {
    chatId?: string
    userId?: string
    role?: MessageRole
}

// Respuesta para mensajes de usuario y agente
export interface UserAgentMessagesResponse {
    messages: Message[]
    agent: {
        id: string
        name: string
        description: string
        model: string
        isFree: boolean
    }
    chats: Array<{ id: string; title?: string; messageCount: number; updatedAt: Date; createdAt: Date }>
    pagination: {
        page: number
        limit: number
        total: number
        hasNext: boolean
        hasPrev: boolean
    }
}

// Utilidades para Firestore
export interface BaseQueryOptions {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: Array<{
        field: string
        operator: FirebaseFirestore.WhereFilterOp
        value: unknown
    }>
}
