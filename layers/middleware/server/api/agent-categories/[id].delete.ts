import { deleteAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const categoryId = getRouterParam(event, 'id')

    if (!categoryId) {
      return {
        success: false,
        message: 'ID de la categoría requerido',
        error: 'No se proporcionó el ID de la categoría'
      }
    }

    // Eliminar la categoría (soft delete)
    await deleteAgentCategory(categoryId)

    return {
      success: true,
      message: 'Categoría eliminada exitosamente',
      data: null
    }
  } catch (error) {
    console.error('Error al eliminar categoría:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('Categoría no encontrada')) {
        return {
          success: false,
          message: 'Categoría no encontrada',
          error: error.message
        }
      }

      if (error.message.includes('tiene agentes activos')) {
        return {
          success: false,
          message: 'No se puede eliminar',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error al eliminar la categoría',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
})
