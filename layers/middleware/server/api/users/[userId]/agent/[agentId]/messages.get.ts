import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { getMessagesByUserAndAgent } from '../../../../../repository/messageRepository'
import { getAgentById } from '../../../../../repository/agentRepository'
import { checkUserAgentAccess } from '../../../../../repository/userAgentRepository'
import type { ApiResponse, Message } from '../../../../../types/types'

interface MessagesResponse {
    messages: Message[]
    agent: {
        id: string
        name: string
        description: string
        model: string
        isFree: boolean
    }
    chats: Array<{ id: string; title?: string; messageCount: number }>
    pagination: {
        page: number
        limit: number
        total: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export default defineEventHandler(async (event): Promise<ApiResponse<MessagesResponse>> => {
    try {
        const userId = getRouterParam(event, 'userId')
        const agentId = getRouterParam(event, 'agentId')
        const query = getQuery(event)

        // Validate required parameters
        if (!userId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'User ID is required'
            })
        }

        if (!agentId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Agent ID is required'
            })
        }

        // Verify that the user has access to the agent
        const accessCheck = await checkUserAgentAccess(userId, agentId)
        if (!accessCheck.hasAccess) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have access to this agent',
                data: { reason: accessCheck.reason }
            })
        }

        // Get agent information
        const agent = await getAgentById(agentId)
        if (!agent) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Agent not found'
            })
        }

        // Get query parameters
        const {
            page = 1,
            limit = 50,
            orderBy = 'createdAt',
            orderDirection = 'desc'
        } = query

        // Get messages from the user with the agent
        const result = await getMessagesByUserAndAgent(userId, agentId, {
            page: Number(page),
            limit: Number(limit),
            orderBy: String(orderBy),
            orderDirection: orderDirection as 'asc' | 'desc'
        })

        const response: MessagesResponse = {
            messages: result.documents,
            agent: {
                id: agent.id,
                name: agent.name,
                description: agent.description,
                model: agent.model,
                isFree: agent.isFree
            },
            chats: result.chats,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev
            }
        }

        return {
            success: true,
            message: 'Messages retrieved successfully',
            data: response
        }

    } catch (error: unknown) {
        console.error('Error getting messages by user and agent:', error)

        // If it is an H3 error, propagate it
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error
        }

        // Generic error
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        })
    }
})