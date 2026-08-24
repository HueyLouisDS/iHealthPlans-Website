/**
 * Calls the sync endpoint. This is what cron runs.
 *
 * Deliberately thin. The work happens in /api/admin/sync because the `@/`
 * alias, `import 'server-only'`, and revalidateTag all need the Next runtime,
 * and a script that pulled the data without invalidating the cache would leave
 * the admin pages showing yesterday's numbers over today's rows.
 *
 * Usage:
 *   node scripts/sync.mjs                  full sync
 *   node scripts/sync.mjs --only calls     one resource
 *   node scripts/sync.mjs --dry-run        fetch and map, write nothing
 *   node scripts/sync.mjs --inspect        report the field mapping
 *
 * Reads LH_SITE_URL and LH_CRON_SECRET from .env.local.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
  /* No .env.local is fine when the values come from the real environment */
}

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : null
}

const siteUrl = (process.env.LH_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const secret = String(process.env.LH_CRON_SECRET || '').trim()

if (!secret) {
  console.error('LH_CRON_SECRET is not set. Generate one with:  openssl rand -hex 32')
  process.exit(2)
}

const body = {
  only: value('--only'),
  dryRun: flag('--dry-run'),
  inspect: flag('--inspect'),
}

const response = await fetch(`${siteUrl}/api/admin/sync`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-lh-cron-secret': secret },
  body: JSON.stringify(body),
})

const result = await response.json()

if (body.inspect) {
  for (const finding of result.findings || []) {
    console.log(`\n${finding.name}  ${finding.path}`)

    if (finding.error) {
      console.log(`  FAILED  ${finding.error}`)
      continue
    }

    if (finding.sampleRows === 0) {
      console.log('  no rows came back, so there is nothing to compare the map against')
      continue
    }

    console.log(
      finding.missing.length === 0
        ? '  every mapped field is present'
        : `  MISSING, the map expects these and TLD did not send them:\n    ${finding.missing.join(', ')}`
    )

    if (finding.unused.length > 0) {
      console.log(`  available but unmapped:\n    ${finding.unused.join(', ')}`)
    }
  }
  process.exit(result.findings?.some((f) => f.error || f.missing?.length) ? 1 : 0)
}

for (const one of result.results || []) {
  console.log(
    one.ok
      ? `  ok      ${one.name.padEnd(14)} ${one.rows} rows${one.total ? `, ${one.total} total` : ''}${one.missing ? `, ${one.missing} newly missing` : ''}`
      : `  FAILED  ${one.name.padEnd(14)} ${one.error}`
  )
}

if (result.error) console.error(result.error)

console.log(`\n${result.ok ? 'done' : 'finished with failures'} in ${result.durationMs}ms`)
process.exit(result.ok ? 0 : 1)
