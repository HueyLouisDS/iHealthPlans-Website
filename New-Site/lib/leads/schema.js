/**
 * One definition of what a lead is, shared by the site's own form and by the
 * vendor ingestion endpoint.
 *
 * It lives here rather than in either route because the whole point of taking
 * vendor leads over the same contract is that they land in the same funnel and
 * can be compared against owned leads row for row. Two validators drift, and
 * the first thing that drifts is which fields are required, which is exactly
 * the thing the comparison depends on.
 *
 * TODO this writes nowhere. Once db/migrations and lib/db/client.js exist, the
 * normalised record below is what goes into the leads table.
 */

/*
 * Longest sensible value for any free text field. Not a security boundary on
 * its own, the body size cap is, but it stops a name column being filled with
 * a paragraph.
 */
const MAX_TEXT = 120

/*
 * A lead older than this is not a lead, it is a list. Vendors sometimes replay
 * aged inventory as if it were fresh, and a consent captured 3 months ago
 * attached to a call today is the kind of thing that ends up in a complaint.
 */
export const MAX_CONSENT_AGE_DAYS = 30

/**
 * Turns any of the formats a phone number arrives in into E.164.
 *
 * Stored in one format because the dialer, the CRM, and the call records all
 * have to agree on what counts as the same number. The call log matching a
 * lead by phone is part of the identity chain, and "(555) 010-1234" not
 * matching "+15550101234" would break it silently.
 *
 * Returns null when the number cannot be valid, rather than a best guess.
 */
export function normalisePhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')

  // A leading 1 is the country code, not part of the number
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (national.length !== 10) return null

  /*
   * NANP rules. Area code and exchange both have to start 2 to 9, so 0 and 1
   * openers are not typos to be fixed, they are impossible numbers.
   */
  if (!/^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(national)) return null

  return `+1${national}`
}

/**
 * Trims and caps a free text field.
 */
function text(value) {
  return String(value ?? '').trim().slice(0, MAX_TEXT)
}

/**
 * Validates the consent record.
 *
 * This is the part that matters most and the part most likely to be missing.
 * Under the TPMO rules the agency is accountable for the compliance of every
 * website it takes leads from, owned or not, so "the vendor said they had
 * consent" is not a defence. The evidence has to arrive with the lead.
 *
 * A boolean saying somebody ticked a box proves nothing. What proves something
 * is the exact wording shown, when, from where, and on what page.
 */
function validateConsent(consent, { required }) {
  const errors = {}

  if (!consent || typeof consent !== 'object') {
    return required ? { consent: 'A consent record is required.' } : {}
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
      /*
       * More than a day in the future is a clock problem or a fabrication,
       * and either way it is not evidence of anything
       */
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

/**
 * Validates an incoming lead from any source.
 *
 * `origin` is 'site' for the agency's own form and 'vendor' for the ingestion
 * endpoint. The differences are deliberate and narrow.
 *
 * Names are required on the site form because the field is right there and a
 * person is typing it. They are optional from a vendor, because vendor leads
 * routinely arrive without a surname and rejecting them over it would throw
 * away workable leads for a field an agent fills in on the call anyway.
 *
 * Consent evidence is required from a vendor and not from the site form, since
 * the site captures it itself rather than being told about it.
 */
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
    /*
     * The vendor's own id for this record. Required so a retry can be
     * recognised as the same lead rather than becoming a second one, which is
     * an agent calling the same person twice.
     */
    if (!text(body.externalId)) {
      errors.externalId = 'An externalId unique to this lead is required.'
    }

    // onBehalfOf is optional from a vendor but must be valid if sent
    if (body.onBehalfOf && !['self', 'other'].includes(String(body.onBehalfOf))) {
      errors.onBehalfOf = 'Must be "self" or "other" when supplied.'
    }
  }

  Object.assign(errors, validateConsent(body.consent, { required: isVendor }))

  return errors
}

/**
 * Turns a validated body into the record that goes to the CRM and the leads
 * table. Call only after validateLead returns no errors.
 */
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

    /*
     * Kept whole. Proving what somebody agreed to on a given day is the entire
     * reason this exists, so it is stored verbatim rather than summarised.
     */
    consent: body.consent
      ? {
          text: String(body.consent.text).trim(),
          capturedAt: new Date(body.consent.capturedAt).toISOString(),
          url: text(body.consent.url),
          ipAddress: text(body.consent.ipAddress),
          /*
           * One to one consent names the agent. Optional here because whether
           * it binds is unsettled, see the note in the inbound route.
           */
          agent: text(body.consent.agent) || null,
        }
      : null,

    /*
     * Attribution. Present for owned leads once lib/attribution exists, and
     * null from a vendor, which is itself worth knowing. A source that can
     * never say which campaign produced a lead is a source you can only
     * measure in aggregate.
     */
    visitorId: text(body.visitorId) || null,
    sessionId: text(body.sessionId) || null,

    receivedAt: new Date().toISOString(),
  }
}

/**
 * A version of a lead safe to write to a log.
 *
 * Server logs are retained, searchable, and readable by anyone with access to
 * the hosting account, which is a wider group than the people allowed to see
 * lead data. Nothing here should be enough to identify or contact a person.
 */
export function redactLead(lead) {
  return {
    source: lead.source,
    origin: lead.origin,
    vendorId: lead.vendorId,
    externalId: lead.externalId,
    zip: lead.zip,
    /*
     * Last 4 only, which is enough to match a record against a complaint
     * without the log itself being a contact list
     */
    phoneLast4: lead.phone ? lead.phone.slice(-4) : null,
    hasEmail: Boolean(lead.email),
    hasName: Boolean(lead.firstName || lead.lastName),
    onBehalfOf: lead.onBehalfOf,
    consentCapturedAt: lead.consent?.capturedAt || null,
    receivedAt: lead.receivedAt,
  }
}
