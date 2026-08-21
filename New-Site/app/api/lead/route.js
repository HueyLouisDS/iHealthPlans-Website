/**
 * Route handler behind the quote and callback form.
 *
 * IMPORTANT this route does not deliver anywhere yet. There is no database and
 * no CRM has been identified, so a submitted lead is validated and logged and
 * nothing more. It returns 202, meaning received but not yet delivered, which
 * is exactly the current state.
 *
 * This must be wired before the page is public. A Medicare lead form that
 * silently drops submissions is worse than no form.
 */

import { validateLead, normaliseLead, redactLead } from '@/lib/leads/schema'

export const dynamic = 'force-dynamic'

/**
 * Accepts a lead.
 * 400 with per field errors on invalid input, 202 once accepted.
 */
export async function POST(request) {
  let body

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  // Shared with the vendor endpoint, so owned and bought leads cannot drift
  // apart in what counts as a valid lead
  const errors = validateLead(body, { origin: 'site' })
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 })
  }

  const lead = normaliseLead(body, {
    origin: 'site',
    // TODO the real first touch source, once lib/attribution exists. Until
    // then every owned lead collapses into one row in the attribution report,
    // which is better than being untagged but is not the answer.
    source: 'website',
  })

  // TODO the consent record. normaliseLead carries it, the form does not yet
  // send it. It needs the exact text shown, a version for that text, the
  // timestamp, and the ip. The vendor endpoint already requires all 4, and it
  // is indefensible to hold a vendor to a standard the agency's own form does
  // not meet.

  // Redacted, because server logs are retained and readable by everyone with
  // hosting access, which is wider than the group allowed to see lead data
  console.warn('[lead] received but NOT delivered anywhere', redactLead(lead))

  return Response.json({ status: 'received' }, { status: 202 })
}
