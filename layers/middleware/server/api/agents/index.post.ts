import { createAgent } from '../../repository/agentRepository'
import type { ApiResponse, AgentWithCategory, CreateAgentRequest } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentWithCategory>> => {
    try {
        const body = await readBody(event) as CreateAgentRequest

        // Validar que se envió el body
        if (!body) {
            return {
                success: false,
                message: 'Datos requeridos',
                error: 'No se enviaron datos en el cuerpo de la petición'
            }
        }

        // Validar campos requeridos
        const requiredFields = ['name', 'price', 'categoryId']
        const missingFields = requiredFields.filter(field =>
            !body[field as keyof CreateAgentRequest] && body[field as keyof CreateAgentRequest] !== 0
        )

        if (missingFields.length > 0) {
            return {
                success: false,
                message: 'Campos requeridos faltantes',
                error: `Los siguientes campos son obligatorios: ${missingFields.join(', ')}`
            }
        }

        // Validar tipos de datos
        if (typeof body.price !== 'number' || body.price < 0) {
            return {
                success: false,
                message: 'Precio inválido',
                error: 'El precio debe ser un número mayor o igual a 0'
            }
        }

        if (!body.name.trim()) {
            return {
                success: false,
                message: 'Nombre inválido',
                error: 'El nombre no puede estar vacío'
            }
        }

        // Limpiar y validar datos
        const agentData: CreateAgentRequest = {
            name: body.name.trim(),
            description: body.description?.trim() || undefined,
            price: Number(body.price),
            categoryId: body.categoryId.trim(),
            model: body.model?.trim() || undefined,
            capabilities: Array.isArray(body.capabilities)
                ? body.capabilities.filter(cap => typeof cap === 'string' && cap.trim())
                : undefined
        }

        // Crear el agente
        const newAgent = await createAgent(agentData)

        return {
            success: true,
            message: 'Agente creado exitosamente',
            data: newAgent
        }
    } catch (error) {
        console.error('Error al crear agente:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
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

            if (error.message.includes('Campos requeridos faltantes')) {
                return {
                    success: false,
                    message: 'Datos incompletos',
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
            message: 'Error al crear el agente',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
