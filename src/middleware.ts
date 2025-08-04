import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import logger from "@/lib/logger-adaptive"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const response = NextResponse.next()

  // Add security headers for document downloads
  if (pathname.startsWith('/api/documents') && pathname.includes('/download')) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Content-Security-Policy', "default-src 'self'")
  }

  // Add general security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Allow public paths and all API routes (API routes handle their own auth)
  if (
    pathname === '/' ||
    pathname.startsWith('/auth') || 
    pathname.startsWith('/api/') ||
    pathname.startsWith('/pending') ||
    pathname.startsWith('/admin-init') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/uploads/') ||
    pathname.endsWith('.html')
  ) {
    return response
  }

  try {
    // Get the session using simplified auth
    const session = await auth()

    // Check if user is authenticated
    if (!session) {
      logger.warn('Unauthenticated access attempt', {
        category: 'AUTH',
        metadata: { 
          path: pathname,
          userAgent: req.headers.get('user-agent'),
          ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown'
        }
      })
      
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Check if user has UNASSIGNED role - redirect to pending page
    if (session.user?.role === 'UNASSIGNED' && !pathname.startsWith('/pending')) {
      logger.info('Unassigned user redirected to pending', {
        category: 'AUTH',
        metadata: { 
          userId: session.user.id,
          path: pathname 
        }
      })
      return NextResponse.redirect(new URL('/pending', req.url))
    }

    // Check role-based access
    if (pathname.startsWith('/admin') && session.user?.role !== 'ADMINISTRATOR') {
      logger.warn('Unauthorized admin access attempt', {
        category: 'AUTH',
        metadata: { 
          userId: session.user.id,
          role: session.user.role,
          path: pathname 
        }
      })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return response
  } catch (error) {
    logger.error('Middleware auth error', {
      category: 'AUTH',
      error: error as Error,
      metadata: { 
        path: pathname,
        userAgent: req.headers.get('user-agent')
      }
    })
    
    // On auth error, redirect to signin
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes - they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public|uploads).*)",
  ],
}