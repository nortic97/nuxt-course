import { defineEventHandler } from 'h3'
import { logger } from '../utils/logger'

export default defineEventHandler((event) => {
  // Registrar la petición
  logger.logRequest(event)
  
  // Registrar el tiempo de respuesta
  const start = Date.now()
  
  // Registrar cuando la respuesta se ha completado
  event.node.res.on('finish', () => {
    const responseTime = Date.now() - start
    const { statusCode } = event.node.res
    
    logger.info('Response', {
      statusCode,
      responseTime: `${responseTime}ms`,
      url: event.node.req.url,
      method: event.node.req.method
    })
  })
  
  // Continuar con el resto del manejo de la petición
})
