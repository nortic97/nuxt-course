import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const url = event.node.req.url
  const method = event.node.req.method
  const headers = event.node.req.headers

  // Solo registrar peticiones que no sean de assets
  if (url && !url.includes('_nuxt') && !url.includes('__nuxt_devtools__')) {
    console.log('Request:', {
      timestamp: new Date().toISOString(),
      url,
      method,
      path: event.path,
      userAgent: headers['user-agent'],
      ip: event.node.req.socket.remoteAddress
    })
  }
})
