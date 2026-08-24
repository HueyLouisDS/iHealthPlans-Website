import 'server-only'
import { unstable_cache } from 'next/cache'
import { query, queryOne, databaseConfigured } from '@/lib/db/client'

export const TAGS = {
  calls: 'db:calls',
  leads: 'db:leads',
  policies: 'db:policies',
  agents: 'db:agents',
  attribution: 'db:attribution',
  sync: 'db:sync',
}

const MAX_AGE_SECONDS = 3600

export function cached(fn, { key, tags, maxAge = MAX_AGE_SECONDS }) {
  return unstable_cache(fn, Array.isArray(key) ? key : [key], {
    tags: Array.isArray(tags) ? tags : [tags],
    revalidate: maxAge,
  })
}

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

export async function syncFreshness() {
  if (!databaseConfigured()) return []

  return query(
    `SELECT resource, last_run_at, last_success_at, rows_last_run, rows_total,
            status, last_error, duration_ms
       FROM sync_state
      ORDER BY resource`
  )
}

export async function resourceFreshness(resource) {
  if (!databaseConfigured()) return null

  return queryOne(
    `SELECT resource, last_run_at, last_success_at, status, last_error
       FROM sync_state
      WHERE resource = :resource`,
    { resource }
  )
}

export function describeFreshness(row, now = new Date()) {
  if (!row?.last_success_at) {
    return { label: 'never synced', minutesAgo: null, band: 'unknown' }
  }

  // Stored UTC with dateStrings on, so the Z is added rather than assumed
  const at = new Date(`${String(row.last_success_at).replace(' ', 'T')}Z`)
  const minutesAgo = Math.max(0, Math.round((now - at) / 60_000))

  const band = minutesAgo <= 15 ? 'fresh' : minutesAgo <= 120 ? 'ageing' : 'stale'

  if (minutesAgo < 1) return { label: 'just now', minutesAgo, band }
  if (minutesAgo < 60) return { label: `${minutesAgo} min ago`, minutesAgo, band }

  const hours = Math.round(minutesAgo / 60)
  if (hours < 24) return { label: `${hours}h ago`, minutesAgo, band }

  return { label: `${Math.round(hours / 24)}d ago`, minutesAgo, band }
}
