import 'server-only'

/**
 * Read caching for the admin pages, and the freshness they report alongside
 * the numbers.
 *
 * The dashboard runs 4 aggregations over 90 days of calls and leads. Those are
 * milliseconds against a local database and were seconds against an api, but
 * they are still the same 4 queries on every render for every viewer, and
 * during AEP that is the same work done thousands of times for a result that
 * changes when the sync runs and at no other moment.
 *
 * So results are cached against the sync, not against a clock. A number stays
 * cached until new data replaces it, which means the cache is never stale and
 * never needlessly cold.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne, databaseConfigured } from '@/lib/db/client'

/*
 * Cache tags, one per synced resource. Invalidated by the sync when it writes,
 * so a page depending on calls refreshes when calls land and not when leads do.
 */
export const TAGS = {
  calls: 'db:calls',
  leads: 'db:leads',
  policies: 'db:policies',
  agents: 'db:agents',
  attribution: 'db:attribution',
  sync: 'db:sync',
}

/*
 * A ceiling rather than a schedule. Anything cached is invalidated by the sync
 * the moment new data arrives, so this only matters if a sync silently stops.
 * An hour old number is recoverable, a number cached since Tuesday is how
 * somebody makes a decision on last week's data without knowing it.
 */
const MAX_AGE_SECONDS = 3600

/**
 * Wraps a query function so its result is cached and tagged.
 *
 * `key` must be unique per distinct result, so it has to include the
 * parameters. Two calls sharing a key return each other's rows, and with a
 * period selector on every page that mistake shows one person the 7 day
 * numbers under a 90 day heading.
 */
export function cached(fn, { key, tags, maxAge = MAX_AGE_SECONDS }) {
  return unstable_cache(fn, Array.isArray(key) ? key : [key], {
    tags: Array.isArray(tags) ? tags : [tags],
    revalidate: maxAge,
  })
}

/**
 * A cached aggregate query, which is the common case.
 *
 * The parameters are folded into the cache key automatically, which is the
 * part that is easy to forget by hand.
 */
export function cachedQuery(sql, { name, tags, maxAge } = {}) {
  return async (params = {}) => {
    const runner = cached(async () => query(sql, params), {
      key: [name, JSON.stringify(params)],
      tags,
      maxAge,
    })
    return runner()
  }
}

/**
 * How fresh each resource is.
 *
 * Read uncached on purpose. This is the one number that must never be served
 * from a cache, because a cached freshness reading would keep saying the data
 * is 2 minutes old for an hour after the sync died.
 */
export async function syncFreshness() {
  if (!databaseConfigured()) return []

  return query(
    `SELECT resource, last_run_at, last_success_at, rows_last_run, rows_total,
            status, last_error, duration_ms
       FROM sync_state
      ORDER BY resource`
  )
}

/**
 * Freshness for one resource, for a page that only depends on one.
 */
export async function resourceFreshness(resource) {
  if (!databaseConfigured()) return null

  return queryOne(
    `SELECT resource, last_run_at, last_success_at, status, last_error
       FROM sync_state
      WHERE resource = :resource`,
    { resource }
  )
}

/**
 * Turns a last success timestamp into something a person can read.
 *
 * Returns a staleness band as well as the words, so a page can colour a
 * warning without re-deriving the arithmetic. An hour is fine, 6 hours during
 * AEP is not, and a page should be able to say which it is looking at.
 */
export function describeFreshness(row, now = new Date()) {
  if (!row?.last_success_at) {
    return { label: 'never synced', minutesAgo: null, band: 'unknown' }
  }

  /* Stored UTC with dateStrings on, so the Z is added rather than assumed */
  const at = new Date(`${String(row.last_success_at).replace(' ', 'T')}Z`)
  const minutesAgo = Math.max(0, Math.round((now - at) / 60_000))

  const band = minutesAgo <= 15 ? 'fresh' : minutesAgo <= 120 ? 'ageing' : 'stale'

  if (minutesAgo < 1) return { label: 'just now', minutesAgo, band }
  if (minutesAgo < 60) return { label: `${minutesAgo} min ago`, minutesAgo, band }

  const hours = Math.round(minutesAgo / 60)
  if (hours < 24) return { label: `${hours}h ago`, minutesAgo, band }

  return { label: `${Math.round(hours / 24)}d ago`, minutesAgo, band }
}
