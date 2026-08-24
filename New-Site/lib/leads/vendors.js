// Vendor API keys for the lead ingestion endpoint.
//
// One key per vendor rather than one shared key, for 2 reasons. A vendor whose
// key leaks can be revoked without taking every other integration down with
// it. And the source tag is derived from the key rather than read from the
// payload, so a vendor cannot post leads labelled as somebody else, whether by
// mistake or otherwise. That matters because the whole reason this endpoint
// exists is to compare vendors against each other.
//
// Configured as LH_LEAD_VENDOR_KEYS in the environment:
//   acme-leads:sk_live_xxxx,other-vendor:sk_live_yyyy
//
// TODO move to a vendors table once the database exists, with an enabled flag
// and a rotation date. An env var means rotating a key is a redeploy.

import { createHash, timingSafeEqual } from 'node:crypto'

function configuredVendors() {
  const raw = process.env.LH_LEAD_VENDOR_KEYS || ''

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(':')
      if (separator < 1) return null

      const id = entry.slice(0, separator).trim()
      const key = entry.slice(separator + 1).trim()
      if (!id || !key) return null

      return { id, key }
    })
    .filter(Boolean)
}

// Hashed first so both sides are the same length. timingSafeEqual throws on a
// mismatch, and catching that would leak the real key's length through timing.
function secretsMatch(a, b) {
  const left = createHash('sha256').update(String(a)).digest()
  const right = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(left, right)
}

export function vendorFromAuthHeader(header) {
  const value = String(header || '')
  if (!value.toLowerCase().startsWith('bearer ')) return null

  const presented = value.slice(7).trim()
  if (!presented) return null

  let matched = null
  for (const vendor of configuredVendors()) {
    if (secretsMatch(presented, vendor.key)) matched = vendor
  }

  return matched
}

export function ingestionEnabled() {
  return configuredVendors().length > 0
}
