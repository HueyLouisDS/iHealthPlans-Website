// Writes a realistic dataset into the database, for checking the reporting
// queries against something other than an empty schema.
//
//   node scripts/seed.mjs          insert
//   node scripts/seed.mjs --clear  delete everything it inserted
//
// Deterministic, so 2 runs produce the same numbers and a comparison against
// the fixtures means something.
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { resolveDbConfig } from '../lib/db/dsn.js'

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
  // The environment may already carry the values
}

/*=============================================
    THIS WRITES FABRICATED PEOPLE. NEVER RUN IT
    AGAINST A DATABASE HOLDING REAL LEADS.
=============================================*/
const DAYS = 120                        // longer than 90, so retention has something to measure
const LEAD_COUNT = 600
const SESSION_MULTIPLIER = 40           // sessions per lead, roughly a 2.5% form rate

const SOURCES = [
  ['google', 'cpc'],
  ['google', 'organic'],
  ['bing', 'cpc'],
  ['facebook', 'paid_social'],
  ['(direct)', '(none)'],
  ['medicare.gov', 'referral'],
]

const CAMPAIGNS = ['aep-brand', 'aep-generic-ma', 'dsnp-always-on', 'part-d-generic', null]
const PAGES = ['/', '/medicare-advantage', '/dual-eligible-snp', '/prescription-drug-plans']
const FIRST = ['Marguerite', 'Cornelius', 'Delphine', 'Rowan', 'Estelle', 'Barnaby', 'Winifred']
const LAST = ['Ashcombe', 'Dunwoody', 'Fairweather', 'Hollingsworth', 'Pemberton', 'Rookwood']

const DISPOSITIONS = [
  ['SALE', 'Sale', 'sale', true],
  ['XFER', 'Transferred', 'contact', true],
  ['NI', 'Not interested', 'contact', false],
  ['NA', 'No answer', 'no_contact', false],
  ['VM', 'Voicemail', 'no_contact', false],
]

const AGENTS = [
  ['ag-01', 'A. Rivera'],
  ['ag-02', 'D. Okonkwo'],
  ['ag-03', 'M. Lindqvist'],
  ['ag-04', 'J. Castellanos'],
]

// Same generator the fixtures use, so the numbers are reproducible
function makeRng(seed) {
  let a = seed >>> 0
  return function next() {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = makeRng(20260827)
const pick = (list) => list[Math.floor(rng() * list.length)]

function daysAgo(days, hour = 12) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, Math.floor(rng() * 60))
}

