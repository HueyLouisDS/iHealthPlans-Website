// Live checks for the integration credentials, behind the Test Connection
// buttons on /admin/integrations. Each one proves the credential works without
// changing anything on TLD's side.

import 'server-only'

const TIMEOUT_MS = 10000                 // longer than the push, a person is watching this one

/*=======================================================
        THE VENDOR TEST MUST NOT CREATE A LEAD
========================================================*/

/*
 * The vendor endpoint's only job is creating leads, so an ordinary test post
 * would put a fake person into the client's CRM every time somebody clicked
 * the button, and an agent would eventually call one.
 *
 * So the test posts nothing. TLD answers an empty payload with code 104, you
 * must provide at least one valid phone number or one valid email address,
 * and that answer is only reachable once the vendor id and post key have
 * already been accepted. The credential failures are 97, 98, 99 and 100.
 *
 * 104 back therefore means authenticated, vendor active, nothing written.
 */
const VENDOR_AUTH_FAILURES = {
  97: 'No post key was provided.',
  98: 'The post key is not valid for this vendor.',
  99: 'No vendor was selected, check the vendor id.',
  100: 'This vendor post is inactive in TLD.',
  94: 'That vendor does not exist.',
}

/* The answer that means the credentials passed and validation stopped it */
const VENDOR_EXPECTED_CODE = 104

/*
 * The path used to prove the CRM key works. Any authenticated read would do,
 * this one is small and takes no date range, unlike leads.
 *
 * TODO confirm against the live tenant. If the test comes back 404 rather than
 * 200 or 401 this is the line to change, and a 404 still tells you the host is
 * right and the request was not rejected as unauthorised.
 */
const CRM_TEST_PATH = '/api/egress/policies?limit=1'

/*
 * Wraps fetch with a timeout and turns network failures into a result rather
 * than a throw, so a caller never has to distinguish the two.
 */
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

    /* The message only. The cause carries the url, and the url carries keys. */
    return { response: null, error: message }
  }
}

/**
 * Checks the TLD API key with a small authenticated read.
 *
 * A 401 or 403 is the only definite failure, since it means the host answered
 * and rejected the credential. Everything else is reported as reached, with
 * the status, because a 404 proves the key was accepted and only the path was
 * wrong, and calling that a credential failure would send somebody hunting for
 * a key that works fine.
 */
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

/*
 * Checks the vendor source without writing a lead.
 *
 * See the banner above. An empty payload is refused by validation, and getting
 * as far as validation is itself the proof that the vendor id and post key were
 * accepted.
 */
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

  /*
   * Any other code still means TLD read the request and answered as itself, so
   * the credentials worked. Reported rather than treated as a pass, because an
   * unexpected code here is worth a human looking at before leads depend on it.
   */
  return {
    ok: false,
    message: `Unexpected response, code ${raw}. Credentials look accepted but this needs checking.`,
  }
}
