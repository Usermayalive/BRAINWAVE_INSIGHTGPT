import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/', '/chat', '/documents', '/history', '/upload', '/settings']

// Routes that are public only (redirect to home if authenticated)
const publicOnlyRoutes = ['/login']

export function middleware(request: NextRequest) {
    // Get token from cookie (set during login)
    const token = request.cookies.get('auth_token')?.value
    const { pathname } = request.nextUrl

    // Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    )

    // Check if the current path is public only
    const isPublicOnlyRoute = publicOnlyRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    )

    // Redirect to login if accessing protected route without token
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url)
        // Preserve the original URL to redirect back after login
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirect to dashboard if accessing login while authenticated
    if (isPublicOnlyRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    // Match all paths except static files, API routes, and special Next.js paths
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$).*)',
    ],
}
