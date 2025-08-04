// Global error handler for catching unhandled errors
import { NextResponse } from 'next/server';

// Global error logging utility
export function setupGlobalErrorHandlers() {
  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', {
      reason,
      promise,
      stack: reason instanceof Error ? reason.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
    });
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
  });

  // Catch process warnings
  process.on('warning', (warning) => {
    console.warn('⚠️ PROCESS WARNING:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      timestamp: new Date().toISOString(),
    });
  });

  // Log process exit
  process.on('exit', (code) => {
    console.log('🔚 PROCESS EXIT:', {
      code,
      timestamp: new Date().toISOString(),
    });
  });

  // Log SIGTERM
  process.on('SIGTERM', () => {
    console.log('📡 SIGTERM received, shutting down gracefully');
  });

  // Log SIGINT
  process.on('SIGINT', () => {
    console.log('📡 SIGINT received, shutting down gracefully');
  });
}

// API route error wrapper
export function withErrorHandling(handler: any) {
  return async (req: any, res?: any) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('🚨 API ROUTE ERROR:', {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        timestamp: new Date().toISOString(),
      });
      
      if (res) {
        return res.status(500).json({ 
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Something went wrong'
        });
      } else {
        // For App Router (no res object)
        return NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      }
    }
  };
}

// Database operation error wrapper
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('🚨 DATABASE ERROR:', {
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      timestamp: new Date().toISOString(),
    });
    throw error; // Re-throw to maintain error flow
  }
}

// Component error boundary logging
export function logComponentError(error: Error, errorInfo: any, componentName: string) {
  console.error('🚨 COMPONENT ERROR:', {
    component: componentName,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    errorInfo,
    timestamp: new Date().toISOString(),
  });
}