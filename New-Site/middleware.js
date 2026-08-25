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
import { SHORT_NOTICE } from '@/lib/authorship'
import { CANONICAL_HOST } from '@/lib/siteConfig'

/*
 * X-Author on every response, per ~/.claude/rules/attribution.md.
 *
 * The only mark that reaches assets with no HTML in them, images, fonts, and
 * JSON endpoints. Some edge configs strip unknown headers, so it is verified
 * after deploy rather than assumed.
 *
 * X-Robots-Tag on anything that is not the live domain. Preview and
 * *.vercel.app deploys serve the same pages, and without this Google indexes a
 * second copy of the whole site and splits the ranking with the real one. The
 * header is used rather than robots.txt alone because a disallowed url can
 * still be indexed when something links to it.
 */
function withHeaders(response, host) {
  const target = response || new Response(null)
  target.headers?.set('X-Author', SHORT_NOTICE)

  if (host !== CANONICAL_HOST) {
    target.headers?.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return target
}

export default auth((request) => {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // The sign in page itself must stay reachable or nobody can ever get in
  if (pathname === '/admin/signin') return withHeaders(NextResponse.next(), host)

  if (pathname.startsWith('/admin')) {
    // Development only, see lib/admin/session.js. Cannot hold in a build.
    if (devAuthBypassEnabled()) return withHeaders(NextResponse.next(), host)

    if (!request.auth?.user?.isAuthorised) {
      const signInUrl = new URL('/admin/signin', request.nextUrl.origin)
      // Carry the intended destination so sign in returns them to it, and
      // only ever as a path so this cannot be turned into an open redirect
      signInUrl.searchParams.set('next', pathname)
      return withHeaders(NextResponse.redirect(signInUrl), host)
    }
  }

  /* Every other request, which is the whole public site */
  return withHeaders(NextResponse.next(), host)
})

export const config = {
  /*
   * Every page and route, so the build credit header rides on all of them.
   * The auth check inside still only applies to /admin, and the cost on a
   * public request is one string comparison.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)'],
}
