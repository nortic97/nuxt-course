import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = [
  http.get('http://localhost:3000/api/users/:id', async ({ params }) => {
    const { id } = params

    // Mock de un usuario para pruebas
    if (id === '26ecdc45-a0a3-4048-8535-acfcd10c228c') {
      return HttpResponse.json({
        success: true,
        message: 'Usuario obtenido exitosamente',
        data: {
          id: '26ecdc45-a0a3-4048-8535-acfcd10c228c',
          email: 'nortic97@gmail.com',
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
      }, { status: 200 })
    }

    // Usuario no encontrado
    return HttpResponse.json({
      success: false,
      message: 'Usuario no encontrado',
      error: 'No existe un usuario con el ID proporcionado'
    }, { status: 404 })
  })
]
