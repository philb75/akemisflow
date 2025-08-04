import { NextRequest, NextResponse } from 'next/server'
import healthService from '@/lib/health'
import { apiRoute } from '@/middleware/error-handler'

export const GET = apiRoute(async (req: NextRequest) => {
  const detailed = req.nextUrl.searchParams.get('detailed') === 'true'
  
  if (detailed) {
    // Full system health check
    const health = await healthService.getSystemHealth()
    return NextResponse.json(health)
  } else {
    // Quick readiness check
    const readiness = await healthService.isSystemReady()
    
    if (readiness.ready) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'System is ready',
        version: '0.1.0',
        phase: 'Enhanced with logging and error handling'
      })
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: 'System not ready',
        issues: readiness.issues,
        version: '0.1.0'
      }, { status: 503 })
    }
  }
})

// HEAD request for simple up/down check
export const HEAD = apiRoute(async () => {
  const readiness = await healthService.isSystemReady()
  
  return new NextResponse(null, {
    status: readiness.ready ? 200 : 503
  })
})