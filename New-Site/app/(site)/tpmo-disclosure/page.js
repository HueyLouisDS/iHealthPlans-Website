/**
 * Route for /tpmo-disclosure.
 * Thin on purpose. Content lives in lib/content/legal.js so counsel can review
 * the wording without reading markup, structure lives in
 * components/legal/LegalPage.js so all 5 notices stay consistent.
 *
 * DRAFT. Not reviewed by counsel. See the header of lib/content/legal.js.
 */

import LegalPage from '@/components/legal/LegalPage'
import { getLegalPage } from '@/lib/content/legal'

const SLUG = 'tpmo-disclosure'

/**
 * Title and description, read from the notice itself so they cannot
 * drift from the wording counsel reviewed.
 */
export function generateMetadata() {
  const page = getLegalPage(SLUG)
  return {
    title: page.title,
    description: page.metaDescription,
    /*
     These are utility pages. They should be reachable and readable, but they
     should not compete with the marketing pages in search results.
    */
    robots: { index: true, follow: true },
  }
}

/**
 * Renders the notice through the shared legal layout, so all 6 stay
 * identical in structure.
 */
export default function Page() {
  return <LegalPage slug={SLUG} />
}
