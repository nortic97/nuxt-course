import { getAgentById, checkUserCanUseAgent } from '../../repository/agentRepository'
import type { ApiResponse, AgentWithCategory } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentWithCategory & { canUse?: boolean }>> => {
    try {
        const agentId = getRouterParam(event, 'id')
        const query = getQuery(event)
        const { userId } = query

        if (!agentId) {
            return {
                success: false,
                message: 'ID del agente requerido',
                error: 'No se proporcionó el ID del agente'
            }
        }

        // Obtener el agente
        const agent = await getAgentById(agentId)

        if (!agent) {
            return {
                success: false,
                message: 'Agente no encontrado',
                error: 'No existe un agente con el ID proporcionado'
            }
        }

        // Si se proporciona userId, verificar si puede usar el agente
        let canUse: boolean | undefined
        if (userId && typeof userId === 'string') {
            canUse = await checkUserCanUseAgent(userId, agentId)
        }

        return {
            success: true,
            message: 'Agente obtenido exitosamente',
            data: {
                ...agent,
                ...(canUse !== undefined && { canUse })
            }
        }
    } catch (error) {
        console.error('Error al obtener agente:', error)
        return {
            success: false,
            message: 'Error al obtener el agente',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
