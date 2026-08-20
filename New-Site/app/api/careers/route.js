/**
 * Route handler behind the careers application form.
 * Path matches the live site's own endpoint, /api/careers, so the contract the
 * existing front end expects is preserved.
 *
 * IMPORTANT this route does not yet deliver anywhere. The live site's handler
 * runs on the server and its destination is not visible from the client
 * bundle, so where applications currently land is unknown. Until that is
 * answered, submissions are logged and nothing else.
 */

// Applications are per request and must never be cached or prerendered
export const dynamic = 'force-dynamic'

/**
 * Validates a submitted application.
 * Repeats the client side rules because the client side ones are advisory,
 * anything can post to this endpoint directly.
 */
function validate(application) {
  const errors = {}

  if (!application || typeof application !== 'object') {
    return { _form: 'Malformed request body.' }
  }

  const fullName = String(application.fullName || '').trim()
  const phone = String(application.phone || '').trim()
  const email = String(application.email || '').trim()

  if (!fullName) errors.fullName = 'Full name is required.'
  if (fullName.length > 120) errors.fullName = 'Full name is too long.'

  // Same loose rule as the form, 10 digits after stripping formatting
  if (phone.replace(/[^0-9]/g, '').length < 10) errors.phone = 'A reachable phone number is required.'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'A valid email address is required.'

  return errors
}

/**
 * Accepts an application.
 * Returns 400 with per field errors on invalid input, 202 once accepted.
 * 202 rather than 200 is deliberate, it says received but not yet delivered,
 * which is exactly the current state of this handler.
 */
export async function POST(request) {
  let body

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const errors = validate(body)
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 })
  }

  const application = {
    fullName: String(body.fullName).trim(),
    phone: String(body.phone).trim(),
    email: String(body.email).trim(),
    receivedAt: new Date().toISOString(),
    // TODO attach visitorId, sessionId, and the attribution captured on first
    // touch, once lib/attribution exists. Without them an application cannot
    // be traced to the campaign that produced it.
  }

  // TODO this is the gap. Applications are written to the server log and go no
  // further, so nothing reaches a recruiter. Wire this to whatever the client
  // actually uses, an inbox, an ATS, or the CRM, before this page is live.
  console.warn('[careers] application received but NOT delivered anywhere', application)

  return Response.json({ status: 'received' }, { status: 202 })
}
