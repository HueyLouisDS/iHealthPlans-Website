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

/*
 * A full pull that comes back materially smaller than the last one is refused
 * rather than written. A truncated response, a silently expired key, or a
 * changed default page size all produce the same thing, fewer rows, and
 * writing them looks exactly like a quiet week rather than a broken sync.
 *
 * Only applies to full pulls with an established baseline. An incremental pull
 * is expected to be small, and the first run of anything has nothing to
 * compare against.
 */
const SHRINK_TOLERANCE = 0.9            // a full pull may lose up to 10% before it is refused

/* How far back an incremental pull reaches when there is no cursor yet */
const INITIAL_LOOKBACK_DAYS = 90

/* Overlap on every incremental pull, so a row written during the last run is not missed */
const CURSOR_OVERLAP_MINUTES = 30

/*=======================================================
        TLD SENDS EASTERN, THE DATABASE STORES UTC
========================================================*/

/*
 * From TLD's own posting instructions: "Any and all Date Time formatted fields
 * will be converted to the accounts default timezone: US/Eastern."
 *
 * So a datetime arriving with no zone marker is Eastern, not UTC and not
 * whatever the server happens to be set to. Handing that string straight to
 * `new Date()` parses it as local time, which shifts every timestamp by the
 * server's offset and makes the same pull produce different rows on a
 * developer laptop and on the host.
 *
 * That would not throw and would not look wrong. It would just move every call
 * a few hours, so no call would ever fall inside the window a click is matched
 * against, and the attribution rate would sit at zero with nothing to explain
 * it.
 *
 * TODO confirm with --inspect whether TLD sends a zone marker. If it does, the
 * explicit branch below already handles it and this constant stops mattering.
 */
const TLD_TIMEZONE = 'America/New_York'

/* A datetime with no trailing Z and no numeric offset */
const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
const HAS_EXPLICIT_ZONE = /([Zz]|[+-]\d{2}:?\d{2})$/

/**
 * The offset in minutes that a timezone was at a given instant.
 *
 * Computed through Intl rather than hardcoded, so it is correct on both sides
 * of a daylight saving change. A fixed -5 would put every summer call an hour
 * out, which is small enough to survive review and large enough to break a
 * 15 minute match window.
 */
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

  /* What the wall clock read there, expressed as if it were UTC */
  const asUtc = Date.UTC(at('year'), at('month') - 1, at('day'), at('hour') % 24, at('minute'), at('second'))

  return (asUtc - date.getTime()) / 60000
}

/**
 * Formats a date for MySQL DATETIME(3), converting from TLD's zone when the
 * value does not carry one of its own.
 */
function toMysqlDateTime(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().replace('T', ' ').replace('Z', '')
  }

  const text = String(value).trim()
  if (!text) return null

  /* Carries its own zone, so Date reads it correctly and no guessing is needed */
  if (HAS_EXPLICIT_ZONE.test(text)) {
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().replace('T', ' ').replace('Z', '')
  }

  const match = NAIVE_DATETIME.exec(text)
  if (!match) {
    /* A bare date, no time. Stored as written, since a date has no zone. */
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
  }

  const [, year, month, day, hour, minute, second = '00'] = match

  /*
   * Read as if the wall clock reading were UTC, then shifted by the offset
   * that zone was actually at. Two passes because the offset itself depends on
   * the instant, and the first guess is close enough to land on the right side
   * of any daylight saving boundary.
   */
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

/*
 * TLD sends these as 1/0, Y/N, or true/false depending on the field, so all 3
 * are recognised. The question is what to do with a 4th spelling nobody
 * anticipated.
 *
 * For is_dnc the answer is suppress. Reading an unrecognised value as "not on
 * the list" means somebody who asked not to be called gets called, and that is
 * a complaint and a fine. Reading it as "on the list" costs one lead that a
 * person can put back by hand.
 *
 * The other flags go the other way. counts_as_conversion defaulting to true on
 * a value nobody understood would inflate every conversion number on the
 * dashboard, which is the opposite of useful.
 */
const TRUE_VALUES = new Set(['1', 'y', 'yes', 'true', 't'])
const FALSE_VALUES = new Set(['0', 'n', 'no', 'false', 'f'])

/* Columns where an unrecognised value is resolved to 1 rather than 0 */
const FAIL_SUPPRESSED = new Set(['is_dnc'])

/*
 * Reads a TLD flag, resolving anything unrecognised in the safe direction for
 * that particular column.
 */
function toBoolean(raw, column) {
  const text = String(raw).trim().toLowerCase()

  if (TRUE_VALUES.has(text)) return 1
  if (FALSE_VALUES.has(text)) return 0

  return FAIL_SUPPRESSED.has(column) ? 1 : 0
}

/*
 * Turns one TLD row into one row for our table.
 *
 * Missing fields become null rather than being skipped, so every row in a
 * batch has the same shape and a single insert statement covers all of them.
 */
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

/*
 * Works out where an incremental pull should resume from.
 *
 * Rewound by CURSOR_OVERLAP_MINUTES because a row created during the previous
 * run can carry a timestamp just before the cursor was recorded, and resuming
 * exactly at the cursor would step over it. The upsert makes the repeat free.
 */
function resumeFrom(state) {
  const stored = state?.cursor_value

  if (!stored) {
    const start = new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    return toMysqlDateTime(start)
  }

  const rewound = new Date(new Date(`${stored}Z`).getTime() - CURSOR_OVERLAP_MINUTES * 60 * 1000)
  return toMysqlDateTime(rewound)
}

/*
 * Finds the newest value of the cursor column across a batch, which becomes
 * the next run's starting point. Taken from the data rather than from the
 * clock, so a slow run does not skip rows written while it was going.
 */
function newestCursor(rows, column) {
  let newest = null

  for (const row of rows) {
    const value = row[column]
    if (value && (!newest || value > newest)) newest = value
  }

  return newest
}

/**
 * Syncs one resource.
 *
 * Never throws. A failure is recorded against that resource and the caller
 * moves on, because 1 broken endpoint should not leave the other 4 stale with
 * no explanation of why.
 */
export async function syncResource(resource, { dryRun = false } = {}) {
  const startedAt = new Date()
  const syncStartedAt = toMysqlDateTime(startedAt)

  const state = await readSyncState(resource.name)
  const params = { ...(resource.params || {}) }

  /*
   * An incremental resource asks for everything since its cursor. A full one
   * asks for everything, except that the leads endpoint refuses a request with
   * no date range at all, so it gets one whether or not it is incremental.
   */
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

  /*
   * The shrink guard, before anything is written. Full pulls only, and only
   * once there is a baseline to compare against.
   */
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

  /*
   * Rows that stopped coming back, stamped rather than deleted. Full pulls
   * only. On an incremental one everything outside the window is legitimately
   * absent and would all be marked at once.
   */
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

/**
 * Syncs every resource, in the order they are declared.
 *
 * Sequential, not parallel. Calls reference agents and dispositions, so a call
 * landing before the agent it points at would show an unknown agent on the
 * dashboard until the next run. The whole thing is a handful of requests
 * against an api with no rate limit, so there is nothing to gain by racing.
 */
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

/**
 * Fetches one page of each resource and reports what came back against what
 * the map expects. Read only, writes nothing, needs no database.
 *
 * This is what turns "the credentials are in" into a finished mapping. Every
 * field name in resources.js was written against our schema rather than
 * against a real response, so all of them need confirming once.
 */
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
