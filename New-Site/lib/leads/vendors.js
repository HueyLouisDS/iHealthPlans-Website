// Vendor API keys for the lead ingestion endpoint, read from
// LH_LEAD_VENDOR_KEYS as vendorId:key pairs. One key per vendor, so a leak is
// revocable alone and the source tag comes from the key rather than the
// payload, which is what stops a vendor labelling leads as somebody else.

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
