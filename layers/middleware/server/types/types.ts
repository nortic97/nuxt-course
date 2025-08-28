import type { Timestamp } from 'firebase-admin/firestore'

// Base types for Firestore
export interface DocumentBase {
    id: string
    createdAt: Date | Timestamp
    updatedAt: Date | Timestamp
    isActive: boolean
}

// User model (compatible with auth layer)
export interface User extends DocumentBase {
    email: string
    name?: string | null
    avatar?: string
    provider?: 'google' | 'github' // Added for auth compatibility
    // Additional fields for the agent system
    subscription?: {
        plan: 'free' | 'premium' | 'enterprise'
        expiresAt?: Timestamp
    }
}

// AgentCategory model
export interface AgentCategory extends DocumentBase {
    name: string
    description: string
    icon?: string // Icon for the UI
    order?: number // Display order
}

// Agent model
export interface Agent extends DocumentBase {
    name: string
    description: string
    price: number
    categoryId: string
    isActive: boolean
    model: string // e.g., "gpt-4", "claude-3"
    capabilities: string[] // e.g., ["text", "image", "code"]
    systemPrompt: string // Agent's base prompt
    temperature?: number
    maxTokens?: number
    isFree: boolean // If available in the free plan
    icon?: string // Icon for the UI
    tags?: string[] // Tags for filtering
}

// UserAgent model (many-to-many relationship)
export interface UserAgent extends DocumentBase {
    userId: string
    agentId: string
    purchasedAt: Timestamp
    expiresAt?: Timestamp // Optional: if access expires
    isActive: boolean
    paymentId?: string // Payment transaction ID
    usage: {
        messageCount: number
        lastUsedAt: Timestamp
    }
}

// Chat model
export interface Chat extends DocumentBase {
    title?: string
    userId: string
    agentId: string
    messageCount: number
    lastMessageAt?: Date | Timestamp | null
    isActive: boolean
}

// Message model
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

// Types with populated data (for API responses)
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

// Types for UserAgent
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

// DTOs for requests
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
    initialMessage?: string // Optional initial message
    tags?: string[] // Optional tags for the chat
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

// API Responses
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

// Query parameters
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
    tag?: string // Filter by tag
    isPinned?: boolean // Only pinned chats
}

export interface MessageQueryParams extends PaginationParams {
    chatId?: string
    userId?: string
    role?: MessageRole
}

// Response for user and agent messages
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

// Utilities for Firestore
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
