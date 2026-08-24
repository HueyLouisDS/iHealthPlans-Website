// Pushes a lead from the site into TLD, using the vendor post endpoint.
// This is the only thing the website ever writes to TLD. Everything else in
// the integration reads. Called after a lead is stored on our side, never
// before, because our own record has to survive TLD being down.

import 'server-only'

import { vendorConfig } from '@/lib/integrations/config'

/*=======================================================
        THE POST KEY TRAVELS IN THE QUERY STRING
========================================================*/

/*
 TLD requires vendor_id and post_key as URL parameters even on a POST, so the
 credential cannot live in a header. Query strings reach access logs, proxy
 logs, referrer headers and error reports.

   Server only, enforced by the import above.
   Never log the url. Built at the call site, never held.
   Never log the payload. Beneficiary PII and consent text.

 The Results Log url carries the same key and returns the last 100 leads with
 full debugging data. Not implemented here on purpose.
*/

const REQUEST_TIMEOUT_MS = 8000          // a form submit cannot wait longer than this
const MAX_FIELD_LENGTH = 500             // guard against a pathological value, not a TLD limit

/*=======================================================
        RESPONSE CODES
========================================================*/

/*
 TLD answers with a bare integer as text, not JSON. 1 to 16 are success, the
 rest are failures with unrelated causes, so they are bucketed by what the
 caller should do about them rather than kept flat.
*/
const OUTCOMES = {
  accepted: 'accepted',                  // 1-16, created or matched an existing lead
  duplicate: 'duplicate',                // already present, by phone, email, or criteria
  suppressed: 'suppressed',              // DNC, litigator, blacklist. Do not call.
  filtered: 'filtered',                  // vendor rejected the state, zip, or area code
  throttled: 'throttled',                // hourly, daily, weekly, or monthly cap hit
  config: 'config',                      // our vendor id, post key, or vendor state is wrong
  transient: 'transient',                // TLD side problem, safe to try again later
  unknown: 'unknown',                    // a code not in the documented table
}

/*
 Listed explicitly rather than as a range. This is the bucket with a legal
 consequence, so the exact set has to be readable at a glance. Anything
 landing here must not be called, form submission or not.
*/
const SUPPRESSED_CODES = new Set([
  200,                                   // TLDialer DNC list
  201,                                   // configured filter phone groups
  301,                                   // known litigator
  303,                                   // known litigator or bad number
  351,                                   // blacklist
  352,                                   // suppression list
  361,                                   // DNC.com database
  371,                                   // litigator or DNC
  372,                                   // litigator
])

const CONFIG_CODES = new Set([91, 92, 93, 94, 96, 97, 98, 99, 100])
const TRANSIENT_CODES = new Set([101, 305, 306, 400])
const FILTERED_CODES = new Set([110, 111, 112, 113, 128, 129, 130, 131, 132, 133, 134, 135])
const THROTTLED_CODES = new Set([138, 139, 140, 141])

/**
 * Sorts a TLD response code into one of the outcome buckets.
 *
 * Separate from the request so it can be tested against the whole documented
 * table without a network call, which is the only practical way to be sure the
 * suppression set is complete.
 */
export function classifyCode(code) {
  if (!Number.isInteger(code)) return OUTCOMES.unknown

  // 1 through 16 are all documented successes, including the update variants
  if (code >= 1 && code <= 16) return OUTCOMES.accepted

  if (SUPPRESSED_CODES.has(code)) return OUTCOMES.suppressed
  if (CONFIG_CODES.has(code)) return OUTCOMES.config
  if (TRANSIENT_CODES.has(code)) return OUTCOMES.transient
  if (FILTERED_CODES.has(code)) return OUTCOMES.filtered
  if (THROTTLED_CODES.has(code)) return OUTCOMES.throttled

  /*
   The duplicate codes are a wide scattered range, 102 to 108 for phone, 114
   to 125 for email and general criteria, plus 126, 127 and 142. Matched last
   and by range, because the specific sets above have already claimed
   everything inside those bounds that is not actually a duplicate.
  */
  if ((code >= 102 && code <= 108) || (code >= 114 && code <= 127) || code === 142) {
    return OUTCOMES.duplicate
  }

  return OUTCOMES.unknown
}

export { OUTCOMES }

/*=======================================================
        THE FIELD MAP
========================================================*/

/*
 Our field on the left, the TLD post field on the right. A table so adding a
 field is one row here and no change to the push logic.

 `custom: true` means the field does not exist on the account yet, so it is
 withheld. TLD drops unrecognised keys without erroring, which would look
 identical to the field working. Flip to false as each one is created.
*/
const FIELD_MAP = [
  /* Person. The only genuinely required part, TLD needs a phone or an email. */
  { from: 'firstName', to: 'first_name' },
  { from: 'lastName', to: 'last_name' },
  { from: 'phone', to: 'phone', transform: toTenDigits },
  { from: 'email', to: 'email' },
  { from: 'zip', to: 'zipcode' },
  { from: 'state', to: 'state' },
  { from: 'bestTime', to: 'contact_time' },

  /*
   The post response carries no TLD lead id, so tracking_id is how our record
   and theirs are tied together during the read sync. The join key.
  */
  { from: 'leadId', to: 'tracking_id' },
  { from: 'visitorId', to: 'reference_id' },

  /* Attribution that already has a standard home */
  { from: 'attribution.campaign', to: 'campaign_id' },
  { from: 'attribution.landingPage', to: 'page' },
  { from: 'attribution.referrer', to: 'referrer' },

  /* Consent, the ip only. The rest goes into note1_note, see buildPayload. */
  { from: 'consent.ipAddress', to: 'ip_address' },

  /*
   Awaiting custom fields on the live vendor source. Names chosen to match
   what they are, so the mapping stays obvious to whoever creates them.
  */
  { from: 'sessionId', to: 'session_id', custom: true },
  { from: 'onBehalfOf', to: 'on_behalf_of', custom: true },
  { from: 'attribution.source', to: 'utm_source', custom: true },
  { from: 'attribution.medium', to: 'utm_medium', custom: true },
  { from: 'attribution.content', to: 'utm_content', custom: true },
  { from: 'attribution.term', to: 'utm_term', custom: true },
  { from: 'attribution.gclid', to: 'gclid', custom: true },
  { from: 'attribution.fbclid', to: 'fbclid', custom: true },
  { from: 'attribution.msclkid', to: 'msclkid', custom: true },
]

