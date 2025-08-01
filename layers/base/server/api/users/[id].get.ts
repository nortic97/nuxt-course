import { getUserById } from '../../repository/userRepository'
import type { ApiResponse, User } from '../../types/firestore'

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
    try {
        const userId = getRouterParam(event, 'id')

        if (!userId) {
            return {
                success: false,
                message: 'ID de usuario requerido',
                error: 'No se proporcionó el ID del usuario'
            }
        }

        // Obtener el usuario
        const user = await getUserById(userId)

        if (!user) {
            return {
                success: false,
                message: 'Usuario no encontrado',
                error: 'No existe un usuario con el ID proporcionado'
            }
        }

        return {
            success: true,
            message: 'Usuario obtenido exitosamente',
            data: user
        }
    } catch (error) {
        console.error('Error al obtener usuario:', error)
        return {
            success: false,
            message: 'Error al obtener el usuario',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
