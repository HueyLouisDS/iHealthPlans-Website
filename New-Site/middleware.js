/**
 * Edge middleware. Guards every /admin route behind an authenticated,
 * authorised session before any admin page or data is rendered.
 *
 * This is the outer layer only. Each admin page checks again on the server,
 * because a single guard that can be bypassed by a routing mistake is exactly
 * how admin areas leak. Defence in depth is the point, not belt and braces.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { devAuthBypassEnabled } from '@/lib/admin/session'
import { AUTHOR_NAME, AUTHOR_ORG, AUTHOR_URL } from '@/lib/authorship'

/*
 * Build credit on every response. Headers are read by scrapers, crawlers, and
 * anything inspecting the network tab, and cost a visitor nothing. See
 * lib/authorship.js.
 */
function withCredit(response) {
  const target = response || new Response(null)
  target.headers?.set('X-Built-By', `${AUTHOR_NAME}, ${AUTHOR_ORG}`)
  target.headers?.set('X-Built-By-Url', AUTHOR_URL)
  return target
}

export default auth((request) => {
  const { pathname } = request.nextUrl

  // The sign in page itself must stay reachable or nobody can ever get in
  if (pathname === '/admin/signin') return withCredit(NextResponse.next())

  if (pathname.startsWith('/admin')) {
    // Development only, see lib/admin/session.js. Cannot hold in a build.
    if (devAuthBypassEnabled()) return withCredit(NextResponse.next())

    if (!request.auth?.user?.isAuthorised) {
      const signInUrl = new URL('/admin/signin', request.nextUrl.origin)
      // Carry the intended destination so sign in returns them to it, and
      // only ever as a path so this cannot be turned into an open redirect
      signInUrl.searchParams.set('next', pathname)
      return withCredit(NextResponse.redirect(signInUrl))
    }
  }

  /* Every other request, which is the whole public site */
  return withCredit(NextResponse.next())
})

export const config = {
  /*
   * Every page and route, so the build credit header rides on all of them.
   * The auth check inside still only applies to /admin, and the cost on a
   * public request is one string comparison.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)'],
}
