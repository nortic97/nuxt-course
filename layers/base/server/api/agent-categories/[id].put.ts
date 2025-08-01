import { updateAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory, UpdateAgentCategoryRequest } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
  try {
    const categoryId = getRouterParam(event, 'id')
    const body = await readBody(event) as UpdateAgentCategoryRequest

    if (!categoryId) {
      return {
        success: false,
        message: 'ID de la categoría requerido',
        error: 'No se proporcionó el ID de la categoría'
      }
    }

    // Validar que se envió el body
    if (!body) {
      return {
        success: false,
        message: 'Datos requeridos',
        error: 'No se enviaron datos en el cuerpo de la petición'
      }
    }

    // Validar nombre si se está actualizando
    if (body.name !== undefined && (!body.name || !body.name.trim())) {
      return {
        success: false,
        message: 'Nombre inválido',
        error: 'El nombre no puede estar vacío'
      }
    }

    // Limpiar y validar datos
    const updateData: UpdateAgentCategoryRequest = {}
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || undefined
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    // Actualizar la categoría
    const updatedCategory = await updateAgentCategory(categoryId, updateData)

    if (!updatedCategory) {
      return {
        success: false,
        message: 'Error al actualizar',
        error: 'No se pudo actualizar la categoría'
      }
    }

    return {
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: updatedCategory
    }
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    
    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('Categoría no encontrada')) {
        return {
          success: false,
          message: 'Categoría no encontrada',
          error: error.message
        }
      }
      
      if (error.message.includes('Ya existe una categoría')) {
        return {
          success: false,
          message: 'Categoría duplicada',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error al actualizar la categoría',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
})
