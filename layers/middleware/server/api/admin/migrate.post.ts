import { migrateAllCollections } from '../../utils/migration.helpers'
import type { ApiResponse } from '../../types/types'

export default defineEventHandler(async (): Promise<ApiResponse<null>> => {
    try {
        // ⚠️ SOLO PARA DESARROLLO - En producción agregar autenticación admin
        const isDevelopment = process.env.NODE_ENV === 'development'

        if (!isDevelopment) {
            return {
                success: false,
                message: 'Endpoint solo disponible en desarrollo',
                error: 'Esta operación solo está permitida en modo desarrollo'
            }
        }

        await migrateAllCollections()

        return {
            success: true,
            message: 'Migración completada exitosamente',
            data: null
        }
    } catch (error) {
        console.error('Error en migración:', error)
        return {
            success: false,
            message: 'Error en la migración',
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
})
