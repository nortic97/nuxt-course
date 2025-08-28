import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getUserById } from '../layers/base/server/repository/userRepository'
import { server } from './setup'
import { http, HttpResponse } from 'msw'

const TEST_USER_ID = '26ecdc45-a0a3-4048-8535-acfcd10c228c'
const TEST_USER = {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Usuario de Prueba',
    isActive: true,
    provider: 'email',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subscription: {
        plan: 'free',
        expiresAt: null
    }
}

describe('User Repository - getUserById', () => {
    beforeAll(() => {
        // Configurar el manejador para la rta de la API
        server.use(
            http.get(`http://localhost:3000/api/users/${TEST_USER_ID}`, () => {
                return HttpResponse.json({
                    success: true,
                    message: 'Usuario obtenido exitosamente',
                    data: TEST_USER
                }, { status: 200 })
            })
        )
    })

    afterEach(() => {
        server.resetHandlers()
    })

    afterAll(() => {
        server.close()
    })

    it('debe devolver un usuario existente', async () => {
        const user = await getUserById(TEST_USER_ID)

        expect(user).not.toBeNull()
        expect(user).toHaveProperty('id', TEST_USER_ID)
        expect(user).toHaveProperty('email', 'nortic97@gmail.com')
        expect(user).toHaveProperty('name', 'Nortic Servicio Tecnico')
    })

})
