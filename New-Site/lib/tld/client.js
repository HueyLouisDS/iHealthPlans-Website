// HTTP client for the TLD reporting API. Auth, pagination, and unwrapping the
// response envelope. Knows nothing about what the data means, that is
// resources.js.

import 'server-only'

import { crmConfig, authHeaders } from '@/lib/integrations/config'

const REQUEST_TIMEOUT_MS = 60000        // a wide pull is slow, and nobody is watching a cron
const DEFAULT_PAGE_SIZE = 5000          // rows per request, see the banner

/*=======================================================
        NO RATE LIMIT MEANS PAYLOAD SIZE IS THE COST
========================================================*/

/*
 * TLD imposes no request limit, so nothing here paces the calls. What it does
 * do is keep the pages large and the columns narrow, because the expensive
 * part is holding and moving the body rather than making the request.
 *
 * If a pull starts running out of memory, lower DEFAULT_PAGE_SIZE before
 * touching anything else. A resource can override it, see resources.js.
 */

/**
 * Fetches one page from a TLD endpoint.
 *
 * Returns { rows, error }. Never throws, because a sync of 5 resources should
 * record which one failed and carry on rather than dying on the first bad
 * response and leaving the other 4 stale with no explanation.
 */
export async function fetchPage(path, params = {}) {
  const config = crmConfig()

  if (!config.isConfigured) {
    return { rows: null, error: `TLD is not configured: ${config.problems.join(' ')}` }
  }

  const url = new URL(`${config.baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  let response
  try {
    response = await fetch(url, {
      headers: { ...authHeaders(config), Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (cause) {
    /* Message only. The cause carries the url, and the url carries the path. */
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

  let body
  try {
    body = await response.json()
  } catch {
    return { rows: null, error: `${path} did not return JSON.` }
  }

  /*
   * TLD wraps rows in response.results. Both shapes are accepted because an
   * endpoint that returns a bare array would otherwise look like zero rows,
   * and zero rows is indistinguishable from a quiet day.
   */
  const rows = Array.isArray(body) ? body : body?.results

  if (!Array.isArray(rows)) {
    return { rows: null, error: `${path} returned no results array.` }
  }

  return { rows, error: null }
}

/**
 * Fetches every page of an endpoint.
 *
 * Stops on a short page, which is the only reliable end signal when the total
 * is not returned. A page that comes back exactly full is followed by one more
 * request that usually returns nothing, and that is cheaper than trusting a
 * count TLD may not send.
 *
 * MAX_PAGES exists so a paging bug cannot loop forever against an api with no
 * rate limit. Hitting it is reported rather than silently truncating, because
 * a partial pull that reads as complete is the failure this whole layer is
 * built to avoid.
 */
const MAX_PAGES = 200

export async function fetchAll(path, params = {}, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const all = []                        // every row across every page
  let offset = 0                        // rows already collected, TLD's offset param

  for (let page = 0; page < MAX_PAGES; page += 1) {
    /*
     * TODO confirm the paging parameter names against the live api. limit and
     * offset are the common pair, but if TLD uses page and per_page this is
     * the one place to change it.
     */
    const { rows, error } = await fetchPage(path, { ...params, limit: pageSize, offset })

    if (error) return { rows: null, error, partial: all.length }

    all.push(...rows)

    // A short page is the last page
    if (rows.length < pageSize) return { rows: all, error: null, partial: 0 }

    offset += rows.length
  }

  return {
    rows: null,
    error: `${path} exceeded ${MAX_PAGES} pages. Refusing to write a partial pull.`,
    partial: all.length,
  }
}
