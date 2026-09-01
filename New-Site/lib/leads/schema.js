// One definition of what a lead is, shared by the site's own form and by the
// vendor ingestion endpoint.
//
// It lives here rather than in either route because the whole point of taking
// vendor leads over the same contract is that they land in the same funnel and
// can be compared against owned leads row for row. Two validators drift, and
// the first thing that drifts is which fields are required, which is exactly
// the thing the comparison depends on.
//
// TODO this writes nowhere. Once db/migrations and lib/db/client.js exist, the
// normalised record below is what goes into the leads table.

// Longest sensible value for any free text field. Not a security boundary on
// its own, the body size cap is, but it stops a name column being filled with
// a paragraph.
const MAX_TEXT = 120
export const MAX_CONSENT_AGE_DAYS = 30

export function normalisePhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')

  // A leading 1 is the country code, not part of the number
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (national.length !== 10) return null
  if (!/^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(national)) return null

  return `+1${national}`
}

function text(value) {
  return String(value ?? '').trim().slice(0, MAX_TEXT)
}

/*-------- This is critical --------*/
/*
 Required on every lead, from the site and from a vendor alike. It was vendor
 only while the site form sent nothing, which had the agency holding a vendor
 to a standard its own form did not meet.

 A site submission arrives carrying only the wording. capturedAt, url and
 ipAddress are filled in by /api/lead from the request before this runs, so
 the browser is never the source of any of them.
*/
function validateConsent(consent) {
  const errors = {}

  if (!consent || typeof consent !== 'object') {
    return { consent: 'A consent record is required.' }
  }

  if (!String(consent.text || '').trim()) {
    errors['consent.text'] = 'The exact consent language shown to the consumer is required.'
  }

  const capturedAt = new Date(consent.capturedAt)
  if (Number.isNaN(capturedAt.getTime())) {
    errors['consent.capturedAt'] = 'An ISO 8601 timestamp is required.'
  } else {
    const ageDays = (Date.now() - capturedAt.getTime()) / 86_400_000

    if (ageDays < -1) {
      errors['consent.capturedAt'] = 'Timestamp is in the future.'
    } else if (ageDays > MAX_CONSENT_AGE_DAYS) {
      errors['consent.capturedAt'] = `Consent is older than ${MAX_CONSENT_AGE_DAYS} days.`
    }
  }

  if (!String(consent.url || '').trim()) {
    errors['consent.url'] = 'The url of the page the consent was given on is required.'
  }

  if (!String(consent.ipAddress || '').trim()) {
    errors['consent.ipAddress'] = 'The consumer ip address at capture is required.'
  }

  return errors
}

export function validateLead(body, { origin = 'site' } = {}) {
  const errors = {}
  if (!body || typeof body !== 'object') return { _form: 'Malformed request body.' }

  const isVendor = origin === 'vendor'

  if (!/^[0-9]{5}$/.test(String(body.zip || '').trim())) {
    errors.zip = 'A 5 digit zip code is required.'
  }

  if (!normalisePhone(body.phone)) {
    errors.phone = 'A reachable 10 digit US phone number is required.'
  }

  if (!isVendor) {
    if (!text(body.firstName)) errors.firstName = 'First name is required.'
    if (!text(body.lastName)) errors.lastName = 'Last name is required.'
    if (!['self', 'other'].includes(String(body.onBehalfOf || ''))) {
      errors.onBehalfOf = 'Please say who this enquiry is for.'
    }
  }

  if (isVendor) {
    if (!text(body.externalId)) {
      errors.externalId = 'An externalId unique to this lead is required.'
    }

    // onBehalfOf is optional from a vendor but must be valid if sent
    if (body.onBehalfOf && !['self', 'other'].includes(String(body.onBehalfOf))) {
      errors.onBehalfOf = 'Must be "self" or "other" when supplied.'
    }
  }

  Object.assign(errors, validateConsent(body.consent))

  return errors
}

export function normaliseLead(body, { origin, source, vendorId = null }) {
  return {
    source,
    origin,
    vendorId,
    externalId: text(body.externalId) || null,

    zip: String(body.zip).trim(),
    phone: normalisePhone(body.phone),
    firstName: text(body.firstName) || null,
    lastName: text(body.lastName) || null,
    email: text(body.email).toLowerCase() || null,
    onBehalfOf: ['self', 'other'].includes(String(body.onBehalfOf)) ? String(body.onBehalfOf) : null,
    bestTime: text(body.bestTime) || 'anytime',
    consent: body.consent
      ? {
          // Not clamped to MAX_TEXT. consent_text is a TEXT column precisely
          // so the wording is stored whole rather than cut off mid sentence.
          text: String(body.consent.text).trim(),
          capturedAt: new Date(body.consent.capturedAt).toISOString(),
          url: String(body.consent.url ?? '').trim().slice(0, 500),
          ipAddress: text(body.consent.ipAddress),
          /*
           Both of these are read by insertLead and were never produced here,
           so every consent row was written with a null version and a null
           user agent regardless of what arrived.
          */
          version: text(body.consent.version) || null,
          userAgent: String(body.consent.userAgent ?? '').trim().slice(0, 500) || null,
          agent: text(body.consent.agent) || null,
        }
      : null,
    visitorId: text(body.visitorId) || null,
    sessionId: text(body.sessionId) || null,

    receivedAt: new Date().toISOString(),
  }
}

export function redactLead(lead) {
  return {
    source: lead.source,
    origin: lead.origin,
    vendorId: lead.vendorId,
    externalId: lead.externalId,
    zip: lead.zip,
    phoneLast4: lead.phone ? lead.phone.slice(-4) : null,
    hasEmail: Boolean(lead.email),
    hasName: Boolean(lead.firstName || lead.lastName),
    onBehalfOf: lead.onBehalfOf,
    consentCapturedAt: lead.consent?.capturedAt || null,
    receivedAt: lead.receivedAt,
  }
}
