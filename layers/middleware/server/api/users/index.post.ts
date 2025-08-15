import { createOrUpdateUser } from '../../repository/userRepository'
import type { ApiResponse, User } from '../../types/types'

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
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

        // Validar email
        if (!body.email || typeof body.email !== 'string') {
            return {
                success: false,
                message: 'Email requerido',
                error: 'El campo email es obligatorio y debe ser una cadena válida'
            }
        }

        // Crear o actualizar usuario
        const user = await createOrUpdateUser({
            id: body.id,
            email: body.email.trim().toLowerCase(),
            name: body.name || null,
            avatar: body.avatar || null,
            provider: body.provider || null
        })

        return {
            success: true,
            message: user.createdAt === user.updatedAt ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente',
            data: user
        }
    } catch (error) {
        console.error('Error al crear/actualizar usuario:', error)

        // Manejar errores específicos
        if (error instanceof Error) {
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
            message: 'Error al procesar el usuario',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
