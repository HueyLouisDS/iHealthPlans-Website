// Upserts for the TLD mirror tables and the bookkeeping in sync_state.
// Generic over the resource definitions in lib/tld/resources.js, so adding a
// resource does not mean writing another insert by hand.

import 'server-only'

import { query, queryOne, transaction, databaseConfigured } from '@/lib/db/client'

const BATCH_SIZE = 500

export async function upsertRows(table, columns, rows) {
  if (!databaseConfigured() || rows.length === 0) return 0

  const placeholders = `(${columns.map(() => '?').join(', ')})`
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

export async function readSyncState(resource) {
  if (!databaseConfigured()) return null

  return queryOne('SELECT * FROM sync_state WHERE resource = ?', [resource])
}

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

export async function countRows(table) {
  if (!databaseConfigured()) return 0

  const row = await queryOne(`SELECT COUNT(*) AS total FROM ${table}`)
  return Number(row?.total ?? 0)
}
