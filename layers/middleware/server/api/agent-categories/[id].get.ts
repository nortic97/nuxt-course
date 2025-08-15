import { getAgentCategoryById } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
  try {
    const categoryId = getRouterParam(event, 'id')

    if (!categoryId) {
      return {
        success: false,
        message: 'ID de la categoría requerido',
        error: 'No se proporcionó el ID de la categoría'
      }
    }

    // Obtener la categoría
    const category = await getAgentCategoryById(categoryId)

    if (!category) {
      return {
        success: false,
        message: 'Categoría no encontrada',
        error: 'No existe una categoría con el ID proporcionado'
      }
    }

    return {
      success: true,
      message: 'Categoría obtenida exitosamente',
      data: category
    }
  } catch (error) {
    console.error('Error al obtener categoría:', error)
    return {
      success: false,
      message: 'Error al obtener la categoría',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
})
