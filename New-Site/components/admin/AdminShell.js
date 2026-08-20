/**
 * Chrome for every admin page. Sidebar navigation, the signed in user, and
 * sign out.
 * Deliberately plain and dense. This is an internal tool read by people
 * looking for a number, not a marketing page, so information density beats
 * whitespace here in a way it does not anywhere else on the site.
 *
 * Stays a server component so the sign out server action works and so none of
 * the nav ships to the client. The collapse state lives in AdminFrame, which
 * receives the sidebar built here as a prop.
 */

import Link from 'next/link'
import { signOut } from '@/auth'
import AdminFrame from '@/components/admin/AdminFrame'

const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Leads', href: '/admin/leads' },
  { label: 'Calls', href: '/admin/calls' },
  { label: 'Attribution', href: '/admin/attribution' },
  { label: 'Agents', href: '/admin/agents' },
]

/**
 * The sidebar contents, rendered on the server and handed to AdminFrame.
 * Kept separate so the server action below never has to cross into a client
 * component, which it cannot do.
 */
function Sidebar({ user, currentPath }) {
  return (
    <>
      <div className="px-6 py-5 border-b border-white/15">
        <Link href="/admin" className="text-lg font-bold">
          iHealth Plans
        </Link>
        <p className="text-sm text-white/60 mt-0.5">Reporting</p>
      </div>

      <nav className="flex-1 py-4 flex flex-col">
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact ? currentPath === item.href : currentPath.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`px-6 py-3 text-base font-semibold whitespace-nowrap transition-colors border-l-4 ${
                isActive
                  ? 'bg-white/10 border-l-ihealthGreen text-white'
                  : 'border-l-transparent text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-5 border-t border-white/15">
        <p className="text-sm text-white/60">Signed in as</p>
        <p className="text-sm font-semibold break-words">{user?.email}</p>

        {user?.isDevBypass ? (
          <p className="mt-3 text-sm text-white/60">No session to sign out of.</p>
        ) : (
          /* Server action rather than a client handler, so signing out needs
             no JavaScript and cannot be left half done by a failed fetch */
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/admin/signin' })
            }}
          >
            <button
              type="submit"
              className="mt-3 text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4"
            >
              Sign out
            </button>
          </form>
        )}

        <Link href="/" className="mt-3 block text-sm text-white/60 hover:text-white">
          Back to the website
        </Link>
      </div>
    </>
  )
}

/**
 * Wraps a page in the admin chrome.
 * `currentPath` drives the active nav state, passed in rather than read from a
 * hook so this stays a server component.
 */
export default function AdminShell({ user, currentPath = '/admin', title, description, children }) {
  return (
    <AdminFrame
      sidebar={<Sidebar user={user} currentPath={currentPath} />}
      title={title}
      description={description}
      showBypassBanner={Boolean(user?.isDevBypass)}
    >
      {children}
    </AdminFrame>
  )
}
