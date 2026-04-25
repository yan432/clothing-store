import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const MAINTENANCE = process.env.MAINTENANCE_MODE === 'true'

// Server-only (no NEXT_PUBLIC_) — не виден в клиентском коде
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // Пропускаем статику и системные пути
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // favicon, images, etc.
  ) {
    return NextResponse.next()
  }

  // Если maintenance mode выключен — пропускаем всё
  if (!MAINTENANCE) return NextResponse.next()

  // Страница /maintenance и /auth всегда доступны
  if (pathname.startsWith('/maintenance') || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Проверяем Supabase сессию на сервере
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // read-only в middleware — ничего не пишем
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAdmin =
    user &&
    (user.app_metadata?.role === 'admin' ||
      ADMIN_EMAILS.includes(user.email?.toLowerCase()))

  if (isAdmin) return NextResponse.next()

  // Не админ → на страницу обслуживания
  return NextResponse.redirect(new URL('/maintenance', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
