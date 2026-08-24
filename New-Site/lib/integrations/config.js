import 'server-only'

/*
 * Credentials for TLD, the CRM API the site reads through and the vendor
 * source it posts leads to.
 */

/*================================================================================
    SERVER ONLY, DO NOT REMOVE LINE 1

    `import 'server-only'` fails the build if a client component imports this
    module through any chain of imports. It is the only compile time guard
    between an api key and a browser bundle. Do not re-export anything from
    here through a file a client component can reach.

    Never NEXT_PUBLIC_, assertNoPublicSecrets below enforces it.
    Never logged, describe() reports presence without the value.
    Never in an error message.
==================================================================================*/

/*
 * Variable names that must never carry the NEXT_PUBLIC_ prefix. Checked as a
 * substring, so NEXT_PUBLIC_DIALER_API_KEY_V2 is caught along with the exact
 * name.
 */
const SECRET_MARKERS = ['API_KEY', 'APIKEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE_KEY']

/*
 * Refuses to run if a secret has been given a publicly exposed name.
 *
 * This is the mistake worth catching automatically, because it is silent. The
 * app works perfectly, the integration works perfectly, and the key is sitting
 * in a JavaScript file that anybody can read. Nothing fails until somebody
 * notices, which may be long after it was scraped.
 */
export function assertNoPublicSecrets() {
  const offenders = Object.keys(process.env).filter(
    (name) => name.startsWith('NEXT_PUBLIC_') && SECRET_MARKERS.some((marker) => name.includes(marker))
  )

  if (offenders.length > 0) {
    /* Names only. Printing the value would defeat the point of the check. */
    throw new Error(
      `These environment variables are exposed to the browser and look like secrets: ${offenders.join(
        ', '
      )}. Remove the NEXT_PUBLIC_ prefix. A NEXT_PUBLIC_ variable is compiled into the client bundle and is readable by anyone.`
    )
  }
}

/*
 * Checks a base url is safe to send beneficiary data to.
 *
 * https is required, because the payloads carry names, phone numbers, and plan
 * details for Medicare beneficiaries. Plain http on localhost is allowed so an
 * integration can be developed against a local mock, and nowhere else.
 *
 * Any username or password embedded in the url is stripped. Credentials belong
 * in a header, not in a string that ends up in logs, error messages, and
 * referrer headers.
 */
function normaliseBaseUrl(value, name) {
  const raw = String(value || '').trim()
  if (!raw) return { url: null, error: null }

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return { url: null, error: `${name} is not a valid url.` }
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    return { url: null, error: `${name} must be https. Beneficiary data cannot go over plain http.` }
  }

  parsed.username = ''
  parsed.password = ''

  /*
   * The query string goes too. TLD's vendor post endpoint takes its post key
   * as a url parameter, so a base url pasted straight from their instructions
   * arrives here carrying a live credential. Left on, it would be stored, and
   * describe() below would print it to any health check or screenshot.
   *
   * Parameters are added at the call site instead, where they are used once
   * and never held.
   */
  parsed.search = ''

  /* Trailing slash removed so callers can join paths without doubling it */
  return { url: parsed.toString().replace(/\/$/, ''), error: null }
}

/*
 * Reads one integration's settings from the environment.
 *
 * `prefix` is the environment variable prefix, so CRM reads LH_CRM_BASE_URL,
 * LH_CRM_API_ID, and LH_CRM_API_KEY. One function rather than one per
 * integration, because 2 copies of this drift and the copy that drifts is the
 * one that stops checking https.
 *
 * Returns a config that is never partially usable. Either all 3 values are
 * present and valid, in which case isConfigured is true, or it is false and
 * `problems` says exactly what is missing. Half a configuration is how a
 * request goes out to the right host with no key and gets logged as a 401
 * nobody investigates.
 */
export function integrationConfig(prefix, { label } = {}) {
  assertNoPublicSecrets()

  const baseUrlRaw = process.env[`${prefix}_BASE_URL`]
  const apiId = String(process.env[`${prefix}_API_ID`] || '').trim()
  const apiKey = String(process.env[`${prefix}_API_KEY`] || '').trim()

  const { url: baseUrl, error: urlError } = normaliseBaseUrl(baseUrlRaw, `${prefix}_BASE_URL`)

  const problems = []
  if (!baseUrlRaw) problems.push(`${prefix}_BASE_URL is not set.`)
  else if (urlError) problems.push(urlError)
  if (!apiId) problems.push(`${prefix}_API_ID is not set.`)
  if (!apiKey) problems.push(`${prefix}_API_KEY is not set.`)

  return {
    name: prefix.toLowerCase(),
    label: label || prefix.toLowerCase(),
    baseUrl,
    apiId,
    apiKey,
    isConfigured: problems.length === 0,
    problems,
  }
}

