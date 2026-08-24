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

export function classifyCode(code) {
  if (!Number.isInteger(code)) return OUTCOMES.unknown

  // 1 through 16 are all documented successes, including the update variants
  if (code >= 1 && code <= 16) return OUTCOMES.accepted

  if (SUPPRESSED_CODES.has(code)) return OUTCOMES.suppressed
  if (CONFIG_CODES.has(code)) return OUTCOMES.config
  if (TRANSIENT_CODES.has(code)) return OUTCOMES.transient
  if (FILTERED_CODES.has(code)) return OUTCOMES.filtered
  if (THROTTLED_CODES.has(code)) return OUTCOMES.throttled
  if ((code >= 102 && code <= 108) || (code >= 114 && code <= 127) || code === 142) {
    return OUTCOMES.duplicate
  }

  return OUTCOMES.unknown
}

export { OUTCOMES }

/*=======================================================
        THE FIELD MAP
========================================================*/

const FIELD_MAP = [
  // Person. The only genuinely required part, TLD needs a phone or an email.
  { from: 'firstName', to: 'first_name' },
  { from: 'lastName', to: 'last_name' },
  { from: 'phone', to: 'phone', transform: toTenDigits },
  { from: 'email', to: 'email' },
  { from: 'zip', to: 'zipcode' },
  { from: 'state', to: 'state' },
  { from: 'bestTime', to: 'contact_time' },
  { from: 'leadId', to: 'tracking_id' },
  { from: 'visitorId', to: 'reference_id' },

  // Attribution that already has a standard home
  { from: 'attribution.campaign', to: 'campaign_id' },
  { from: 'attribution.landingPage', to: 'page' },
  { from: 'attribution.referrer', to: 'referrer' },

  // Consent, the ip only. The rest goes into note1_note, see buildPayload.
  { from: 'consent.ipAddress', to: 'ip_address' },
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

function toTenDigits(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

function readPath(source, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source)
}

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

  const note = consentNote(lead.consent)
  if (note) body.set('note1_note', note)

  return body
}

/*=======================================================
        THE PUSH
========================================================*/

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