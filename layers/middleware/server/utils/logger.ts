import { H3Event } from 'h3'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

class Logger {
  private static instance: Logger
  private isProduction: boolean
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }
  private currentLogLevel: number

  private constructor() {
    // In production, only show warn and error by default
    this.isProduction = process.env.NODE_ENV === 'production'
    this.currentLogLevel = this.isProduction 
      ? this.logLevels.warn 
      : this.logLevels.debug
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = this.logLevels[level]
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.currentLogLevel
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, level, message, ...context }
    return JSON.stringify(logEntry, null, this.isProduction ? 0 : 2)
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error ? { 
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        } 
      } : {}
      
      console.error(this.formatMessage('error', message, { 
        ...errorContext, 
        ...context 
      }))
    }
  }

  public logRequest(event: H3Event): void {
    const url = event.node.req.url
    const method = event.node.req.method
    const headers = event.node.req.headers

    // Do not log requests for assets and development tools
    if (url && !url.includes('_nuxt') && !url.includes('__nuxt_devtools__')) {
      this.info('Request', {
        url,
        method,
        path: event.path,
        userAgent: headers['user-agent'],
        ip: event.node.req.socket.remoteAddress,
        host: headers.host,
        referer: headers.referer
      })
    }
  }
}

export const logger = Logger.getInstance()

// Helper to use in components
// @ts-ignore - Nuxt auto-imports
// eslint-disable-next-line
const useLogger = () => logger

export { useLogger }
