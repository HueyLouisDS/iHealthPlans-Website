/**
 * Chrome for every admin page. Sidebar navigation, the signed in user, and
 * sign out.
 * Deliberately plain and dense. This is an internal tool read by people
 * looking for a number, not a marketing page, so information density beats
 * whitespace here in a way it does not anywhere else on the site.
 */

import Link from 'next/link'
import { signOut } from '@/auth'

const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Leads', href: '/admin/leads' },
  { label: 'Calls', href: '/admin/calls' },
  { label: 'Attribution', href: '/admin/attribution' },
  { label: 'Agents', href: '/admin/agents' },
]

/**
 * Renders the shell around a page.
 * `currentPath` drives the active nav state, passed in rather than read from a
 * hook so this stays a server component and no admin markup ships to the
 * client unnecessarily.
 */
export default function AdminShell({ user, currentPath = '/admin', title, description, children }) {
  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col nm:flex-row">
      <aside className="w-full nm:w-[240px] nm:min-h-screen bg-ihealthBlue text-white flex-shrink-0 flex flex-col">
        <div className="px-6 py-5 border-b border-white/15">
          <Link href="/admin" className="text-lg font-bold">
            iHealth Plans
          </Link>
          <p className="text-sm text-white/60 mt-0.5">Reporting</p>
        </div>

        <nav className="flex-1 py-4 flex flex-row nm:flex-col overflow-x-auto">
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

          {/* Server action rather than a client handler, so signing out needs
              no JavaScript and cannot be left half done by a failed fetch */}
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

          <Link href="/" className="mt-3 block text-sm text-white/60 hover:text-white">
            Back to the website
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-white border-b px-6 py-6">
          <h1 className="text-2xl font-bold text-ihealthBlue">{title}</h1>
          {description && <p className="text-base text-[#505258] mt-1">{description}</p>}
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
