import { updateUser } from '../../repository/userRepository'
import type { ApiResponse, User } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
    try {
        const userId = getRouterParam(event, 'id')
        const body = await readBody(event)

        if (!userId) {
            return {
                success: false,
                message: 'ID de usuario requerido',
                error: 'No se proporcionó el ID del usuario'
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

        // Preparar datos de actualización (excluir campos inmutables)
        const updateData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'email'>> = {}

        if (body.name !== undefined) {
            updateData.name = body.name?.trim() || null
        }
        if (body.avatar !== undefined) {
            updateData.avatar = body.avatar?.trim() || undefined
        }
        if (body.provider !== undefined) {
            updateData.provider = body.provider
        }
        if (body.isActive !== undefined) {
            updateData.isActive = Boolean(body.isActive)
        }
        if (body.subscription !== undefined) {
            updateData.subscription = body.subscription
        }

        // Actualizar el usuario
        const updatedUser = await updateUser(userId, updateData)

        if (!updatedUser) {
            return {
                success: false,
                message: 'Error al actualizar',
                error: 'No se pudo actualizar el usuario'
            }
        }

        return {
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: updatedUser
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
            if (error.message.includes('Usuario no encontrado')) {
                return {
                    success: false,
                    message: 'Usuario no encontrado',
                    error: error.message
                }
            }
        }

        return {
            success: false,
            message: 'Error al actualizar el usuario',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
