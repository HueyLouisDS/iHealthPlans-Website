/**
 * Site footer. Mostly a frame around the compliance block, plus the legal
 * links and the copyright line.
 */

import Link from 'next/link'
import ComplianceDisclosures from '@/components/compliance/ComplianceDisclosures'

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

        <div className="w-fit flex items-center gap-8 flex-wrap">
          <Link href="/privacy-policy" className="text-[#105fa8] flex items-center gap-1 hover:underline">
            Privacy Policy
            <LinkArrow />
          </Link>
          <Link href="/terms-of-service" className="text-[#105fa8] flex items-center gap-1 hover:underline">
            Terms of Service
            <LinkArrow />
          </Link>
          <p>&copy; {year} iHealth Plans. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
