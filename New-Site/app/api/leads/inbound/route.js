/**
 * Lead ingestion from outside sources, POST /api/leads/inbound.
 *
 * Exists so bought leads land in the same funnel as the ones the website
 * produces, tagged with the vendor that sent them. Once they do, /admin/leads
 * and /admin/attribution report them side by side with `google / cpc` and
 * `(direct)`, ranked by the same measures. "Is the site cheaper than the
 * vendor" stops being an argument and becomes a row in a table.
 *
 * ============================================================================
 * WHY THE CONSENT RECORD IS MANDATORY HERE
 *
 * From the Spark agent and agency website guidelines, 7 November 2024:
 *
 *   "The following requirements and expectations apply to all websites
 *    leveraged by TPMOs, whether owned and operated or utilized for leads.
 *    The TPMOs are accountable to ensure compliance to all websites involved
 *    in their business operations."
 *
 * So the agency is accountable for how a vendor collected a lead, not the
 * vendor. "They told us they had consent" is not a defence. This endpoint
 * therefore refuses any lead that does not arrive with the evidence, the exact
 * wording shown, when, from where, and on what page.
 *
 * That will cost some volume. A vendor who cannot produce the consent they
 * claim to have is a vendor whose leads were always a liability, and finding
 * that out at integration time is much cheaper than finding out at audit.
 * ============================================================================
 *
 * TODO this route validates and logs and delivers nowhere, exactly like
 * /api/lead. Wire both to the CRM and the leads table together, so owned and
 * bought leads cannot diverge in how they are stored.
 */

import { validateLead, normaliseLead, redactLead, MAX_CONSENT_AGE_DAYS } from '@/lib/leads/schema'
import { vendorFromAuthHeader, ingestionEnabled } from '@/lib/leads/vendors'

// node rather than edge, because the key comparison uses node:crypto
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A lead is a few hundred bytes. Anything approaching this is a mistake or an
// attempt to make the server do work, and reading it before finding out is the
// work. Checked from the header before the body is consumed.
const MAX_BODY_BYTES = 16 * 1024

/**
 * Every response carries this, so an integrator can tell a rejected lead from
 * a network failure without parsing prose.
 */
function respond(status, payload) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * Accepts one lead from a configured vendor.
 *
 * 401 unknown or missing key. 413 body too large. 400 invalid, with per field
 * errors so the integrator can fix their mapping. 202 accepted, meaning
 * received and queued rather than delivered, which is the honest state until
 * the CRM exists.
 */
export async function POST(request) {
  if (!ingestionEnabled()) {
    // Distinct from a 401 on purpose. Nothing is configured, so no key could
    // ever work, and an integrator should not spend a day checking theirs.
    return respond(503, {
      error: 'Lead ingestion is not configured on this environment.',
      code: 'ingestion_disabled',
    })
  }

  const vendor = vendorFromAuthHeader(request.headers.get('authorization'))
  if (!vendor) {
    return respond(401, {
      error: 'A valid Bearer key is required.',
      code: 'unauthorised',
    })
  }

  // From the header, so an oversized body is refused before it is read
  const declared = Number.parseInt(request.headers.get('content-length') || '0', 10)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return respond(413, { error: 'Body too large.', code: 'too_large' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: 'Expected a JSON body.', code: 'malformed_json' })
  }

  const errors = validateLead(body, { origin: 'vendor' })
  if (Object.keys(errors).length > 0) {
    return respond(400, {
      error: 'Lead rejected.',
      code: 'invalid_lead',
      errors,
      // Named in the response because a rejected consent is the failure most
      // likely to be read as a bug in this endpoint rather than a gap in the
      // sender's own capture
      help:
        'Every lead must carry consent.text, consent.capturedAt, consent.url, and ' +
        `consent.ipAddress, captured within ${MAX_CONSENT_AGE_DAYS} days.`,
    })
  }

  const lead = normaliseLead(body, {
    origin: 'vendor',
    // From the key, never from the payload. A vendor cannot label its leads
    // as another vendor, which is what keeps the comparison honest.
    source: vendor.id,
    vendorId: vendor.id,
  })

  // Redacted. Server logs are retained, searchable, and visible to everyone
  // with hosting access, which is a wider group than the people allowed to see
  // lead data.
  console.warn('[lead:inbound] accepted but NOT delivered anywhere', redactLead(lead))

  // TODO deduplicate on (vendorId, externalId) at the database layer. It is
  // deliberately not done in memory here, because this runs serverless across
  // many instances, so an in process cache would catch an immediate retry on a
  // warm instance and miss everything else. Partial protection that reads as
  // full protection is worse than none, and the duplicate it lets through is
  // an agent calling the same person twice.
  return respond(202, {
    status: 'accepted',
    externalId: lead.externalId,
    source: lead.source,
    receivedAt: lead.receivedAt,
  })
}

/**
 * Everything else, answered explicitly.
 * A bare 405 with no body leaves an integrator guessing whether they have the
 * wrong path or the wrong method.
 */
export async function GET() {
  return respond(405, {
    error: 'POST a single lead as JSON with a Bearer key.',
    code: 'method_not_allowed',
  })
}
