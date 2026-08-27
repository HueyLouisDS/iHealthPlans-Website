// Upserts for the TLD mirror tables and the bookkeeping in sync_state.
// Generic over the resource definitions in lib/tld/resources.js, so adding a
// resource does not mean writing another insert by hand.

import 'server-only'

import { query, queryOne, execute, transaction, databaseConfigured } from '@/lib/db/client'

const BATCH_SIZE = 500

/*
 columns[0] is the key every one of these tables upserts on, which is why the
 update list starts at 1. MySQL matched on any unique key implicitly, Postgres
 wants the target named, so the convention that was a comment is now load
 bearing. Pass the primary key first or the insert conflicts and throws.
*/
export async function upsertRows(table, columns, rows) {
  if (!databaseConfigured() || rows.length === 0) return 0

  const placeholders = `(${columns.map(() => '?').join(', ')})`
  const updates = columns
    .slice(1)
    .map((column) => `${column} = EXCLUDED.${column}`)
    .concat('synced_at = now()')
    .join(', ')

  let written = 0                       // rows sent, not rows changed

  await transaction(async (connection) => {
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const batch = rows.slice(start, start + BATCH_SIZE)

      const sql =
        `INSERT INTO ${table} (${columns.join(', ')}, synced_at) VALUES ` +
        batch.map(() => placeholders.replace(/\)$/, ', now())')).join(', ') +
        ` ON CONFLICT (${columns[0]}) DO UPDATE SET ${updates}`

      await connection.query(
        sql,
        batch.flatMap((row) => columns.map((column) => row[column] ?? null))
      )

      written += batch.length
    }
  })

  return written
}

export async function markMissing(table, syncStartedAt) {
  if (!databaseConfigured()) return 0

  return execute(
    `UPDATE ${table}
        SET missing_since = ?
      WHERE synced_at < ?
        AND missing_since IS NULL`,
    [syncStartedAt, syncStartedAt]
  )
}

export async function readSyncState(resource) {
  if (!databaseConfigured()) return null

  return queryOne('SELECT * FROM sync_state WHERE resource = ?', [resource])
}

export async function writeSyncState(resource, { ok, cursor, rows, total, error, durationMs }) {
  if (!databaseConfigured()) return

  /*
   A failed run must not move last_success_at, cursor_value, or rows_total.
   Those 3 describe the last good pull, and overwriting them on a failure is
   how a broken sync starts reporting itself as fresh, and how the next run
   resumes from a cursor that was never reached.
  */
  await query(
    `INSERT INTO sync_state
       (resource, last_run_at, last_success_at, cursor_value, rows_last_run, rows_total,
        status, last_error, duration_ms)
     VALUES (?, now(), ${ok ? 'now()' : 'NULL'}, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (resource) DO UPDATE SET
       last_run_at = now(),
       ${ok ? 'last_success_at = now(),' : ''}
       ${ok ? 'cursor_value = EXCLUDED.cursor_value,' : ''}
       rows_last_run = EXCLUDED.rows_last_run,
       ${ok ? 'rows_total = EXCLUDED.rows_total,' : ''}
       status = EXCLUDED.status,
       last_error = EXCLUDED.last_error,
       duration_ms = EXCLUDED.duration_ms`,
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

export async function countRows(table) {
  if (!databaseConfigured()) return 0

  const row = await queryOne(`SELECT COUNT(*) AS total FROM ${table}`)
  return Number(row?.total ?? 0)
}
