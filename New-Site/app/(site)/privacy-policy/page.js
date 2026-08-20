/**
 * Route for /privacy-policy.
 * Thin on purpose. Content lives in lib/content/legal.js so counsel can review
 * the wording without reading markup, structure lives in
 * components/legal/LegalPage.js so all 6 notices stay consistent.
 *
 * DRAFT. Not reviewed by counsel. See the header of lib/content/legal.js.
 */

import LegalPage from '@/components/legal/LegalPage'
import { getLegalPage } from '@/lib/content/legal'

const SLUG = 'privacy-policy'

export function generateMetadata() {
  const page = getLegalPage(SLUG)
  return {
    title: page.title,
    description: page.metaDescription,
    robots: { index: true, follow: true },
  }
}

export default function Page() {
  return <LegalPage slug={SLUG} />
}
