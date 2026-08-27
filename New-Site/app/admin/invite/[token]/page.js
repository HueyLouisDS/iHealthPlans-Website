/**
 * Invite accept, /admin/invite/[token].
 *
 * The link a new administrator is sent. It is not a login link, and it cannot
 * be one, because there are no passwords anywhere in this system.
 *
 * The token proves the invite is real. Google proves who is holding it. Both
 * have to name the same address, or anyone the email was forwarded to walks
 * in. That comparison happens in acceptInvite and is the whole security of
 * this page.
 */

import Link from 'next/link'
import { auth, signIn } from '@/auth'
import { acceptInvite } from '@/lib/db/queries/adminUsers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Accept your invitation',
  // A link in a mailbox is not for a search engine
  robots: { index: false, follow: false },
}

const REASONS = {
  unknown: 'That link is not one we issued. Check it was copied in full.',
  used: 'That link has already been used. Ask for a new one.',
  expired: 'That link has expired. Ask for a new one.',
  unverified: 'Google has not verified that address, so we cannot accept it.',
  'no-database': 'The site cannot reach its database, so nothing can be confirmed right now.',
}

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4 py-16">
      <div className="bg-white border rounded-lg p-8 max-w-lg w-full flex flex-col gap-4">
        {children}
      </div>
    </main>
  )
}

export default async function AcceptInvitePage({ params }) {
  const { token } = await params
  const session = await auth()

  /*
   Not signed in yet, so there is nothing to compare the invite against. Send
   them to Google first and come straight back to this same url, which is why
   the token stays in the path rather than in a query string.
  */
  if (!session?.user?.email) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-ihealthBlue">You have been invited</h1>
        <p className="text-base text-[#505258]">
          Sign in with the Google account for the address this invitation was sent to. A different
          account will not be accepted, even with a valid link.
        </p>

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: `/admin/invite/${token}` })
          }}
        >
          <button
            type="submit"
            className="bg-ihealthGreen text-white font-bold px-6 py-3 rounded hover:brightness-95 transition"
          >
            Continue with Google
          </button>
        </form>
      </Shell>
    )
  }

  const result = await acceptInvite(token, {
    email: session.user.email,
    email_verified: true,
    name: session.user.name,
  })

  if (result.ok) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-ihealthBlue">You are set up</h1>
        <p className="text-base text-[#505258]">
          {result.email} can now open the reporting area. This link has been used and will not work
          again.
        </p>
        <Link
          href="/admin"
          className="bg-ihealthGreen text-white font-bold px-6 py-3 rounded hover:brightness-95 transition w-fit"
        >
          Open the dashboard
        </Link>
      </Shell>
    )
  }

  /*
   Named explicitly rather than folded into the generic message. Somebody
   signed into the wrong Google account is the most common failure here and
   the only one where telling them which address was expected saves a round
   trip. It is not a disclosure, they were sent the invitation.
  */
  const message =
    result.reason === 'wrong-account'
      ? `This invitation is for ${result.invited}. You are signed in as ${session.user.email}.`
      : REASONS[result.reason] || 'That invitation could not be accepted.'

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-ihealthBlue">That did not work</h1>
      <p className="text-base text-[#505258]">{message}</p>

      {result.reason === 'wrong-account' && (
        <form
          action={async () => {
            'use server'
            await signIn('google', {
              redirectTo: `/admin/invite/${token}`,
              // Force the chooser, or Google silently reuses the same account
              authorizationParams: { prompt: 'select_account' },
            })
          }}
        >
          <button
            type="submit"
            className="border border-ihealthBlue text-ihealthBlue font-bold px-6 py-3 rounded hover:bg-ihealthBlue hover:text-white transition"
          >
            Try a different account
          </button>
        </form>
      )}
    </Shell>
  )
}
