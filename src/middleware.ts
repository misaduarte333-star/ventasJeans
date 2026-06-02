// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // Refresca el token de Supabase en cada petición para evitar errores 403
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: [
    // Aplicar en todas las rutas excepto assets estáticos y API de Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
