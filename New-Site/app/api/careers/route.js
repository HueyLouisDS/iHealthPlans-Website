// Route handler behind the careers application form. Path matches the live
// site's own /api/careers so the existing front end contract is preserved.
//
// TODO this delivers nowhere. The live site's destination is not visible from
// the client bundle, so submissions are logged until somebody can say where
// applications are supposed to land.

export const dynamic = 'force-dynamic'

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
  }

  console.warn('[careers] application received but NOT delivered anywhere', application)

  return Response.json({ status: 'received' }, { status: 202 })
}