function firstOfMonthAfter(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

const TABLES = [
  'lead_consents',
  'call_clicks',
  'calls',
  'policies',
  'dialer_leads',
  'leads',
  'sessions',
  'visitors',
  'agents',
  'dispositions',
]

/*=============================================
    ONE ROUND TRIP PER BATCH, NOT PER ROW
=============================================*/

/*
 A managed Postgres sits behind a network. 25,000 single row inserts is 25,000
 round trips, which took half an hour on the first version of this script and
 looked like a hang. Batched into multi row VALUES it is under a minute.

 Postgres caps a statement at 65535 parameters, so the batch size is chosen
 from the column count rather than fixed.
*/
async function insertMany(client, table, columns, rows) {
  if (rows.length === 0) return 0

  const perRow = columns.length
  const size = Math.max(1, Math.floor(60000 / perRow))
  let written = 0

  for (let start = 0; start < rows.length; start += size) {
    const batch = rows.slice(start, start + size)

    const values = batch
      .map((_, r) => `(${columns.map((_, c) => `$${r * perRow + c + 1}`).join(', ')})`)
      .join(', ')

    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}`,
      batch.flat()
    )
    written += batch.length
  }

  return written
}

async function clear(client) {
  // Children before parents, so the foreign keys never block a delete
  for (const table of TABLES) {
    await client.query(`DELETE FROM ${table}`)
  }
  console.log('  cleared', TABLES.length, 'tables')
}

async function seed(client) {
  await insertMany(
    client,
    'dispositions',
    ['disposition_code', 'label', 'category', 'counts_as_conversion', 'synced_at'],
    DISPOSITIONS.map(([code, label, category, converts]) => [code, label, category, converts, new Date()])
  )

  await insertMany(
    client,
    'agents',
    ['agent_id', 'dialer_user', 'full_name', 'npn', 'first_seen_at', 'synced_at'],
    AGENTS.map(([id, name]) => [
      id,
      id.replace('ag-', 'u'),
      name,
      String(1000000 + Math.floor(rng() * 8999999)),
      new Date(),
      new Date(),
    ])
  )

  const visitors = []
  const sessions = []
  const leads = []
  const consents = []
  const clicks = []
  const calls = []
  const policies = []

  for (let i = 0; i < LEAD_COUNT; i += 1) {
    const [source, medium] = pick(SOURCES)
    const campaign = pick(CAMPAIGNS)
    const at = daysAgo(Math.floor(rng() * DAYS), 8 + Math.floor(rng() * 10))

    const visitorId = crypto.randomUUID()
    const sessionId = crypto.randomUUID()
    const leadId = crypto.randomUUID()

    visitors.push([visitorId, at, at, source, medium, campaign])
    sessions.push([
      sessionId, visitorId, at, at, source, medium, campaign, pick(PAGES),
      rng() < 0.61 ? 'mobile' : 'desktop',
    ])

    const first = pick(FIRST)
    const last = pick(LAST)
    const phone = `(555) 01${String(10 + (i % 90)).padStart(2, '0')}`

    leads.push([
      leadId, at, sessionId, visitorId, 'web', source, phone, first, last,
      `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      String(10000 + Math.floor(rng() * 89999)),
      rng() < 0.26 ? 'other' : 'self',
    ])

    consents.push([
      crypto.randomUUID(), leadId, at,
      'Seed consent text, not real wording.',
      crypto.createHash('sha256').update('seed').digest('hex'),
      'v1', `https://ihealthplans.com${pick(PAGES)}`, '203.0.113.0',
    ])

    const callCount = rng() < 0.72 ? 1 + Math.floor(rng() * 2) : 0
    const matched = callCount > 0 && rng() > 0.24

    clicks.push([
      crypto.randomUUID(), sessionId, visitorId, new Date(at.getTime() - 9 * 60000),
      'heroCallNow', pick(PAGES), '18882438046',
      matched ? `cl_${i}_0` : null,
      matched ? at : null,
      matched ? 'number-and-time' : null,
    ])

    const [agentId] = pick(AGENTS)
    let connectedOnce = false

    for (let c = 0; c < callCount; c += 1) {
      const [code, , category] = pick(DISPOSITIONS)
      const connected = category !== 'no_contact'
      if (connected) connectedOnce = true

      calls.push([
        `cl_${i}_${c}`, leadId, agentId, 'inbound',
        new Date(at.getTime() + c * 36e5),
        connected ? 120 + Math.floor(rng() * 900) : Math.floor(rng() * 40),
        phone, '18882438046', code,
        connected ? `https://tld.example/rec/${i}_${c}` : null,
        new Date(),
      ])
    }

    /*
     A sale only follows a call that reached somebody, which is what makes the
     funnel taper for a real reason rather than by a random draw.
    */
    if (connectedOnce && rng() < 0.22) {
      const effective = firstOfMonthAfter(at)
      const started = effective <= new Date()
      const effectuated = started && rng() < 0.9
      const lapsed = effectuated && rng() > 0.9

      policies.push([
        `pol_${i}`, leadId, agentId,
        pick(['Aetna', 'UnitedHealthcare', 'Wellcare', 'Anthem', 'Molina']),
        'Seed Plan (HMO)',
        pick(['MA', 'MAPD', 'PDP', 'DSNP']),
        effectuated ? 'approved' : 'submitted',
        at,
        effectuated ? effective : null,
        lapsed ? new Date(effective.getTime() + Math.floor(rng() * 80) * 86400000) : null,
        Number((rng() * 60).toFixed(2)),
        new Date(),
      ])
    }
  }

  /*
   Sessions that never became a lead, which is most of the traffic and the
   denominator the whole funnel rests on.
  */
  for (let i = 0; i < LEAD_COUNT * SESSION_MULTIPLIER; i += 1) {
    const [source, medium] = pick(SOURCES)
    const at = daysAgo(Math.floor(rng() * DAYS), 8 + Math.floor(rng() * 12))
    const visitorId = crypto.randomUUID()
    const sessionId = crypto.randomUUID()

    visitors.push([visitorId, at, at, source, medium, null])
    sessions.push([
      sessionId, visitorId, at, at, source, medium, pick(CAMPAIGNS), pick(PAGES),
      rng() < 0.61 ? 'mobile' : 'desktop',
    ])

    // A click that never became a call, which is the gap worth seeing
    if (rng() < 0.048) {
      clicks.push([
        crypto.randomUUID(), sessionId, visitorId, at,
        'headerPhoneBlock', pick(PAGES), '18882438046', null, null, null,
      ])
    }
  }

  /*
   Calls with no lead behind them. Somebody who saw the number and rang in
   without ever filling a form, which is the unattributed bucket the
   attribution page reports.
  */
  for (let i = 0; i < 900; i += 1) {
    const [code] = pick(DISPOSITIONS)
    const [agentId] = pick(AGENTS)
    const at = daysAgo(Math.floor(rng() * DAYS), 9 + Math.floor(rng() * 9))

    calls.push([
      `orphan_${i}`, null, agentId, 'inbound', at, Math.floor(rng() * 600),
      `(555) 02${String(i % 90).padStart(2, '0')}`, '18882438046', code, null, new Date(),
    ])
  }

  // Parents before children, or the foreign keys reject the batch
  await insertMany(client, 'visitors', ['visitor_id', 'first_seen_at', 'last_seen_at', 'first_source', 'first_medium', 'first_campaign'], visitors)
  await insertMany(client, 'sessions', ['session_id', 'visitor_id', 'started_at', 'last_active_at', 'source', 'medium', 'campaign', 'landing_page', 'device'], sessions)
  await insertMany(client, 'leads', ['lead_id', 'received_at', 'session_id', 'visitor_id', 'origin', 'source', 'phone', 'first_name', 'last_name', 'email', 'zip', 'on_behalf_of'], leads)
  await insertMany(client, 'lead_consents', ['consent_id', 'lead_id', 'captured_at', 'consent_text', 'consent_hash', 'consent_version', 'source_url', 'ip_address'], consents)
  await insertMany(client, 'calls', ['call_id', 'lead_id', 'agent_id', 'direction', 'started_at', 'talk_seconds', 'customer_number', 'did_number', 'disposition_code', 'recording_url', 'synced_at'], calls)
  await insertMany(client, 'call_clicks', ['click_id', 'session_id', 'visitor_id', 'clicked_at', 'location', 'page_path', 'presented_number', 'matched_call_id', 'matched_at', 'match_method'], clicks)
  await insertMany(client, 'policies', ['policy_id', 'lead_id', 'agent_id', 'carrier', 'plan_name', 'plan_type', 'policy_status', 'submitted_at', 'effective_date', 'disenrolled_at', 'premium', 'synced_at'], policies)

  console.log(`  ${sessions.length} sessions, ${leads.length} leads, ${calls.length} calls, ${policies.length} policies`)
}

async function run() {
  const { config, problems } = resolveDbConfig()
  if (!config) {
    for (const problem of problems) console.error(problem)
    process.exitCode = 1
    return
  }

  const client = new pg.Client(config)
  await client.connect()

  try {
    await client.query('BEGIN')
    await clear(client)

    if (!process.argv.includes('--clear')) {
      await seed(client)
    }

    await client.query('COMMIT')
    console.log(process.argv.includes('--clear') ? '\nCleared.' : '\nSeeded.')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('\nFailed and rolled back.\n', error.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
