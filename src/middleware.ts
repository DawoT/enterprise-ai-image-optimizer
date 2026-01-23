import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  const token = req.nextauth.token;
  const pathname = req.nextUrl.pathname;

  // Admin routes protection
  if (pathname.startsWith('/dashboard') && token?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/api/upload/:path*',
    '/api/jobs/:path*',
    '/api/admin/:path*',
  ],
};
