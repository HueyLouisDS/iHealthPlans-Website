// Route handler behind the quote and callback form.
//
// Stores the lead, then pushes it to TLD. Storage first and always, because
// our own record is what makes the push recoverable when TLD is down or slow.

/*=============================================
    THE RESPONSE NEVER SAYS WHY TLD REFUSED
=============================================*/

import { randomUUID } from 'node:crypto'

import { validateLead, normaliseLead, redactLead } from '@/lib/leads/schema'
import { insertLead, recordPushOutcome } from '@/lib/db/queries/leads'
import { pushLead, OUTCOMES } from '@/lib/integrations/tldPost'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the database driver and node:crypto both need it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const errors = validateLead(body, { origin: 'site' })
  if (Object.keys(errors).length > 0) {
    return errorResponse(ERRORS.invalidPayload, { errors })
  }

  const lead = normaliseLead(body, {
    origin: 'site',
    source: 'website',
  })
  /*
   Stored before the push and independently of it, so an unreachable TLD
   cannot lose a submission. The reverse order would drop a lead whenever the
   database write failed after a successful push.

   The id is minted here rather than by the insert, so the push carries a
   tracking_id even when storage fails. A lead reaching TLD with no id on it
   can never be tied back, and that is exactly the case where something has
   already gone wrong and the trail matters most.
  */
  const leadId = randomUUID()

  let stored = false
  try {
    stored = await insertLead(lead, leadId)
  } catch (cause) {
    console.error('[lead] could not store lead %s: %s', leadId, cause.message)
  }

  await deliver(lead, leadId, stored)

  return Response.json({ status: 'received' }, { status: 202 })
}

async function deliver(lead, leadId, stored) {
  const result = await pushLead({ ...lead, leadId })

  if (result.outcome === OUTCOMES.suppressed) {
    console.error('[lead] SUPPRESSED, do not call. code %s', result.code, redactLead(lead))
  } else if (result.outcome !== OUTCOMES.accepted) {
    console.warn('[lead] not delivered, %s code %s', result.outcome, result.code)
  }

  try {
    if (stored) await recordPushOutcome(leadId, result)
  } catch (cause) {
    console.error('[lead] could not record push outcome:', cause.message)
  }
}
