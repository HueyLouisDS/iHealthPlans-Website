// Chrome for every admin page. Sidebar navigation, the signed in user, and
// sign out.
// Deliberately plain and dense. This is an internal tool read by people
// looking for a number, not a marketing page, so information density beats
// whitespace here in a way it does not anywhere else on the site.
//
// Stays a server component so the sign out server action works and so none of
// the nav ships to the client. The collapse state lives in AdminFrame, which
// receives the sidebar built here as a prop.

import Image from 'next/image'
import Link from 'next/link'
import { signOut } from '@/auth'
import AdminFrame from '@/components/admin/AdminFrame'

const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Leads', href: '/admin/leads' },
  { label: 'Calls', href: '/admin/calls' },
  { label: 'Attribution', href: '/admin/attribution/source', match: '/admin/attribution' },
  { label: 'Campaigns', href: '/admin/campaigns/all', match: '/admin/campaigns' },
  { label: 'Agents', href: '/admin/agents' },
  { label: 'Integrations', href: '/admin/integrations' },
]

function GmailIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6 flex-shrink-0" aria-hidden="true">
      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z" />
      <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z" />
    </svg>
  )
}

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
      <div className="mt-auto flex-shrink-0 px-4 py-4 border-t border-white/15">
        {/* Bordered so it reads as one block rather than as 2 more lines of
            sidebar text. It is a different kind of thing from the nav above
            it, which is why it gets an edge of its own. */}
        <div className="rounded-lg border border-white/25 bg-white/5 px-3 py-3 flex items-center gap-3">
          <GmailIcon />

          {/* min-w-0 is what lets the truncation below actually happen. A flex
              child defaults to min-width:auto, so without this a long address
              pushes the block wider instead of being clipped. */}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'Signed in'}</p>
            {/* The full address on hover, since a workspace address is exactly
                the kind of string that gets cut off */}
            <p className="text-xs text-white/60 truncate" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>

        {user?.isDevBypass ? (
          <p className="mt-3 text-sm text-white/60">No session to sign out of.</p>
        ) : (
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
