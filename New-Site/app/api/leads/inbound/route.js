// Lead ingestion from outside sources, POST /api/leads/inbound.
//
// Exists so bought leads land in the same funnel as the ones the website
// produces, tagged with the vendor that sent them. Once they do, /admin/leads
// and /admin/attribution report them side by side with `google / cpc` and
// `(direct)`, ranked by the same measures. "Is the site cheaper than the
// vendor" stops being an argument and becomes a row in a table.

/*=============================================
    WHY THE CONSENT RECORD IS MANDATORY HERE
=============================================*/
import { validateLead, normaliseLead, redactLead, MAX_CONSENT_AGE_DAYS } from '@/lib/leads/schema'
import { vendorFromAuthHeader, ingestionEnabled } from '@/lib/leads/vendors'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, because the key comparison uses node:crypto
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_BODY_BYTES = 16 * 1024

function accepted(status, payload) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request) {
  if (!ingestionEnabled()) {
    return errorResponse(ERRORS.ingestionOff, {
      error: 'Lead ingestion is not configured on this environment.',
    })
  }

  const vendor = vendorFromAuthHeader(request.headers.get('authorization'))
  if (!vendor) {
    return errorResponse(ERRORS.unauthorised, { error: 'A valid Bearer key is required.' })
  }

  // From the header, so an oversized body is refused before it is read
  const declared = Number.parseInt(request.headers.get('content-length') || '0', 10)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return errorResponse(ERRORS.tooLarge, { error: 'Body too large.' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const errors = validateLead(body, { origin: 'vendor' })
  if (Object.keys(errors).length > 0) {
    return errorResponse(ERRORS.invalidLead, {
      error: 'Lead rejected.',
      errors,
      help:
        'Every lead must carry consent.text, consent.capturedAt, consent.url, and ' +
        `consent.ipAddress, captured within ${MAX_CONSENT_AGE_DAYS} days.`,
    })
  }

  const lead = normaliseLead(body, {
    origin: 'vendor',
    source: vendor.id,
    vendorId: vendor.id,
  })
  console.warn('[lead:inbound] accepted but NOT delivered anywhere', redactLead(lead))
  return respond(202, {
    status: 'accepted',
    externalId: lead.externalId,
    source: lead.source,
    receivedAt: lead.receivedAt,
  })
}

export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST a single lead as JSON with a Bearer key.',
  })
}
