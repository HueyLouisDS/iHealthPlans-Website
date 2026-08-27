// Pulls each TLD resource, maps it onto migration 002, and records what
// happened in sync_state. Driven by scripts/sync.mjs on a schedule and by the
// admin route for a manual run.

import 'server-only'

import { fetchAll, fetchPage } from '@/lib/tld/client'
import { RESOURCES, resourceByName, DATE_COLUMNS, BOOLEAN_COLUMNS } from '@/lib/tld/resources'
import {
  upsertRows,
  markMissing,
  readSyncState,
  writeSyncState,
  countRows,
} from '@/lib/db/queries/sync'

/*=======================================================
        THE SHRINK GUARD
========================================================*/
const SHRINK_TOLERANCE = 0.9            // a full pull may lose up to 10% before it is refused
const INITIAL_LOOKBACK_DAYS = 90        // first pull reach, when there is no cursor
const CURSOR_OVERLAP_MINUTES = 30       // rewind, so a row written mid run is not missed

/*=======================================================
        TLD SENDS EASTERN, THE DATABASE STORES UTC
========================================================*/
const TLD_TIMEZONE = 'America/New_York' // what a naive TLD datetime means

// A datetime with no trailing Z and no numeric offset
const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
const HAS_EXPLICIT_ZONE = /([Zz]|[+-]\d{2}:?\d{2})$/

function zoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const at = (type) => Number(parts.find((part) => part.type === type).value)

  // What the wall clock read there, expressed as if it were UTC
  const asUtc = Date.UTC(at('year'), at('month') - 1, at('day'), at('hour') % 24, at('minute'), at('second'))

  return (asUtc - date.getTime()) / 60000
}

function toMysqlDateTime(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().replace('T', ' ').replace('Z', '')
  }

  const text = String(value).trim()
  if (!text) return null

  // Carries its own zone, so Date reads it correctly and no guessing is needed
  if (HAS_EXPLICIT_ZONE.test(text)) {
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().replace('T', ' ').replace('Z', '')
  }

  const match = NAIVE_DATETIME.exec(text)
  if (!match) {
    // A bare date, no time. Stored as written, since a date has no zone.
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
  }

  const [, year, month, day, hour, minute, second = '00'] = match
  const naive = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)
  const firstGuess = new Date(naive - zoneOffsetMinutes(new Date(naive), TLD_TIMEZONE) * 60000)
  const corrected = new Date(naive - zoneOffsetMinutes(firstGuess, TLD_TIMEZONE) * 60000)

  return Number.isNaN(corrected.getTime())
    ? null
    : corrected.toISOString().replace('T', ' ').replace('Z', '')
}

/*=======================================================
        AN UNREADABLE DNC FLAG MEANS DO NOT CALL
========================================================*/
const TRUE_VALUES = new Set(['1', 'y', 'yes', 'true', 't'])
const FALSE_VALUES = new Set(['0', 'n', 'no', 'false', 'f'])

// An unrecognised DNC value suppresses. Reading it as callable dials someone
// who asked not to be. The other flags go to 0, so a bad value cannot inflate
// the conversion numbers.
const FAIL_SUPPRESSED = new Set(['is_dnc'])

function toBoolean(raw, column) {
  const text = String(raw).trim().toLowerCase()

  if (TRUE_VALUES.has(text)) return 1
  if (FALSE_VALUES.has(text)) return 0

  return FAIL_SUPPRESSED.has(column) ? 1 : 0
}

function mapRow(row, map) {
  const mapped = {}                     // our column names to values

  for (const [column, sourceField] of Object.entries(map)) {
    const raw = row[sourceField]

    if (raw === undefined || raw === null || raw === '') {
      mapped[column] = null
      continue
    }

    if (DATE_COLUMNS.has(column)) {
      mapped[column] = toMysqlDateTime(raw)
      continue
    }

    if (BOOLEAN_COLUMNS.has(column)) {
      mapped[column] = toBoolean(raw, column)
      continue
    }

    mapped[column] = raw
  }

  return mapped
}