/**
 * Converts our stored E.164 number to the 10 digits TLD expects.
 *
 * TLD would strip and truncate this itself, but its truncation runs right to
 * left, so a number carrying an extension or a stray digit would silently
 * become a different phone number.
 */
function toTenDigits(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

/**
 * Reads a possibly nested path like 'consent.ipAddress' off the source object.
 * Flat access would need the map to know about the shape of the lead, which is
 * the thing the map exists to avoid.
 */
function readPath(source, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source)
}

/**
 * Formats the consent record as a note an agent can read on screen.
 *
 * A note rather than a field because TLD has none, and notes render in the
 * agent interface where the person placing the call can see them. The
 * authoritative hashed copy stays in lead_consents. This is the readable one.
 */
function consentNote(consent) {
  if (!consent) return null

  return [
    `CONSENT CAPTURED ${consent.capturedAt}`,
    `Page: ${consent.url}`,
    `IP: ${consent.ipAddress}`,
    consent.agent ? `Agent named: ${consent.agent}` : null,
    '',
    consent.text,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/**
 * Builds the form encoded body from a lead.
 *
 * Form encoded rather than JSON, though TLD takes both. Every value it accepts
 * is a string or a 0/1, and form encoding makes that literal.
 *
 * Exported so the mapping can be checked without posting anything.
 */
export function buildPayload(lead) {
  const body = new URLSearchParams()      // form encoded, every value a string

  for (const field of FIELD_MAP) {
    // Skipped until the field exists on the vendor source, see FIELD_MAP
    if (field.custom) continue

    const raw = readPath(lead, field.from)
    if (raw === null || raw === undefined || raw === '') continue

    const value = field.transform ? field.transform(raw) : String(raw)
    if (!value) continue

    body.set(field.to, value.slice(0, MAX_FIELD_LENGTH))
  }

  /*
   Outside the map because it is assembled from 5 fields, and because it is
   not truncated. A partial quote of a disclosure proves nothing, so an
   oversized one has to fail rather than be quietly shortened.
  */
  const note = consentNote(lead.consent)
  if (note) body.set('note1_note', note)

  return body
}

/*=======================================================
        THE PUSH
========================================================*/

/**
 * Sends one lead to TLD.
 *
 * Never throws. The lead is stored on our side before this runs, so a TLD
 * failure is a delivery problem to record, not a reason to tell somebody their
 * submission failed when it did not.
 *
 * Returns { outcome, code, raw, error } for the caller to write to
 * leads.pushed_at and leads.push_error.
 */
export async function pushLead(lead) {
  const config = vendorConfig()

  if (!config.isConfigured) {
    return {
      outcome: OUTCOMES.config,
      code: null,
      raw: null,
      error: `The vendor post is not configured: ${config.problems.join(' ')}`,
    }
  }

  /*
   Built here and never held, so the post key does not sit in a variable that
   could end up in a stack trace or a logged config object.
  */
  const url = new URL(config.postUrl)
  url.searchParams.set('vendor_id', config.vendorId)
  url.searchParams.set('post_key', config.postKey)

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildPayload(lead),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (cause) {
    /*
     Not retried. A timeout does not say whether the lead landed, and dupe
     handling is per vendor, so a blind retry either duplicates or is
     rejected and we cannot tell which. Duplicating means a second dial.

     The read sync reconciles on tracking_id instead.
    */
    return {
      outcome: OUTCOMES.transient,
      code: null,
      raw: null,
      // The message only. The cause can carry the request url, key included.
      error: cause.name === 'TimeoutError' ? 'TLD post timed out.' : 'TLD post failed to send.',
    }
  }

  if (!response.ok) {
    return {
      outcome: OUTCOMES.transient,
      code: null,
      raw: null,
      error: `TLD post returned HTTP ${response.status}.`,
    }
  }

  /*
   Documented as TEXT, a bare integer. Parsed leniently because a proxy could
   wrap it in whitespace, and misreading a success sends a duplicate next run.
  */
  const raw = (await response.text()).trim()
  const code = Number.parseInt(raw, 10)
  const outcome = classifyCode(code)

  return {
    outcome,
    code: Number.isInteger(code) ? code : null,
    raw: raw.slice(0, 200),
    error: outcome === OUTCOMES.accepted ? null : `TLD rejected the lead, code ${raw}.`,
  }
}

/*
 TODO state. TLD codes 112 and 113 reject a lead when a vendor filters by
 state and none was supplied, and the site currently collects a zip and no
 state. Derive it from the zip before this goes live against the real vendor,
 or every lead is refused the moment state routing is switched on.
*/

/*
 TODO the System Field ID mappings. sep, enrollment_eligibility and
 insured_intent all take a numeric TLD id rather than text, and the mapping
 has to be requested from TLD separately. Until then SEP and product interest
 do not cross, which loses the distinction between an AEP and an SEP lead on
 their side.
*/
