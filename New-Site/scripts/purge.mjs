// Strips the identifying columns from lead records older than the retention
// window, which is what the privacy policy promises under "How long we keep
// it". TLD keeps the full record for 10 years, so this only thins our own
// reporting copy, it does not destroy the business record.
//
//   node scripts/purge.mjs           report what would change, write nothing
//   node scripts/purge.mjs --apply   write it
//
// Safe to run repeatedly. Every statement skips rows already redacted, so a
// second run reports 0 without touching anything.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { resolveDbConfig } from '../lib/db/dsn.js'

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
  // The environment may already carry the values
}

/*-------- This is critical --------*/
/*
 RETENTION_MONTHS is published on the privacy policy. Changing it here without
 changing the page makes the page a false statement, which is the specific
 thing the whole notice exists to avoid. Both move together or neither does.

 The redaction markers exist because phone and ip_address are NOT NULL. A
 marker is not an anonymised value, it is a tombstone saying a real one used
 to be here, so never treat a row carrying one as still holding a number.
*/
const RETENTION_MONTHS = 24             // must match lib/content/legal.js, privacy policy
const PHONE_REDACTED = 'REDACTED'       // leads.phone and dialer_leads.phone are NOT NULL
const IP_REDACTED = '0.0.0.0'           // lead_consents.ip_address is NOT NULL

/*
 Each entry is one table, the timestamp that decides its age, and the columns
 to clear. Order does not matter, none of these are foreign keys.
*/
const TARGETS = [
  {
    table: 'leads',
    ageColumn: 'received_at',
    sets: [
      'first_name = NULL',
      'last_name = NULL',
      'email = NULL',
      `phone = '${PHONE_REDACTED}'`,
    ],
    // Already done when the phone carries the marker
    guard: `phone <> '${PHONE_REDACTED}'`,
  },
  {
    table: 'dialer_leads',
    // created_at is nullable, and a null would never age out, so it falls
    // back to the time we first mirrored the row
    ageColumn: 'COALESCE(created_at, synced_at)',
    sets: [
      'first_name = NULL',
      'last_name = NULL',
      'email = NULL',
      `phone = '${PHONE_REDACTED}'`,
    ],
    guard: `phone <> '${PHONE_REDACTED}'`,
  },
  {
    table: 'lead_consents',
    ageColumn: 'captured_at',
    sets: [`ip_address = '${IP_REDACTED}'`],
    guard: `ip_address <> '${IP_REDACTED}'`,
  },
  {
    table: 'calls',
    ageColumn: 'started_at',
    sets: ['customer_number = NULL'],
    guard: 'customer_number IS NOT NULL',
  },
]

// counts rows a target would touch, without touching them
async function countPending(client, target) {
  const sql = `
    SELECT count(*) AS n
      FROM ${target.table}
     WHERE ${target.ageColumn} < now() - INTERVAL '${RETENTION_MONTHS} months'
       AND ${target.guard}`

  const { rows } = await client.query(sql)
  return Number(rows[0].n)
}

// clears the columns and returns how many rows changed
async function redact(client, target) {
  const sql = `
    UPDATE ${target.table}
       SET ${target.sets.join(', ')}
     WHERE ${target.ageColumn} < now() - INTERVAL '${RETENTION_MONTHS} months'
       AND ${target.guard}`

  const result = await client.query(sql)
  return result.rowCount
}

async function main() {
  const apply = process.argv.includes('--apply')

  const { config, problems } = resolveDbConfig()
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
  }

  const client = new pg.Client(config)
  await client.connect()

  console.log(`Retention window ${RETENTION_MONTHS} months.`)
  console.log(apply ? 'Applying.\n' : 'Dry run, nothing will be written. Pass --apply to write.\n')

  let total = 0

  try {
    for (const target of TARGETS) {
      const pending = await countPending(client, target)
      total += pending

      if (!pending) {
        console.log(`  ${target.table.padEnd(14)} nothing to do`)
        continue
      }

      if (!apply) {
        console.log(`  ${target.table.padEnd(14)} ${pending} rows would be redacted`)
        continue
      }

      const changed = await redact(client, target)
      console.log(`  ${target.table.padEnd(14)} ${changed} rows redacted`)
    }
  } finally {
    await client.end()
  }

  console.log(`\n${total} rows past the window.`)
  if (total && !apply) console.log('Run again with --apply to write.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
