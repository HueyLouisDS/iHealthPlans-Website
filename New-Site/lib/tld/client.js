// HTTP client for the TLD reporting API. Auth, pagination, and unwrapping the
// response envelope. Knows nothing about what the data means, that is
// resources.js.

import 'server-only'

import { crmConfig, authHeaders } from '@/lib/integrations/config'

const REQUEST_TIMEOUT_MS = 60000        // ceiling per request, a wide pull is slow
const DEFAULT_PAGE_SIZE = 5000          // rows per request, overridable per resource
const MAX_PAGES = 200                   // pages before a pull is abandoned

/*=======================================================
        NO RATE LIMIT MEANS PAYLOAD SIZE IS THE COST
========================================================*/

// one page from a TLD endpoint, as { rows, error }, never throwing
export async function fetchPage(path, params = {}) {
  const config = crmConfig()            // credentials and base url

  if (!config.isConfigured) {
    return { rows: null, error: `TLD is not configured: ${config.problems.join(' ')}` }
  }

  const url = new URL(`${config.baseUrl}${path}`)

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  let response                          // the raw fetch result, unread
  try {
    response = await fetch(url, {
      headers: { ...authHeaders(config), Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (cause) {
    // message only, the cause carries the url and the url carries the key
    return {
      rows: null,
      error: cause.name === 'TimeoutError' ? `${path} timed out.` : `${path} could not be reached.`,
    }
  }

  if (response.status === 401 || response.status === 403) {
    return { rows: null, error: `${path} rejected the api key, HTTP ${response.status}.` }
  }

  if (!response.ok) {
    return { rows: null, error: `${path} returned HTTP ${response.status}.` }
  }

  let body                              // parsed json, shape not yet checked
  try {
    body = await response.json()
  } catch {
    return { rows: null, error: `${path} did not return JSON.` }
  }

  const rows = Array.isArray(body) ? body : body?.results   // TLD wraps in .results

  if (!Array.isArray(rows)) {
    return { rows: null, error: `${path} returned no results array.` }
  }

  return { rows, error: null }
}

/*-------- This is critical --------*/

/* every page of an endpoint, stopping short of a partial pull */
export async function fetchAll(path, params = {}, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const all = []                        // every row across every page
  let offset = 0                        // rows already collected, TLD's offset param

  /*
   Returning rows alongside an error would let the caller write a partial pull
   over a full table. Every failure path below returns rows: null instead, and
   the row count moves to `partial` where it cannot be mistaken for data.

   A short page is the end signal. TLD does not return a total, so trusting one
   is not an option, and MAX_PAGES exists only so a paging bug cannot spin
   forever against an api with no rate limit.
  */
  for (let page = 0; page < MAX_PAGES; page += 1) {
    /*
     TODO confirm the paging parameter names against the live api. limit and
     offset are the common pair, but if TLD uses page and per_page this is the
     one place to change it.
    */
    const { rows, error } = await fetchPage(path, { ...params, limit: pageSize, offset })

    if (error) return { rows: null, error, partial: all.length }

    all.push(...rows)

    if (rows.length < pageSize) return { rows: all, error: null, partial: 0 }

    offset += rows.length
  }

  return {
    rows: null,
    error: `${path} exceeded ${MAX_PAGES} pages. Refusing to write a partial pull.`,
    partial: all.length,
  }
}
