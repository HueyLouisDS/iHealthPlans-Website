import 'server-only'
import pg from 'pg'
import { resolveDbConfig, databaseConfigured as configured } from '@/lib/db/dsn'

/*================================================================================
    POOL SIZE IS DELIBERATELY TINY, AND SERVERLESS IS THE REASON
==================================================================================*/

const POOL_SIZE = 2                     // per instance, not in total. Serverless multiplies this.
const globalForDb = globalThis

/*================================================================================
    QUERIES ARE WRITTEN WITH ?, POSTGRES WANTS $1
==================================================================================*/

/*
 Translated here rather than by rewriting every query in the codebase. The
 scan tracks quoting so a ? inside a string literal is left alone, which a
 plain replace would not do.

 The alternative, hand editing 40 odd statements to numbered parameters, is a
 change where a single transposed digit produces a query that runs and returns
 the wrong rows.
*/
function toNumbered(sql) {
  let out = ''
  let index = 0
  let inSingle = false                  // inside '...'
  let inDouble = false                  // inside "..." identifier quoting

  for (let position = 0; position < sql.length; position += 1) {
    const character = sql[position]

    if (inSingle) {
      if (character === "'") inSingle = false
      out += character
      continue
    }

    if (inDouble) {
      if (character === '"') inDouble = false
      out += character
      continue
    }

    if (character === "'") inSingle = true
    else if (character === '"') inDouble = true
    else if (character === '?') {
      index += 1
      out += `$${index}`
      continue
    }

    out += character
  }

  return out
}

export function databaseConfigured() {
  return configured()
}

export function pool() {
  if (!databaseConfigured()) {
    throw new Error('No database configured. Check databaseConfigured() before calling pool().')
  }

  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = new pg.Pool({
      ...resolveDbConfig().config,
      max: POOL_SIZE,
      // Idle connections are closed so a quiet instance stops holding one
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      /*
       Every timestamp in this schema is an instant. Pinning the session to UTC
       means a server in another region reads back what was written rather than
       shifting it, which is the failure that produces reports off by an hour
       for half the year.
      */
      options: '-c timezone=UTC',
    })
  }

  return globalForDb.__dbPool
}

export async function query(sql, params = []) {
  const result = await pool().query(toNumbered(sql), params)
  return result.rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

/* rows affected, for the statements where that is the answer rather than rows */
export async function execute(sql, params = []) {
  const result = await pool().query(toNumbered(sql), params)
  return result.rowCount ?? 0
}

export async function transaction(work) {
  const connection = await pool().connect()

  try {
    await connection.query('BEGIN')

    const result = await work({
      query: async (sql, params = []) => {
        const inner = await connection.query(toNumbered(sql), params)
        return inner.rows
      },
      execute: async (sql, params = []) => {
        const inner = await connection.query(toNumbered(sql), params)
        return inner.rowCount ?? 0
      },
    })

    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}