/*
 * A view of a config that is safe to render, log, or screenshot.
 *
 * The key is reported as present or absent and never shown, not even
 * partially. A prefix of a key is still a prefix of a key, and it narrows a
 * brute force search for anyone who gets hold of it.
 */
export function describe(config) {
  return {
    name: config.name,
    label: config.label,
    isConfigured: config.isConfigured,
    baseUrl: config.baseUrl,
    apiId: config.apiId || null,
    hasApiKey: Boolean(config.apiKey),
    problems: config.problems,
  }
}

/*
 * Authorization headers for an outbound request.
 *
 * Here rather than at each call site so there is one place that knows how the
 * credential is presented.
 *
 * TLDialer takes 2 flat headers rather than a bearer token, confirmed against
 * AUTH_HEADER_NAMES in the LionsHead tld interpreter. Both are required, the
 * id alone authenticates nothing.
 */
export function authHeaders(config) {
  if (!config.isConfigured) {
    throw new Error(`${config.label} is not configured: ${config.problems.join(' ')}`)
  }

  return {
    'tld-api-id': config.apiId,
    'tld-api-key': config.apiKey,
  }
}

/*============================================================================
    TLD REFERENCE

    base url        https://<tenant>.tldcrm.com
    auth            tld-api-id and tld-api-key headers
    response shape  results live at response.results
    leads endpoint  requires a date range, unlike the others
    rate limit      none

    No rate limit means the cost is payload size, not requests per second.
    Narrow the columns on a big pull rather than pacing the calls.

    The vendor post endpoint authenticates differently, see vendorConfig.
============================================================================*/

/*
 * TLD. Reads LH_CRM_BASE_URL, LH_CRM_API_ID, LH_CRM_API_KEY.
 *
 * One config for everything the site reads, calls and agents included. TLD
 * exposes the VICIdial data as a field option on each endpoint rather than as
 * a separate connection, so a second credential set would be the same 3 values
 * typed twice, and 2 configs that must always match drift eventually.
 */
export function crmConfig() {
  return integrationConfig('LH_CRM', { label: 'CRM' })
}

/*
 * The vendor post endpoint, which is how the site writes a lead into TLD.
 *
 * Separate from integrationConfig above because it authenticates completely
 * differently. The reporting api takes tld-api-id and tld-api-key headers.
 * This one takes a vendor id and a post key as url parameters, on a POST, and
 * there is no header form of it.
 *
 * The vendor id changes between the test vendor and the live one, so both it
 * and the key are environment configuration rather than anything committed.
 */
export function vendorConfig() {
  assertNoPublicSecrets()

  const { url: postUrl, error: urlError } = normaliseBaseUrl(
    process.env.LH_VENDOR_POST_URL,
    'LH_VENDOR_POST_URL'
  )

  const vendorId = String(process.env.LH_VENDOR_ID || '').trim()
  const postKey = String(process.env.LH_VENDOR_POST_KEY || '').trim()

  const problems = []
  if (!process.env.LH_VENDOR_POST_URL) problems.push('LH_VENDOR_POST_URL is not set.')
  else if (urlError) problems.push(urlError)
  if (!vendorId) problems.push('LH_VENDOR_ID is not set.')
  if (!postKey) problems.push('LH_VENDOR_POST_KEY is not set.')

  return {
    name: 'vendor',
    label: 'Vendor',
    postUrl,
    vendorId,
    postKey,
    isConfigured: problems.length === 0,
    problems,
  }
}

/*
 * A view of the post config safe to render or log.
 *
 * describe() above cannot be reused, because it returns apiId in the clear.
 * That is fine for an api id, which identifies rather than authenticates, and
 * wrong for a post key, which is the whole credential.
 */
export function describeVendor(config) {
  return {
    name: config.name,
    label: config.label,
    isConfigured: config.isConfigured,
    postUrl: config.postUrl,
    vendorId: config.vendorId || null,
    hasPostKey: Boolean(config.postKey),
    problems: config.problems,
  }
}
