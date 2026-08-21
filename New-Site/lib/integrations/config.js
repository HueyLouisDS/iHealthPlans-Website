import 'server-only'

/*
 * Credentials for the outbound integrations, the dialer and the CRM.
 */

/*================================================================================
    WHY THE FIRST LINE OF THIS FILE IS `import 'server-only'`

    It makes the build fail if any client component imports this module, even
    indirectly through a chain of imports. That is a compile time guarantee
    rather than a convention somebody has to remember, and it is the only thing
    standing between an api key and a browser bundle.

    Do not remove it, and do not re-export anything from here through a file
    that a client component can reach.

    Three further rules hold these secrets in:

      1. Never NEXT_PUBLIC_. Anything with that prefix is substituted into the
         JavaScript sent to the browser, where it is readable by anyone with
         developer tools. assertNoPublicSecrets below refuses to let the app
         start if one is set.
      2. Never logged. describe() exists so a health check can say whether a
         key is present without ever saying what it is.
      3. Never in an error. A thrown request error can carry the config that
         produced it, so nothing here puts the key in a message.
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

  /* Trailing slash removed so callers can join paths without doubling it */
  return { url: parsed.toString().replace(/\/$/, ''), error: null }
}

/**
 * Reads one integration's settings from the environment.
 *
 * `prefix` is the environment variable prefix, so DIALER reads DIALER_BASE_URL,
 * DIALER_API_ID, and DIALER_API_KEY. One function rather than one per
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

/**
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

/**
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

/*=============================================
    THE DIALER IS TLDIALER, AND LIONSHEAD ALREADY SPEAKS IT

    Everything this file needs to know about TLD came from the LionsHead
    interpreter rather than from guesswork:

      base url        https://<tenant>.tldcrm.com
      auth            tld-api-id and tld-api-key headers
      response shape  results live at response.results
      leads endpoint  requires a date range, unlike the others

    TLD imposes no rate limit. The token bucket and the 100000 query limit in
    the LionsHead interpreter are its own settings, picked for throughput
    rather than to satisfy anything on TLD's side, so do not read them here as
    platform constraints.

    That moves the cost from requests per second to payload size. A 100000 row
    response is a large body to hold in memory and move across the wire, so the
    lever on a big pull is narrowing the columns rather than pacing the calls.

    Before writing a TLD client in this repo, settle whether the website
    should be talking to TLD at all. LionsHead is a python library with a
    working interpreter, rate limiter, pagination, and payload mapping. A
    second client here would duplicate all of it and drift the moment TLD
    changes anything.

    The 3 options, in the order I would rank them:

      1. LionsHead syncs TLD into a shared database and this app reads it.
         No duplicate client, and the admin pages stay fast because they are
         not waiting on somebody else's api.
      2. LionsHead grows a small http surface and this app calls that.
      3. This app talks to TLD directly. Only worth it if the website needs
         something LionsHead will never carry.
=============================================*/

/**
 * The dialer. Reads DIALER_BASE_URL, DIALER_API_ID, DIALER_API_KEY.
 */
export function dialerConfig() {
  return integrationConfig('DIALER', { label: 'Dialer' })
}

/**
 * The CRM. Reads CRM_BASE_URL, CRM_API_ID, CRM_API_KEY.
 */
export function crmConfig() {
  return integrationConfig('CRM', { label: 'CRM' })
}
