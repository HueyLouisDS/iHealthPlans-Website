/**
 * Url building for the admin list pages.
 *
 * Deliberately not inside FilterPanel. That file is 'use client', and a
 * function exported from a client module cannot be called on the server, only
 * rendered as a component or passed as a prop. The server pages need this for
 * their pagination links, so it lives in a plain module both sides can import.
 */

/**
 * Builds a url that keeps the current parameters and changes only what is
 * passed. Without this, choosing a filter would silently drop the others,
 * which is the usual way filter bars end up untrustworthy.
 *
 * page=1 is omitted so the first page has a clean url rather than a redundant
 * parameter that makes two identical views look like different ones.
 */
export function buildHref(basePath, paramKeys, params, overrides) {
  const next = new URLSearchParams()
  const merged = { ...params, ...overrides }

  for (const key of paramKeys) {
    const value = merged[key]
    if (value && !(key === 'page' && String(value) === '1')) next.set(key, String(value))
  }

  const query = next.toString()
  return query ? `${basePath}?${query}` : basePath
}
