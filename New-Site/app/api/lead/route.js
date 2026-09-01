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
import { SITE_URL } from '@/lib/siteConfig'

// node rather than edge, the database driver and node:crypto both need it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 lead_consents.ip_address is NOT NULL, so an unknown address needs a value
 rather than a null. Deliberately not 0.0.0.0, which scripts/purge.mjs writes
 as its redaction marker. Using it here would make a consent that simply had
 no address look like one whose address was deliberately destroyed.

 In production the header is always set by the platform. This is for a local
 request with no proxy in front of it.
*/
const IP_UNKNOWN = 'unknown'

// First entry of x-forwarded-for is the client, the rest are proxies
function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || IP_UNKNOWN
}

/*=============================================
    THE BROWSER SENDS THE WORDING AND NOTHING ELSE
=============================================*/

/*
 Everything a consent record is evidence of, when it happened, where, and who
 from, is taken off the request rather than the payload. A page can be asked
 what it displayed. It cannot be asked to certify its own address or clock.

 capturedAt is stamped here rather than at the click for that reason and one
 other. A browser with a wrong system clock would fail the future and 30 day
 checks in validateConsent and lose the lead, and the gap between the click
 and this line is under a second.
*/
function withRequestFacts(consent, request) {
  if (!consent || typeof consent !== 'object') return consent

  return {
    ...consent,
    capturedAt: new Date().toISOString(),
    url: request.headers.get('referer') || SITE_URL,
    ipAddress: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  }
}

export async function POST(request) {
  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  body = { ...body, consent: withRequestFacts(body.consent, request) }

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
