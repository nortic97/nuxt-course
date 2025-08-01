import { createUserAgent } from '../../repository/userAgentRepository'
import type { ApiResponse, UserAgent } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<UserAgent>> => {
    try {
        const body = await readBody(event)

        // Validar que se envió el body
        if (!body) {
            return {
                success: false,
                message: 'Datos requeridos',
                error: 'No se enviaron datos en el cuerpo de la petición'
            }
        }

        // Validar campos requeridos
        if (!body.userId || !body.agentId) {
            return {
                success: false,
                message: 'Datos requeridos faltantes',
                error: 'userId y agentId son obligatorios'
            }
        }

        // Preparar datos
        const userAgentData = {
            userId: body.userId.trim(),
            agentId: body.agentId.trim(),
            paymentId: body.paymentId?.trim() || undefined,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
        }

        // Validar fecha de expiración si se proporciona
        if (userAgentData.expiresAt && userAgentData.expiresAt <= new Date()) {
            return {
                success: false,
                message: 'Fecha de expiración inválida',
                error: 'La fecha de expiración debe ser futura'
            }
        }

        // Crear el acceso
        const newUserAgent = await createUserAgent(userAgentData)

        return {
            success: true,
            message: 'Acceso al agente creado exitosamente',
            data: newUserAgent
        }
    } catch (error) {
        console.error('Error al crear acceso:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('ya tiene acceso activo')) {
                return {
                    success: false,
                    message: 'Acceso duplicado',
                    error: error.message
                }
            }

            if (error.message.includes('no existe o no está activo')) {
                return {
                    success: false,
                    message: 'Usuario o agente inválido',
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
            message: 'Error al crear el acceso al agente',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
