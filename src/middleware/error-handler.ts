import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger-adaptive'
import { randomBytes } from 'crypto'

export interface APIError {
  message: string
  code?: string
  statusCode: number
  requestId: string
  timestamp: string
  path: string
  method: string
  stack?: string
  metadata?: Record<string, any>
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code?: string
  public readonly isOperational: boolean
  public readonly metadata?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.metadata = metadata

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, metadata)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(`Database error: ${message}`, 500, 'DATABASE_ERROR', true, {
      originalError: originalError?.message,
      stack: originalError?.stack
    })
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode: number = 503) {
    super(`${service} service error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', true, {
      service
    })
  }
}

// Middleware to add request ID and error handling
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = randomBytes(16).toString('hex')
    const startTime = Date.now()
    
    // Add request ID to headers for tracking
    req.headers.set('x-request-id', requestId)
    
    try {
      logger.api(`${req.method} ${req.nextUrl.pathname}`, {
        requestId,
        userAgent: req.headers.get('user-agent'),
        ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown'
      })
      
      const response = await handler(req, context)
      
      const duration = Date.now() - startTime
      
      logger.api(`${req.method} ${req.nextUrl.pathname} completed`, {
        requestId,
        statusCode: response.status,
        duration: `${duration}ms`
      })
      
      // Add request ID to response headers
      response.headers.set('x-request-id', requestId)
      
      return response
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      return handleError(error, req, requestId, duration)
    }
  }
}

export function handleError(
  error: unknown,
  req: NextRequest,
  requestId: string,
  duration?: number
): NextResponse {
  const timestamp = new Date().toISOString()
  const path = req.nextUrl.pathname
  const method = req.method
  
  let apiError: APIError
  
  if (error instanceof AppError) {
    // Our custom application errors
    apiError = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId,
      timestamp,
      path,
      method,
      metadata: error.metadata
    }
    
    if (error.statusCode >= 500) {
      logger.error(`API Error: ${error.message}`, {
        category: 'API',
        error,
        requestId,
        metadata: {
          path,
          method,
          statusCode: error.statusCode,
          code: error.code,
          duration: duration ? `${duration}ms` : undefined,
          ...error.metadata
        }
      })
    } else {
      logger.warn(`API Warning: ${error.message}`, {
        category: 'API',
        requestId,
        metadata: {
          path,
          method,
          statusCode: error.statusCode,
          code: error.code,
          duration: duration ? `${duration}ms` : undefined,
          ...error.metadata
        }
      })
    }
    
  } else if (error instanceof Error) {
    // Standard JavaScript errors
    apiError = {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      requestId,
      timestamp,
      path,
      method,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }
    
    logger.error(`Unexpected error: ${error.message}`, {
      category: 'API',
      error,
      requestId,
      metadata: {
        path,
        method,
        duration: duration ? `${duration}ms` : undefined,
        type: error.constructor.name
      }
    })
    
  } else {
    // Unknown error types
    apiError = {
      message: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      requestId,
      timestamp,
      path,
      method
    }
    
    logger.error('Unknown error type encountered', {
      category: 'API',
      requestId,
      metadata: {
        path,
        method,
        duration: duration ? `${duration}ms` : undefined,
        error: String(error)
      }
    })
  }
  
  // Create error response
  const response = NextResponse.json(
    {
      error: {
        message: apiError.message,
        code: apiError.code,
        requestId: apiError.requestId,
        timestamp: apiError.timestamp
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          path: apiError.path,
          method: apiError.method,
          stack: apiError.stack,
          metadata: apiError.metadata
        }
      })
    },
    { status: apiError.statusCode }
  )
  
  // Add error headers
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-error-code', apiError.code || 'UNKNOWN')
  
  return response
}

// Global error boundary for API routes
export function createErrorBoundary() {
  return {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    DatabaseError,
    ExternalServiceError,
    withErrorHandler,
    handleError
  }
}

// Utility function to wrap API handlers
export function apiRoute(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withErrorHandler(handler)
}

// Helper function to validate request data
export function validateRequest<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  errorMessage: string = 'Invalid request data'
): T {
  if (!validator(data)) {
    throw new ValidationError(errorMessage, { received: data })
  }
  return data
}

// Helper function to handle database operations
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Error) {
      // Check for common Prisma errors
      if (error.message.includes('Unique constraint')) {
        throw new ValidationError('Resource already exists', {
          originalError: error.message,
          context
        })
      }
      
      if (error.message.includes('Record to update not found')) {
        throw new NotFoundError(context || 'Record')
      }
      
      if (error.message.includes('Foreign key constraint')) {
        throw new ValidationError('Invalid reference to related resource', {
          originalError: error.message,
          context
        })
      }
    }
    
    throw new DatabaseError(
      context ? `${context} operation failed` : 'Database operation failed',
      error instanceof Error ? error : undefined
    )
  }
}