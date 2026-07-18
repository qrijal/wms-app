// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/setup', '/auth/callback']
const PUBLIC_API_PREFIX = '/api/auth'
const SUPERADMIN_PATHS = ['/companies', '/branches', '/warehouses', '/users']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // 1. Izinkan path publik tanpa autentikasi
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith(PUBLIC_API_PREFIX)
  ) {
    return supabaseResponse
  }

  // 2. Periksa session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 3. Ambil profil user
  const { data: profile, error } = await supabase
    .from('dim_users')
    .select('role, wh_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    const url = request.nextUrl.clone()
    url.pathname = '/setup'
    return NextResponse.redirect(url)
  }

  // 4. Proteksi berdasarkan prefix path
  const isOperatorPath = pathname.startsWith('/operator')
  const isSuperadminPath = SUPERADMIN_PATHS.some(p => pathname.startsWith(p))

  if (isOperatorPath && profile.role !== 'operator' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isSuperadminPath && profile.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Matcher ini mencakup semua rute, kecuali aset statis
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)',
  ],
}