import { migrateAllCollections } from '../../utils/migration.helpers'
import type { ApiResponse } from '../../types/types'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (): Promise<ApiResponse<null>> => {
    try {
        // ⚠️ DEVELOPMENT ONLY - Add admin authentication in production
        const isDevelopment = process.env.NODE_ENV === 'development'

        if (!isDevelopment) {
            return {
                success: false,
                message: 'Endpoint only available in development',
                error: 'This operation is only allowed in development mode'
            }
        }

        await migrateAllCollections()

        return {
            success: true,
            message: 'Migration completed successfully',
            data: null
        }
    } catch (error) {
        logger.error('Migration error', error as Error, {
            endpoint: '/api/admin/migrate',
            method: 'POST'
        })
        return {
            success: false,
            message: 'Error during migration',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})
