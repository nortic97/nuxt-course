import { updateAgent } from '../../repository/agentRepository'
import type { ApiResponse, AgentWithCategory, UpdateAgentRequest } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentWithCategory>> => {
  try {
    const agentId = getRouterParam(event, 'id')
    const body = await readBody(event) as UpdateAgentRequest

    if (!agentId) {
      return {
        success: false,
        message: 'ID del agente requerido',
        error: 'No se proporcionó el ID del agente'
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

    // Validar precio si se está actualizando
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return {
          success: false,
          message: 'Precio inválido',
          error: 'El precio debe ser un número mayor o igual a 0'
        }
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
    const updateData: UpdateAgentRequest = {}
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || undefined
    }
    if (body.price !== undefined) {
      updateData.price = Number(body.price)
    }
    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId.trim()
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }
    if (body.model !== undefined) {
      updateData.model = body.model?.trim() || undefined
    }
    if (body.capabilities !== undefined) {
      updateData.capabilities = Array.isArray(body.capabilities) 
        ? body.capabilities.filter(cap => typeof cap === 'string' && cap.trim())
        : undefined
    }

    // Actualizar el agente
    const updatedAgent = await updateAgent(agentId, updateData)

    if (!updatedAgent) {
      return {
        success: false,
        message: 'Error al actualizar',
        error: 'No se pudo actualizar el agente'
      }
    }

    return {
      success: true,
      message: 'Agente actualizado exitosamente',
      data: updatedAgent
    }
  } catch (error) {
    console.error('Error al actualizar agente:', error)
    
    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('Agente no encontrado')) {
        return {
          success: false,
          message: 'Agente no encontrado',
          error: error.message
        }
      }
      
      if (error.message.includes('Ya existe un agente')) {
        return {
          success: false,
          message: 'Agente duplicado',
          error: error.message
        }
      }
      
      if (error.message.includes('categoría especificada no existe')) {
        return {
          success: false,
          message: 'Categoría inválida',
          error: error.message
        }
      }

      if (error.message.includes('precio no puede ser negativo')) {
        return {
          success: false,
          message: 'Precio inválido',
          error: error.message
        }
      }
    }

    return {
      success: false,
      message: 'Error al actualizar el agente',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
})
