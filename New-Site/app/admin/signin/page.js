/**
 * Admin sign in, /admin/signin.
 * The only page under /admin that middleware lets through unauthenticated,
 * because otherwise nobody could ever get in.
 *
 * Google Workspace only. There is no password field here by design, so there
 * is no password for this application to store, leak, or get wrong.
 */

import { signIn } from '@/auth'

export const metadata = {
  title: 'Sign in | iHealth Plans',
  // Never index any part of the admin area
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Google's mark, inlined. The button must carry it to be recognisable, and
 * loading a remote asset on the sign in page is an unnecessary dependency.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6 flex-shrink-0" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.5 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

/**
 * Human readable text for the errors Auth.js can hand back.
 * AccessDenied is the one that will actually happen, and it means the account
 * signed in successfully at Google but is not on the allowlist. Saying that
 * plainly saves a support call.
 */
function errorMessage(code) {
  if (!code) return null
  if (code === 'AccessDenied') {
    return 'That account is not authorised for the reporting area. Access is limited to specific members of the management team. If you think you should have access, ask an administrator to add your address.'
  }
  return 'Something went wrong signing in. Please try again.'
}

export default async function AdminSignInPage({ searchParams }) {
  const params = await searchParams
  const error = errorMessage(params?.error)

  // Only ever accept a path, never a full url, so this cannot be used to
  // bounce someone to another origin after a successful sign in
  const requested = String(params?.next || '')
  const redirectTo = requested.startsWith('/admin') ? requested : '/admin'

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border rounded-xl p-10 flex flex-col items-start">
        <p className="text-sm font-bold uppercase tracking-[1.2px] text-ihealthGreen mb-2">
          iHealth Plans
        </p>
        <h1 className="text-3xl font-bold text-ihealthBlue mb-3">Reporting sign in</h1>
        <p className="text-lg text-[#505258] mb-8">
          Sign in with your iHealth Plans Google Workspace account. Access is limited to the
          management team.
        </p>

        {error && (
          <div role="alert" className="w-full mb-6 border-l-4 border-l-red-500 bg-red-50 px-5 py-4 rounded-r-lg">
            <p className="text-base text-red-900">{error}</p>
          </div>
        )}

        <form
          className="w-full"
          action={async () => {
            'use server'
            await signIn('google', { redirectTo })
          }}
        >
          <button
            type="submit"
            className="w-full h-14 px-6 rounded-lg bg-ihealthGreen text-white text-lg font-semibold flex items-center justify-center gap-3 hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
          >
            <span className="bg-white rounded-full p-1 flex items-center justify-center">
              <GoogleMark />
            </span>
            Sign in with Google
          </button>
        </form>

        <p className="text-sm text-[#6C7381] mt-6">
          This area contains lead and call records. Sessions end after 8 hours.
        </p>
      </div>
    </main>
  )
}
