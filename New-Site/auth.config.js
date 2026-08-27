/**
 * The half of the auth configuration that can run on the edge.
 *
 * middleware.js runs on the edge runtime, where node modules cannot load, and
 * pg is a node module. So everything the middleware needs lives here and the
 * database backed gate lives in auth.js, which middleware never imports.
 *
 * Nothing in this file may import from lib/db. If it ever does, the build
 * fails with a node module in the edge runtime, which is the whole reason the
 * file is split.
 */

import Google from 'next-auth/providers/google'

/**
 * Parses a comma separated environment variable into a lowercase set.
 * Lowercasing matters because email comparison must not be case sensitive,
 * and a case mismatch here would lock out a legitimate administrator.
 */
export function parseList(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.toLowerCase())
  )
}

export const allowedDomain = String(process.env.LH_ADMIN_ALLOWED_DOMAIN || '')
  .trim()
  .toLowerCase()

export const allowedEmails = parseList(process.env.LH_ADMIN_ALLOWED_EMAILS)

/*=======================================================
        BREAK GLASS ACCESS
========================================================*/

/*
 One address, outside the client's domain, that gets in when nobody at the
 client can. An auth problem at a non technical client can sit unresolved for
 days, and the person who can fix it is the one who built it.

 It skips the domain check and the allowlist. It does not skip Google, so the
 holder still has to prove they control that account. This is an allowlist
 entry, not a way past authentication.

 TODO remove LH_DEVELOPER_EMAIL from the deployed environment at handoff. It
 is a build and support tool. Unset means nobody gets in this way, which is
 the correct state once the client owns the site.

 Deliberately absent from lib/integrations/fields.js, so it cannot be set or
 read from the admin UI. Every use is logged, since this reads lead PII.
*/
export const developerEmail = String(process.env.LH_DEVELOPER_EMAIL || '')
  .trim()
  .toLowerCase()

/**
 * The checks that need no database, so they run anywhere.
 * Returns null when it has no opinion, meaning the caller must ask the table.
 */
export function preCheck(profile) {
  if (!profile) return false

  const email = String(profile.email || '').trim().toLowerCase()
  if (!email) return false

  // Google tells us whether it has verified the address. An unverified address
  // proves nothing about who controls it.
  if (profile.email_verified === false) return false

  /* Break glass, checked first since it is outside the domain by design */
  if (developerEmail && email === developerEmail) {
    console.warn('[admin] BREAK GLASS ACCESS by %s at %s', email, new Date().toISOString())
    return true
  }

  /*
   The domain still gates everything. admin_users cannot hold an off domain
   address because the write route refuses one, but checking here as well
   means a row inserted by hand does not become a way in.
  */
  if (!allowedDomain) return false
  if (email.split('@')[1] !== allowedDomain) return false

  return null
}

export const authConfig = {
  providers: [
    Google({
      // A hint only. It pre-filters Google's account chooser so a personal
      // account is not offered, which is a usability nicety. The real check
      // is isAuthorisedAdmin in auth.js.
      authorization: { params: { hd: allowedDomain, prompt: 'select_account' } },
    }),
  ],

  pages: {
    signIn: '/admin/signin',
    error: '/admin/signin',
  },

  session: {
    strategy: 'jwt',
    // Short by ordinary standards. This session opens lead PII and call
    // recordings, so an unattended laptop should stop being a way in within a
    // working day rather than a month.
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    /**
     * Copies the fields the admin UI needs onto the token, and nothing else.
     * The Google profile carries more than we need and none of the rest
     * should end up in a cookie.
     */
    jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email
        token.name = profile.name
        token.picture = profile.picture
        /*
         Stamped at sign in, where the signIn callback in auth.js has just
         proved it against admin_users. Nothing later can re-derive it,
         session() below runs on the edge.
        */
        token.isAuthorised = true
      }
      return token
    },

    /**
     * Edge safe, so it reads the token rather than the database. This is the
     * outer layer only, and it is stale by design between a revoke and the
     * token expiring.
     *
     * getAdminSession in lib/admin/session.js does the authoritative check on
     * every admin page, which is where a revoked account is actually stopped.
     */
    session({ session, token }) {
      session.user.email = token.email
      session.user.name = token.name
      session.user.image = token.picture
      session.user.isAuthorised = token.isAuthorised === true
      return session
    },
  },
}

export default authConfig