function resumeFrom(state) {
  const stored = state?.cursor_value

  if (!stored) {
    const start = new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    return toMysqlDateTime(start)
  }

  const rewound = new Date(new Date(`${stored}Z`).getTime() - CURSOR_OVERLAP_MINUTES * 60 * 1000)
  return toMysqlDateTime(rewound)
}

function newestCursor(rows, column) {
  let newest = null

  for (const row of rows) {
    const value = row[column]
    if (value && (!newest || value > newest)) newest = value
  }

  return newest
}

export async function syncResource(resource, { dryRun = false } = {}) {
  const startedAt = new Date()
  const syncStartedAt = toMysqlDateTime(startedAt)

  const state = await readSyncState(resource.name)
  const params = { ...(resource.params || {}) }
  if (resource.incremental || resource.requiresRange) {
    params[resource.cursorParam] = resumeFrom(state)
  }

  const { rows, error } = await fetchAll(resource.path, params, {
    pageSize: resource.pageSize,
  })

  const durationMs = Date.now() - startedAt.getTime()

  if (error) {
    await writeSyncState(resource.name, { ok: false, error, durationMs })
    return { name: resource.name, ok: false, rows: 0, error }
  }

  if (!resource.incremental && state?.rows_total > 0) {
    const floor = Math.floor(state.rows_total * SHRINK_TOLERANCE)

    if (rows.length < floor) {
      const refusal =
        `Refused. ${rows.length} rows came back against a baseline of ${state.rows_total}, ` +
        `below the ${floor} floor. Nothing was written.`

      await writeSyncState(resource.name, { ok: false, error: refusal, rows: rows.length, durationMs })
      return { name: resource.name, ok: false, rows: rows.length, error: refusal }
    }
  }

  const mapped = rows.map((row) => mapRow(row, resource.map))
  const columns = Object.keys(resource.map)

  if (dryRun) {
    return { name: resource.name, ok: true, rows: mapped.length, dryRun: true }
  }

  let written = 0
  try {
    written = await upsertRows(resource.table, columns, mapped)
  } catch (cause) {
    await writeSyncState(resource.name, { ok: false, error: cause.message, durationMs })
    return { name: resource.name, ok: false, rows: 0, error: cause.message }
  }

  let missing = 0
  if (resource.tracksMissing && !resource.incremental) {
    missing = await markMissing(resource.table, syncStartedAt)
  }

  const total = await countRows(resource.table)
  const cursor = resource.incremental ? newestCursor(mapped, resource.cursorColumn) : null

  await writeSyncState(resource.name, {
    ok: true,
    cursor: cursor || state?.cursor_value || null,
    rows: written,
    total,
    durationMs: Date.now() - startedAt.getTime(),
  })

  return { name: resource.name, ok: true, rows: written, total, missing }
}

export async function syncAll({ only = null, dryRun = false } = {}) {
  const targets = only ? [resourceByName(only)].filter(Boolean) : RESOURCES

  if (targets.length === 0) {
    return { ok: false, results: [], error: `No resource named "${only}".` }
  }

  const results = []
  for (const resource of targets) {
    results.push(await syncResource(resource, { dryRun }))
  }

  return { ok: results.every((result) => result.ok), results }
}

export async function inspect() {
  const findings = []

  for (const resource of RESOURCES) {
    const params = { ...(resource.params || {}), limit: 1 }

    if (resource.incremental || resource.requiresRange) {
      params[resource.cursorParam] = resumeFrom(null)
    }

    const { rows, error } = await fetchPage(resource.path, params)

    if (error) {
      findings.push({ name: resource.name, path: resource.path, error })
      continue
    }

    const actual = rows.length > 0 ? Object.keys(rows[0]) : []
    const expected = Object.values(resource.map)

    findings.push({
      name: resource.name,
      path: resource.path,
      sampleRows: rows.length,
      actual,
      missing: expected.filter((field) => !actual.includes(field)),
      unused: actual.filter((field) => !expected.includes(field)),
    })
  }

  return findings
}
