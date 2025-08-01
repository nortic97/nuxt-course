import type { Timestamp } from 'firebase-admin/firestore'

// Tipos base para Firestore
export interface FirestoreDocument {
    id: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

// Modelo User (compatible con auth layer)
export interface User extends FirestoreDocument {
    email: string
    name?: string | null
    avatar?: string
    isActive: boolean
    provider?: 'google' | 'github' // Agregado para compatibilidad con auth
    // Campos adicionales para el sistema de agentes
    subscription?: {
        plan: 'free' | 'premium' | 'enterprise'
        expiresAt?: Timestamp
    }
}

// Modelo AgentCategory
export interface AgentCategory extends FirestoreDocument {
    name: string
    description?: string
    isActive: boolean
}

// Modelo Agent
export interface Agent extends FirestoreDocument {
    name: string
    description?: string
    price: number
    categoryId: string
    isActive: boolean
    // Metadatos adicionales
    model?: string // ej: "gpt-4", "claude-3"
    capabilities?: string[] // ej: ["text", "image", "code"]
}

// Modelo UserAgent (relación muchos a muchos)
export interface UserAgent extends FirestoreDocument {
    userId: string
    agentId: string
    paidAt: Timestamp
    expiresAt?: Timestamp // Opcional: si el acceso expira
    isActive: boolean
    paymentId?: string // ID de la transacción de pago
}

// Modelo Project
export interface Project extends FirestoreDocument {
    name: string
    description?: string
    userId: string
    isActive: boolean
}

// Modelo Chat
export interface Chat extends FirestoreDocument {
    title?: string
    userId: string
    agentId: string
    projectId?: string
    isActive: boolean
    messageCount: number // Para optimizar consultas
    lastMessageAt?: Timestamp
}

// Modelo Message
export interface Message extends FirestoreDocument {
    content: string
    role: MessageRole
    chatId: string
    userId: string // Para facilitar consultas
    isActive: boolean // Agregado para soft deletes
    metadata?: {
        tokens?: number
        model?: string
        processingTime?: number
        [key: string]: unknown // Para flexibilidad adicional
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
    project?: Project
    messages?: Message[]
}

export interface ChatWithMessages extends Chat {
    messages: Message[]
}

export interface UserWithAgents extends User {
    availableAgents: AgentWithCategory[]
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
    projectId?: string
    [key: string]: unknown
}

export interface CreateMessageRequest {
    content: string
    role: MessageRole
    chatId: string
    metadata?: {
        tokens?: number
        model?: string
        processingTime?: number
        [key: string]: unknown
    }
    [key: string]: unknown
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

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number
        limit: number
        total: number
        hasNext: boolean
        hasPrev: boolean
    }
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
    projectId?: string
    isActive?: boolean
}

export interface MessageQueryParams extends PaginationParams {
    chatId?: string
    userId?: string
    role?: MessageRole
}

// Utilidades para Firestore
export interface FirestoreQueryOptions {
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
