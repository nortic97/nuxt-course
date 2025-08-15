import { deleteAgent } from '../../repository/agentRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const agentId = getRouterParam(event, 'id')

    if (!agentId) {
      return {
        success: false,
        message: 'ID del agente requerido',
        error: 'No se proporcionó el ID del agente'
      }
    }

    // Eliminar el agente (soft delete)
    await deleteAgent(agentId)

    return {
      success: true,
      message: 'Agente eliminado exitosamente',
      data: null
    }
  } catch (error) {
    console.error('Error al eliminar agente:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('Agente no encontrado')) {
        return {
          success: false,
          message: 'Agente no encontrado',
          error: error.message
        }
      }

      if (error.message.includes('tiene chats activos')) {
        return {
          success: false,
          message: 'No se puede eliminar',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error al eliminar el agente',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
})
