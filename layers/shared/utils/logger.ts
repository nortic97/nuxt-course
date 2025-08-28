// shared/logger.ts - Client and server compatible logger

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

class UniversalLogger {
  private static instance: UniversalLogger
  private isProduction: boolean
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }
  private currentLogLevel: number

  private constructor() {
    // @ts-ignore - process.env is valid in Nuxt
    this.isProduction = process.env.NODE_ENV === 'production'
    this.currentLogLevel = this.isProduction 
      ? this.logLevels.warn 
      : this.logLevels.debug
  }

  public static getInstance(): UniversalLogger {
    if (!UniversalLogger.instance) {
      UniversalLogger.instance = new UniversalLogger()
    }
    return UniversalLogger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.currentLogLevel
  }

  private log(level: LogLevel, message: string, context: LogContext = {}) {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    }

    // In development, we show logs with colors
    if (!this.isProduction) {
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
        reset: '\x1b[0m'   // Reset
      }
      
      console[level](
        `${colors[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`,
        Object.keys(context).length ? context : ''
      )
    } else {
      // In production, we use the appropriate console method
      const consoleMethod = console[level] || console.log
      consoleMethod(`[${timestamp}] ${level.toUpperCase()}:`, message, context)
    }
  }

  debug(message: string, context: LogContext = {}) {
    this.log('debug', message, context)
  }

  info(message: string, context: LogContext = {}) {
    this.log('info', message, context)
  }

  warn(message: string, context: LogContext = {}) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context: LogContext = {}) {
    const errorContext = error 
      ? { 
          ...context, 
          error: {
            message: error.message,
            stack: error.stack,
            ...(error as any).response?.data && { response: (error as any).response.data }
          }
        } 
      : context
    
    this.log('error', message, errorContext)
  }
}

export const logger = UniversalLogger.getInstance()

// Helper to use in components
export const useLogger = () => {
  return logger
}

export default logger
