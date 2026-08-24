// Upserts for the TLD mirror tables and the bookkeeping in sync_state.
// Generic over the resource definitions in lib/tld/resources.js, so adding a
// resource does not mean writing another insert by hand.

import 'server-only'

import { query, queryOne, transaction, databaseConfigured } from '@/lib/db/client'

/*
 Rows per INSERT. High enough that a 200k row pull is a few hundred
 statements, low enough to stay under max_allowed_packet on a default MySQL,
 which is 64MB and which a single giant insert will exceed without warning.
*/
const BATCH_SIZE = 500

/**
 * Upserts rows into a mirror table.
 *
 * INSERT ... ON DUPLICATE KEY UPDATE rather than delete and replace, because
 * our own matcher writes lead_id onto calls and policies after the fact and a
 * replace would wipe it on the next sync. Only the columns TLD owns are
 * updated, which is what the mapper produced.
 *
 * Whole batches run in one transaction so a failure halfway leaves the table
 * as it was rather than half a pull.
 */
export async function upsertRows(table, columns, rows) {
  if (!databaseConfigured() || rows.length === 0) return 0

  const placeholders = `(${columns.map(() => '?').join(', ')})`

  /*
   Every column except the key is updated on conflict. The key is excluded
   because setting a primary key to itself is noise, and because listing it
   makes the statement look like it might change identity.
  */
  const updates = columns
    .slice(1)
    .map((column) => `${column} = VALUES(${column})`)
    .concat('synced_at = UTC_TIMESTAMP(3)')
    .join(', ')

  let written = 0                       // rows sent, not rows changed

  await transaction(async (connection) => {
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const batch = rows.slice(start, start + BATCH_SIZE)

      const sql =
        `INSERT INTO ${table} (${columns.join(', ')}, synced_at) VALUES ` +
        batch.map(() => placeholders.replace(/\)$/, ', UTC_TIMESTAMP(3))')).join(', ') +
        ` ON DUPLICATE KEY UPDATE ${updates}`

      await connection.query(
        sql,
        batch.flatMap((row) => columns.map((column) => row[column] ?? null))
      )

      written += batch.length
    }
  })

  return written
}

/**
 * Stamps rows that have stopped coming back from TLD.
 *
 * Policies can be deleted outright there rather than marked, and deleting our
 * copy to match would quietly rewrite last month's reported numbers. So the
 * row stays and carries the date it went missing.
 *
 * Only run after a full pull. On an incremental one, every row outside the
 * window is legitimately absent and would all be stamped at once.
 */
export async function markMissing(table, syncStartedAt) {
  if (!databaseConfigured()) return 0

  const result = await query(
    `UPDATE ${table}
        SET missing_since = ?
      WHERE synced_at < ?
        AND missing_since IS NULL`,
    [syncStartedAt, syncStartedAt]
  )

  return result?.affectedRows ?? 0
}

/**
 * Reads one resource's bookkeeping row.
 */
export async function readSyncState(resource) {
  if (!databaseConfigured()) return null

  return queryOne('SELECT * FROM sync_state WHERE resource = ?', [resource])
}

/**
 * Records the outcome of a run.
 *
 * last_success_at only moves on success, so the gap between it and last_run_at
 * is how long a resource has been failing. Two columns rather than one because
 * a resource that runs every hour and has failed every time for 3 days looks
 * perfectly healthy if you only store the last attempt.
 */
export async function writeSyncState(resource, { ok, cursor, rows, total, error, durationMs }) {
  if (!databaseConfigured()) return

  await query(
    `INSERT INTO sync_state
       (resource, last_run_at, last_success_at, cursor_value, rows_last_run, rows_total,
        status, last_error, duration_ms)
     VALUES (?, UTC_TIMESTAMP(3), ${ok ? 'UTC_TIMESTAMP(3)' : 'NULL'}, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_run_at = UTC_TIMESTAMP(3),
       ${ok ? 'last_success_at = UTC_TIMESTAMP(3),' : ''}
       ${ok ? 'cursor_value = VALUES(cursor_value),' : ''}
       rows_last_run = VALUES(rows_last_run),
       ${ok ? 'rows_total = VALUES(rows_total),' : ''}
       status = VALUES(status),
       last_error = VALUES(last_error),
       duration_ms = VALUES(duration_ms)`,
    [
      resource,
      cursor ?? null,
      rows ?? null,
      total ?? null,
      ok ? 'ok' : 'failed',
      error ? String(error).slice(0, 1000) : null,
      durationMs ?? null,
    ]
  )
}

/**
 * Counts what is actually in a mirror table, for the shrink guard.
 */
export async function countRows(table) {
  if (!databaseConfigured()) return 0

  const row = await queryOne(`SELECT COUNT(*) AS total FROM ${table}`)
  return Number(row?.total ?? 0)
}
