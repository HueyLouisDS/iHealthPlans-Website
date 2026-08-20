/**
 * Edge middleware. Guards every /admin route behind an authenticated,
 * authorised session before any admin page or data is rendered.
 *
 * This is the outer layer only. Each admin page checks again on the server,
 * because a single guard that can be bypassed by a routing mistake is exactly
 * how admin areas leak. Defence in depth is the point, not belt and braces.
 */

import { auth } from '@/auth'
import { devAuthBypassEnabled } from '@/lib/admin/session'

export default auth((request) => {
  const { pathname } = request.nextUrl

  // The sign in page itself must stay reachable or nobody can ever get in
  if (pathname === '/admin/signin') return

  if (pathname.startsWith('/admin')) {
    // Development only, see lib/admin/session.js. Cannot hold in a build.
    if (devAuthBypassEnabled()) return

    if (!request.auth?.user?.isAuthorised) {
      const signInUrl = new URL('/admin/signin', request.nextUrl.origin)
      // Carry the intended destination so sign in returns them to it, and
      // only ever as a path so this cannot be turned into an open redirect
      signInUrl.searchParams.set('next', pathname)
      return Response.redirect(signInUrl)
    }
  }
})

export const config = {
  // Match the admin area only. Everything else is a public marketing site and
  // must not pay the cost of running auth on every request.
  matcher: ['/admin/:path*'],
}
