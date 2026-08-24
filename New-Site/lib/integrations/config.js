import 'server-only'
/*================================================================================
    SERVER ONLY, DO NOT REMOVE LINE 1
==================================================================================*/

const SECRET_MARKERS = ['API_KEY', 'APIKEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE_KEY']

export function assertNoPublicSecrets() {
  const offenders = Object.keys(process.env).filter(
    (name) => name.startsWith('NEXT_PUBLIC_') && SECRET_MARKERS.some((marker) => name.includes(marker))
  )

  if (offenders.length > 0) {
    // Names only. Printing the value would defeat the point of the check.
    throw new Error(
      `These environment variables are exposed to the browser and look like secrets: ${offenders.join(
        ', '
      )}. Remove the NEXT_PUBLIC_ prefix. A NEXT_PUBLIC_ variable is compiled into the client bundle and is readable by anyone.`
    )
  }
}

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
  parsed.search = ''

  // Trailing slash removed so callers can join paths without doubling it
  return { url: parsed.toString().replace(/\/$/, ''), error: null }
}

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
============================================================================*/

export function crmConfig() {
  return integrationConfig('LH_CRM', { label: 'CRM' })
}

export function vendorConfig() {
  assertNoPublicSecrets()

  const { url: postUrl, error: urlError } = normaliseBaseUrl(
    process.env.LH_VENDOR_POST_URL,
    'LH_VENDOR_POST_URL'
  )
  const { url: resultsUrl } = normaliseBaseUrl(
    process.env.LH_VENDOR_RESULTS_URL,
    'LH_VENDOR_RESULTS_URL'
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
    resultsUrl,
    vendorId,
    postKey,
    isConfigured: problems.length === 0,
    problems,
  }
}

export function describeVendor(config) {
  return {
    name: config.name,
    label: config.label,
    isConfigured: config.isConfigured,
    postUrl: config.postUrl,
    resultsUrl: config.resultsUrl,
    vendorId: config.vendorId || null,
    hasPostKey: Boolean(config.postKey),
    problems: config.problems,
  }
}
