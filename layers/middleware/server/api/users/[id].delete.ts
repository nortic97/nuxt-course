import { deactivateUser } from '../../repository/userRepository'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
    try {
        const userId = getRouterParam(event, 'id')

        if (!userId) {
            return {
                success: false,
                message: 'ID de usuario requerido',
                error: 'No se proporcionó el ID del usuario'
            }
        }

        // Desactivar el usuario (soft delete)
        await deactivateUser(userId)

        return {
            success: true,
            message: 'Usuario desactivado exitosamente',
            data: null
        }
    } catch (error) {
        console.error('Error al desactivar usuario:', error)

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
            message: 'Error al desactivar el usuario',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
