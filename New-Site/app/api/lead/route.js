/**
 * Route handler behind the quote and callback form.
 *
 * Stores the lead, then pushes it to TLD. Storage first and always, because
 * our own record is what makes the push recoverable when TLD is down or slow.
 */

/*=============================================
    THE RESPONSE NEVER SAYS WHY TLD REFUSED

    TLD's rejection codes are informative in a way that is dangerous to pass
    through. "There is already a lead with this phone number" tells an
    anonymous submitter whether a given number is in the client's CRM, and
    "phone number belongs to a known litigator" leaks a third party
    classification about a real person.

    Repeated against a list of numbers, this endpoint becomes a way to read the
    book of business through a public form.

    So every submission gets the same 202. The real outcome is recorded on the
    lead row, where the agency can see it and the public cannot.
=============================================*/

import { validateLead, normaliseLead, redactLead } from '@/lib/leads/schema'
import { insertLead, recordPushOutcome } from '@/lib/db/queries/leads'
import { pushLead, OUTCOMES } from '@/lib/integrations/tldPost'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the database driver and node:crypto both need it
export const runtime = 'nodejs'
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
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  /*
   * Shared with the vendor endpoint, so owned and bought leads cannot drift
   * apart in what counts as a valid lead
   */
  const errors = validateLead(body, { origin: 'site' })
  if (Object.keys(errors).length > 0) {
    return errorResponse(ERRORS.invalidPayload, { errors })
  }

  const lead = normaliseLead(body, {
    origin: 'site',
    /*
     * TODO the real first touch source, once lib/attribution exists. Until
     * then every owned lead collapses into one row in the attribution report,
     * which is better than being untagged but is not the answer.
     */
    source: 'website',
  })

  /*
   * TODO the consent record. normaliseLead carries it, the form does not yet
   * send it, so nothing reaches note1_note on the TLD side either. It needs
   * the exact text shown, a version for that text, the timestamp, and the ip.
   * The vendor endpoint already requires all 4.
   */

  /*
   * Stored before the push and independently of it. If TLD is unreachable the
   * lead is still ours, still queryable, and still recoverable by the
   * reconciliation sweep. The reverse order would lose a submission whenever
   * the database write failed after a successful push.
   */
  let leadId = null
  try {
    leadId = await insertLead(lead)
  } catch (cause) {
    /*
     * Logged and swallowed. A person who filled in the form correctly should
     * not see a failure because our database is down, and the redacted log
     * line below is what tells us it happened.
     */
    console.error('[lead] could not store lead:', cause.message)
  }

  await deliver(lead, leadId)

  return Response.json({ status: 'received' }, { status: 202 })
}

/**
 * Pushes the lead to TLD and records the result.
 *
 * Awaited rather than fired and forgotten. pushLead already caps itself at 8
 * seconds and never throws, so the worst case is a slow form rather than a
 * lost push, and a floating promise would not survive the process restarting.
 */
async function deliver(lead, leadId) {
  const result = await pushLead({ ...lead, leadId })

  if (result.outcome === OUTCOMES.suppressed) {
    /*
     * The lead is on a DNC list, a suppression list, or a litigator database.
     * It is stored, because they did submit the form and that record matters,
     * and it must not be called. Logged at error level so it is not read as
     * ordinary delivery noise.
     */
    console.error('[lead] SUPPRESSED, do not call. code %s', result.code, redactLead(lead))
  } else if (result.outcome !== OUTCOMES.accepted) {
    console.warn('[lead] not delivered, %s code %s', result.outcome, result.code)
  }

  try {
    await recordPushOutcome(leadId, result)
  } catch (cause) {
    console.error('[lead] could not record push outcome:', cause.message)
  }
}
