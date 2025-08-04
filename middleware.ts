import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>()

// Security middleware
export function middleware(request: NextRequest) {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  
  // Basic rate limiting
  const now = Date.now()
  const rateLimitEntry = rateLimitMap.get(ip)
  
  if (rateLimitEntry) {
    // Reset counter if more than 1 minute has passed
    if (now - rateLimitEntry.lastRequest > 60000) {
      rateLimitEntry.count = 1
      rateLimitEntry.lastRequest = now
    } else {
      rateLimitEntry.count++
    }
    
    // Block if more than 100 requests per minute
    if (rateLimitEntry.count > 100) {
      return new NextResponse('Rate limit exceeded', { status: 429 })
    }
  } else {
    rateLimitMap.set(ip, { count: 1, lastRequest: now })
  }
  
  const response = NextResponse.next()
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  
  // Add HSTS header for HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Block access to sensitive files and directories
  const pathname = request.nextUrl.pathname
  const blockedPaths = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.development',
    '/config',
    '/logs',
    '/.git',
    '/admin',
    '/phpmyadmin',
    '/wp-admin',
    '/wp-login.php',
    '/wp-config.php',
    '/.htaccess',
    '/robots.txt',
    '/sitemap.xml'
  ]
  
  // Block suspicious file extensions
  const blockedExtensions = [
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.cgi',
    '.pl',
    '.py',
    '.rb',
    '.sh',
    '.bat',
    '.exe',
    '.dll',
    '.so'
  ]
  
  for (const path of blockedPaths) {
    if (pathname.startsWith(path)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }
  
  for (const ext of blockedExtensions) {
    if (pathname.endsWith(ext)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }
  
  // Block common attack patterns
  const attackPatterns = [
    /\.\./,  // Directory traversal
    /union.*select/i,  // SQL injection
    /<script/i,  // XSS
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code injection
    /exec\(/i,  // Command injection
    /system\(/i,  // System command injection
    /passwd/i,  // System file access
    /etc\/passwd/i,  // Linux password file
    /boot\.ini/i,  // Windows boot file
    /win\.ini/i,  // Windows config file
  ]
  
  const fullUrl = request.nextUrl.href
  for (const pattern of attackPatterns) {
    if (pattern.test(fullUrl)) {
      return new NextResponse('Bad Request', { status: 400 })
    }
  }
  
  // Additional security for API routes
  if (pathname.startsWith('/api/')) {
    // Ensure API routes have proper content type
    const contentType = request.headers.get('content-type')
    if (request.method === 'POST' && contentType && !contentType.includes('application/json')) {
      return new NextResponse('Invalid Content-Type', { status: 400 })
    }
    
    // Block requests without proper origin (except for development)
    if (process.env.NODE_ENV === 'production') {
      const origin = request.headers.get('origin')
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NEXT_PUBLIC_API_URL
      ].filter(Boolean)
      
      if (origin && !allowedOrigins.includes(origin)) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }
    
    // Add no-cache headers for API responses
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  
  // Clean up old rate limit entries (simple cleanup)
  if (rateLimitMap.size > 10000) {
    const cutoff = now - 300000 // 5 minutes ago
    const keysToDelete: string[] = []
    
    rateLimitMap.forEach((value, key) => {
      if (value.lastRequest < cutoff) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      rateLimitMap.delete(key)
    })
  }
  
  return response
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
