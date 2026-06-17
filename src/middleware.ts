/**
 * Middleware de protección de rutas (NL-202). Las páginas de la app y las
 * APIs de datos requieren sesión; sin ella, las páginas redirigen a /login
 * (con `callbackUrl`) y las APIs responden 401.
 *
 * Públicas: /login, /api/auth/* (el flujo OAuth), y los estáticos (excluidos
 * por el matcher). El analyzer/historial/chat y sus APIs quedan protegidos.
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * Bypass de auth para E2E (NL-202): solo fuera de producción y con el flag
 * explícito que setea la config de Playwright. Nunca afecta a prod.
 */
// Bypass de auth para E2E: se activa con el flag explícito y NUNCA en un deploy
// real. `WEBSITE_HOSTNAME` lo setea siempre Azure App Service, así que aunque el
// flag se filtrara a las App Settings de prod, el bypass queda desactivado.
// (No usamos NODE_ENV porque el webServer de E2E corre un build de prod
// `next start` → NODE_ENV=production, y eso desactivaba el bypass.)
const E2E_BYPASS = process.env.E2E_AUTH_BYPASS === 'true' && !process.env.WEBSITE_HOSTNAME;

export default auth((req) => {
  if (E2E_BYPASS) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // El flujo de Auth.js y la pantalla de login son siempre accesibles.
  if (pathname.startsWith('/api/auth') || PUBLIC_PATHS.includes(pathname)) {
    // Si ya está logueado y entra a /login, lo mandamos al inicio.
    if (pathname === '/login' && isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isLoggedIn) return NextResponse.next();

  // API protegida sin sesión → 401 JSON (no redirect, el cliente lo maneja).
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'unauthorized', reason: 'Iniciá sesión para continuar.' },
      { status: 401 },
    );
  }

  // Página protegida sin sesión → /login con callbackUrl para volver.
  const loginUrl = new URL('/login', req.nextUrl);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  // Corre en todo excepto estáticos de Next y el favicon/icon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads).*)'],
};
