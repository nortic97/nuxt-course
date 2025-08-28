// Importa las utilidades necesarias
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

// Importa los manejadores de MSW (los definiremos en otro archivo)
import { handlers } from './mocks/handlers'

// Configura el servidor con los manejadores
export const server = setupServer(...handlers)

// Inicia el servidor antes de todas las pruebas
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Limpia todas las solicitudes después de cada prueba
// 'resetHandlers' es un método que restablece los manejadores a su estado inicial
afterEach(() => server.resetHandlers())

// Cierra el servidor después de que se completen todas las pruebas
afterAll(() => server.close())

// Asegúrate de que las variables de entorno estén configuradas
process.env.NODE_ENV = 'test'
process.env.NUXT_PUBLIC_API_BASE = 'http://localhost:3000'
