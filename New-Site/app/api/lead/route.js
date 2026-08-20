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

export const dynamic = 'force-dynamic'

/**
 * Validates a submitted lead.
 * Repeats the client side rules because those are advisory, anything can post
 * to this endpoint directly.
 */
function validate(body) {
  const errors = {}

  if (!body || typeof body !== 'object') return { _form: 'Malformed request body.' }

  const zip = String(body.zip || '').trim()
  const firstName = String(body.firstName || '').trim()
  const lastName = String(body.lastName || '').trim()
  const phone = String(body.phone || '').trim()

  if (!/^[0-9]{5}$/.test(zip)) errors.zip = 'A 5 digit zip code is required.'
  if (!firstName) errors.firstName = 'First name is required.'
  if (!lastName) errors.lastName = 'Last name is required.'
  if (firstName.length > 80 || lastName.length > 80) errors._form = 'Name is too long.'
  if (phone.replace(/[^0-9]/g, '').length < 10) errors.phone = 'A reachable phone number is required.'
  if (!['self', 'other'].includes(String(body.onBehalfOf || ''))) {
    errors.onBehalfOf = 'Please say who this enquiry is for.'
  }

  return errors
}

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

  const errors = validate(body)
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 })
  }

  const lead = {
    zip: String(body.zip).trim(),
    firstName: String(body.firstName).trim(),
    lastName: String(body.lastName).trim(),
    phone: String(body.phone).trim(),
    bestTime: String(body.bestTime || 'anytime'),
    onBehalfOf: String(body.onBehalfOf),
    requestedCallback: Boolean(body.requestedCallback),
    receivedAt: new Date().toISOString(),

    // TODO the consent record. This is the part that matters most legally and
    // it is not being captured. It needs the exact consent text shown, a
    // version identifier for it, the timestamp, and the ip address. Proving
    // what a person agreed to on a given day is the entire reason to record
    // consent, and a boolean saying "they ticked it" proves nothing.

    // TODO attribution. visitorId, sessionId, and the first touch source,
    // campaign, and landing page, once lib/attribution exists. Without them a
    // lead cannot be traced to the traffic that produced it, which is the
    // whole point of the engagement.
  }

  // TODO this is the gap. Leads are written to the server log and go no
  // further. Wire to the CRM once it is identified, and write to the leads
  // table once the database exists.
  console.warn('[lead] received but NOT delivered anywhere', lead)

  return Response.json({ status: 'received' }, { status: 202 })
}
