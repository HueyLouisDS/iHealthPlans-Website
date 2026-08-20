/**
 * Site footer. Mostly a frame around the compliance block, plus the legal
 * links and the copyright line.
 */

import Link from 'next/link'
import ComplianceDisclosures from '@/components/compliance/ComplianceDisclosures'

// The footer is the only route to these pages, they are deliberately not in
// the main nav. Order runs from the notices people look for most often to the
// ones they look for least.
// TODO a "Do Not Sell or Share My Personal Information" link may be legally
// required here. Whether it is depends on whether the business sells or shares
// personal information as those terms are defined by state law, which is an
// open question flagged on the privacy rights page.
const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Your Privacy Rights', href: '/privacy-rights' },
  { label: 'Do Not Call', href: '/do-not-call' },
  { label: 'Accessibility', href: '/accessibility' },
  { label: 'Nondiscrimination Notice', href: '/nondiscrimination-notice' },
  { label: 'TPMO Disclosure', href: '/tpmo-disclosure' },
]

/**
 * Small outward arrow that follows each legal link on the live site.
 */
function LinkArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Renders the footer.
 * The copyright year is computed at render rather than hardcoded, the live
 * site currently ships a literal that will go stale.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full h-fit bg-[#f7f7f7] border-t-2 border-t-[#e5e5e5] py-12 px-4">
      <div className="w-full max-w-shell mx-auto flex flex-col items-start gap-10">
        <ComplianceDisclosures />

        <div className="w-full flex items-center gap-x-8 gap-y-3 flex-wrap">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#105fa8] flex items-center gap-1 hover:underline"
            >
              {link.label}
              <LinkArrow />
            </Link>
          ))}
        </div>

        <p>&copy; {year} iHealth Plans. All rights reserved.</p>
      </div>
    </footer>
  )
}
