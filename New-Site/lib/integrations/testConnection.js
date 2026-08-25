// Live checks for the integration credentials, behind the Test Connection
// buttons on /admin/integrations. Each one proves the credential works without
// changing anything on TLD's side.

import 'server-only'

import { EMAIL_SHAPE } from '@/lib/integrations/fields'

const TIMEOUT_MS = 10000                // longer than the push, a person is watching this one

/*=======================================================
        THE VENDOR TEST MUST NOT CREATE A LEAD
========================================================*/

const VENDOR_AUTH_FAILURES = {
  97: 'No post key was provided.',
  98: 'The post key is not valid for this vendor.',
  99: 'No vendor was selected, check the vendor id.',
  100: 'This vendor post is inactive in TLD.',
  94: 'That vendor does not exist.',
}

const VENDOR_EXPECTED_CODE = 104        // credentials passed, validation stopped it
const CRM_TEST_PATH = '/api/egress/policies?limit=1'

async function attempt(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    return { response, error: null }
  } catch (cause) {
    const message =
      cause.name === 'TimeoutError'
        ? 'Timed out. Check the base url.'
        : 'Could not reach that host.'

    // The message only. The cause carries the url, and the url carries keys.
    return { response: null, error: message }
  }
}

export async function testCrm({ baseUrl, apiId, apiKey }) {
  if (!baseUrl || !apiId || !apiKey) {
    return { ok: false, message: 'Fill in the base url, api id and api key first.' }
  }

  const { response, error } = await attempt(`${baseUrl}${CRM_TEST_PATH}`, {
    headers: { 'tld-api-id': apiId, 'tld-api-key': apiKey },
  })

  if (error) return { ok: false, message: error }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: `Rejected, HTTP ${response.status}. The api id or key is wrong.` }
  }

  if (response.ok) {
    return { ok: true, message: 'Connected.' }
  }

  return {
    ok: false,
    message: `Reached TLD but got HTTP ${response.status}. The credential was not rejected, so the test path is probably wrong rather than the key.`,
  }
}

export async function testVendor({ postUrl, vendorId, postKey }) {
  if (!postUrl || !vendorId || !postKey) {
    return { ok: false, message: 'Fill in the post url, vendor id and post key first.' }
  }

  const url = new URL(postUrl)
  url.searchParams.set('vendor_id', vendorId)
  url.searchParams.set('post_key', postKey)

  const { response, error } = await attempt(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // Deliberately empty. See the banner.
    body: new URLSearchParams(),
  })

  if (error) return { ok: false, message: error }

  if (!response.ok) {
    return { ok: false, message: `Reached the host but got HTTP ${response.status}.` }
  }

  const raw = (await response.text()).trim()
  const code = Number.parseInt(raw, 10)

  if (VENDOR_AUTH_FAILURES[code]) {
    return { ok: false, message: VENDOR_AUTH_FAILURES[code] }
  }

  if (code === VENDOR_EXPECTED_CODE) {
    return { ok: true, message: 'Connected. Nothing was written.' }
  }

  return {
    ok: false,
    message: `Unexpected response, code ${raw}. Credentials look accepted but this needs checking.`,
  }
}

/* checks the admin allowlist is coherent, since a mismatch locks everyone out */
export function testAdminAccess({ domain, emails }) {
  const cleanDomain = String(domain || '').trim().toLowerCase()
  const list = String(emails || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  if (!cleanDomain) {
    return { ok: false, message: 'LH_ADMIN_ALLOWED_DOMAIN is not set in the environment.' }
  }
  if (list.length === 0) return { ok: false, message: 'No addresses listed, so nobody can sign in.' }

  const wrongDomain = list.filter((email) => email.split('@')[1] !== cleanDomain)
  if (wrongDomain.length > 0) {
    return {
      ok: false,
      message: `Not on ${cleanDomain}, so these would be refused: ${wrongDomain.join(', ')}`,
    }
  }

  const malformed = list.filter((email) => !EMAIL_SHAPE.test(email))
  if (malformed.length > 0) {
    return { ok: false, message: `Not a valid address: ${malformed.join(', ')}` }
  }

  return { ok: true, message: `${list.length} ${list.length === 1 ? 'person' : 'people'} can sign in.` }
}
