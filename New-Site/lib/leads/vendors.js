/**
 * Vendor API keys for the lead ingestion endpoint.
 *
 * One key per vendor rather than one shared key, for 2 reasons. A vendor whose
 * key leaks can be revoked without taking every other integration down with
 * it. And the source tag is derived from the key rather than read from the
 * payload, so a vendor cannot post leads labelled as somebody else, whether by
 * mistake or otherwise. That matters because the whole reason this endpoint
 * exists is to compare vendors against each other.
 *
 * Configured as LH_LEAD_VENDOR_KEYS in the environment:
 *   acme-leads:sk_live_xxxx,other-vendor:sk_live_yyyy
 *
 * TODO move to a vendors table once the database exists, with an enabled flag
 * and a rotation date. An env var means rotating a key is a redeploy.
 */

import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Parses the configured vendors.
 *
 * Read on every call rather than cached at module load. The cost is trivial
 * and it means a key can be rotated without the old one lingering in a warm
 * serverless instance until it happens to be recycled.
 */
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

/**
 * Constant time comparison of 2 secrets.
 *
 * Hashed first so both sides are the same length. timingSafeEqual throws on a
 * length mismatch, and catching that throw would leak the length of the real
 * key through timing, which is the thing the function exists to prevent.
 */
function secretsMatch(a, b) {
  const left = createHash('sha256').update(String(a)).digest()
  const right = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(left, right)
}

/**
 * Resolves an Authorization header to a vendor, or null.
 *
 * Every configured vendor is compared against, with no early exit on a match,
 * so the time taken does not depend on which vendor the key belongs to or
 * whether it matched at all.
 */
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

/**
 * Whether any vendor is configured at all.
 * Used to answer with a clear "not enabled" rather than a bare 401, which
 * would send an integrator hunting for a wrong key that was never set.
 */
export function ingestionEnabled() {
  return configuredVendors().length > 0
}
