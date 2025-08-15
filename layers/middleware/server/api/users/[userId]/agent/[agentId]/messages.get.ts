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

        // Validar parámetros requeridos
        if (!userId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'User ID es requerido'
            })
        }

        if (!agentId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Agent ID es requerido'
            })
        }

        // Verificar que el usuario tiene acceso al agente
        const accessCheck = await checkUserAgentAccess(userId, agentId)
        if (!accessCheck.hasAccess) {
            throw createError({
                statusCode: 403,
                statusMessage: 'No tienes acceso a este agente',
                data: { reason: accessCheck.reason }
            })
        }

        // Obtener información del agente
        const agent = await getAgentById(agentId)
        if (!agent) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Agente no encontrado'
            })
        }

        // Obtener parámetros de consulta
        const {
            page = 1,
            limit = 50,
            orderBy = 'createdAt',
            orderDirection = 'desc'
        } = query

        // Obtener mensajes del usuario con el agente
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
            message: 'Mensajes obtenidos exitosamente',
            data: response
        }

    } catch (error: unknown) {
        console.error('Error al obtener mensajes por usuario y agente:', error)

        // Si es un error de H3, propagarlo
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error
        }

        // Error genérico
        throw createError({
            statusCode: 500,
            statusMessage: 'Error interno del servidor',
            data: {
                message: error instanceof Error ? error.message : 'Error desconocido'
            }
        })
    }
})