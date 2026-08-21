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

import Image from 'next/image'
import Link from 'next/link'
import { signOut } from '@/auth'
import AdminFrame from '@/components/admin/AdminFrame'

// `match` is the prefix that lights the item up, for when it differs from the
// href. Attribution needs both: the link has to skip past /admin/attribution
// because that path only redirects, and a redirect cannot be a soft
// navigation, so routing the sidebar through it made the whole page flash on
// every click. The item still has to stay lit on every dimension under it.
const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Leads', href: '/admin/leads' },
  { label: 'Calls', href: '/admin/calls' },
  { label: 'Attribution', href: '/admin/attribution/source', match: '/admin/attribution' },
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
      {/*
        Reversed logo, sitting directly on the sidebar with no panel behind it.
        The supplied mark is dark ink, #1a2a55 wordmark on a transparent
        ground, which disappears against the #1b2a56 sidebar. The file itself
        was always transparent, the problem was ink colour rather than
        background, so the fix is a recoloured variant rather than a backdrop.
        Generated from the original by lifting the dark inks and leaving the
        brand green untouched. See public/icons/health-plans-logo-h-reversed.svg.
      */}
      <div className="px-6 py-5 border-b border-white/15 flex-shrink-0">
        <Link href="/admin" className="block">
          <Image
            src="/icons/health-plans-logo-h-reversed.svg"
            alt="iHealth Plans"
            width={1501}
            height={318}
            priority
            className="w-full h-auto"
          />
        </Link>
        <p className="text-sm font-semibold uppercase tracking-[1.2px] text-white/60 mt-2">
          Reporting
        </p>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col">
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.match || item.href)

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

      {/* mt-auto holds this at the bottom when the nav is short,
          flex-shrink-0 stops it being squashed when the nav is long */}
      <div className="mt-auto flex-shrink-0 px-6 py-5 border-t border-white/15">
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
