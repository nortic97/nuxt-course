import { createAgentCategory } from '../../repository/agentCategoryRepository'
import type { ApiResponse, AgentCategory, CreateAgentCategoryRequest } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<AgentCategory>> => {
    try {
        const body = await readBody(event) as CreateAgentCategoryRequest

        // Validar que se envió el body
        if (!body) {
            return {
                success: false,
                message: 'Datos requeridos',
                error: 'No se enviaron datos en el cuerpo de la petición'
            }
        }

        // Validar campos requeridos
        if (!body.name || body.name.trim() === '') {
            return {
                success: false,
                message: 'El nombre es requerido',
                error: 'El campo name es obligatorio'
            }
        }

        // Limpiar y validar datos
        const categoryData: CreateAgentCategoryRequest = {
            name: body.name.trim(),
            description: body.description?.trim() || undefined
        }

        // Crear la categoría
        const newCategory = await createAgentCategory(categoryData)

        return {
            success: true,
            message: 'Categoría creada exitosamente',
            data: newCategory
        }
    } catch (error) {
        console.error('Error al crear categoría:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('Ya existe una categoría')) {
                return {
                    success: false,
                    message: 'Categoría duplicada',
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
        }

        return {
            success: false,
            message: 'Error al crear la categoría',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
