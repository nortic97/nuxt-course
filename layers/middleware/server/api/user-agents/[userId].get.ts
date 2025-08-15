import { defineEventHandler, getRouterParam, createError, H3Error } from 'h3'
import { getUserAgentsByUser } from '../../repository/userAgentRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event) => {
    try {
        const userId = getRouterParam(event, 'userId')

        if (!userId) {
            const error = createError({
                statusCode: 400,
                statusMessage: 'User ID is required',
                data: {
                    code: 'MISSING_USER_ID',
                    message: 'Se requiere el ID del usuario'
                }
            })
            throw error
        }

        // Obtener agentes del usuario con sus detalles
        const userAgents = await getUserAgentsByUser(userId, {
            activeOnly: true,
            includeAgentData: true
        })

        // Definir tipo para agentes agrupados por categoría
        interface AgentWithUserData {
            id: string
            name: string
            description: string
            price: number
            model: string
            isFree: boolean
            userAgentId: string
            purchasedAt: Date | FirebaseFirestore.Timestamp
            expiresAt?: Date | FirebaseFirestore.Timestamp
            usage: {
                messageCount: number
                lastUsedAt: Date | FirebaseFirestore.Timestamp
            }
        }

        interface CategoryGroup {
            category: {
                id: string
                name: string
                description?: string
                icon?: string
                order?: number
            }
            agents: AgentWithUserData[]
        }

        // Agrupar agentes por categoría
        const agentsByCategory: Record<string, CategoryGroup> = {}

        for (const userAgent of userAgents) {
            if (userAgent.agent && userAgent.agent.category) {
                const categoryId = userAgent.agent.categoryId

                if (!agentsByCategory[categoryId]) {
                    agentsByCategory[categoryId] = {
                        category: {
                            id: userAgent.agent.category.id || categoryId,
                            name: userAgent.agent.category.name || 'Sin categoría',
                            description: userAgent.agent.category.description,
                            icon: userAgent.agent.category.icon,
                            order: (userAgent.agent.category as { order?: number })?.order || 999
                        },
                        agents: []
                    }
                }

                agentsByCategory[categoryId].agents.push({
                    id: userAgent.agent.id,
                    name: userAgent.agent.name,
                    description: userAgent.agent.description,
                    price: userAgent.agent.price,
                    model: userAgent.agent.model,
                    isFree: userAgent.agent.isFree,
                    userAgentId: userAgent.id,
                    purchasedAt: userAgent.purchasedAt,
                    expiresAt: userAgent.expiresAt,
                    usage: userAgent.usage
                })
            }
        }

        // Convertir el objeto a array y ordenar por category.order
        const categories = Object.values(agentsByCategory)
            .sort((a, b) => (a.category.order || 999) - (b.category.order || 999))

        const response: ApiResponse<typeof categories> = {
            success: true,
            message: 'User agents retrieved successfully',
            data: categories
        }

        return response

    } catch (error: unknown) {
        // Si ya es un error de H3, lo propagamos
        if (error instanceof H3Error) {
            throw error
        }

        // Si es otro tipo de error, lo convertimos a H3Error
        const statusCode = (error as { statusCode?: number })?.statusCode || 500;
        const h3Error = createError({
            statusCode,
            statusMessage: 'Error al recuperar los agentes del usuario',
            data: {
                code: 'USER_AGENTS_RETRIEVAL_ERROR',
                message: (error as Error).message || 'Ocurrió un error al recuperar los agentes del usuario',
                stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
            }
        })

        throw h3Error
    }
})
