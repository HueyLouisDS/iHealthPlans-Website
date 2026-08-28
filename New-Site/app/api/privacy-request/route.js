// Route handler behind the privacy request form.
//
// Unlike /api/lead this does not push anywhere. A privacy request is worked by
// a person, and the part that reaches the dialer vendor is a written demand
// somebody sends after verifying identity, not an automated call.

/*=============================================
    A FAILED WRITE MUST FAIL THE REQUEST
=============================================*/

import { randomUUID } from 'node:crypto'

import { validateRequest, normaliseRequest, redactRequest } from '@/lib/privacy/schema'
import { insertRequest } from '@/lib/db/queries/privacyRequests'
import { notifyPrivacyRequest } from '@/lib/mail/privacyNotice'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the database driver and node:crypto both need it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// First entry of x-forwarded-for is the client, the rest are proxies
function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0].trim() || null
}

export async function POST(request) {
  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const errors = validateRequest(body)
  if (Object.keys(errors).length > 0) {
    return errorResponse(ERRORS.invalidPayload, { errors })
  }

  const privacyRequest = normaliseRequest(body, {
    sourceUrl: request.headers.get('referer'),
    ipAddress: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  const requestId = randomUUID()

  /*
   The opposite order to /api/lead, deliberately. There, storage failing still
   leaves TLD holding the lead. Here nothing else has a copy, so a failed write
   has to surface as an error rather than a receipt for a record that was never
   created.
  */
  let stored = false
  try {
    stored = await insertRequest(privacyRequest, requestId)
  } catch (cause) {
    console.error('[privacy] could not store request %s: %s', requestId, cause.message)
  }

  if (!stored) {
    return errorResponse(ERRORS.notStored, { requestId })
  }

  console.info('[privacy] stored %s', requestId, redactRequest(privacyRequest))

  // Never blocks the response. An unsent notice is a delay, a lost request is not
  await notifyPrivacyRequest({ requestId, request: privacyRequest })

  return Response.json({ status: 'received', requestId }, { status: 202 })
}
