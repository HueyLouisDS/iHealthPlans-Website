import 'server-only'

/**
 * The MySQL connection, and the only place in the app that opens one.
 *
 * Everything that reads or writes goes through `query` or `transaction` below,
 * so connection handling, parameter binding, and error shape are decided once.
 */

import mysql from 'mysql2/promise'

/*================================================================================
    POOL SIZE IS DELIBERATELY TINY, AND SERVERLESS IS THE REASON

    On Vercel every concurrent request can land on its own function instance,
    and each instance runs this module separately. A pool of 10 is not 10
    connections, it is 10 per instance, and 30 warm instances during AEP is 300
    connections against a server that probably caps out around 150.

    When that ceiling is hit the failure is ER_CON_COUNT_ERROR on everything at
    once, including the pages that were working a second earlier.

    So the pool is 2. Throughput comes from instances, not from connections per
    instance, and a query that waits 5ms for a free connection is invisible
    next to the request that spawned the instance in the first place.

    If this ever needs to go higher, put a proxy in front rather than raising
    the number. PlanetScale's http driver and ProxySQL both solve it properly,
    a bigger pool only moves the cliff.
==================================================================================*/
const POOL_SIZE = 2

/*
 * Held on globalThis rather than a module const so a hot reload in development
 * reuses the pool instead of opening a new one on every file save, which
 * exhausts the server's connection limit within a few minutes of editing.
 */
const globalForDb = globalThis

/**
 * Whether a database is configured at all.
 *
 * Checked rather than assumed, because the whole admin area currently runs on
 * fixtures and must keep working before the database exists. A missing
 * DATABASE_URL is a state, not an error.
 */
export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * The connection pool, created once per process.
 *
 * Throws rather than returning null when unconfigured, because every caller
 * should have checked `databaseConfigured()` first and a null pool would
 * surface as an unrelated TypeError three frames later.
 */
export function pool() {
  if (!databaseConfigured()) {
    throw new Error('DATABASE_URL is not set. Check databaseConfigured() before calling pool().')
  }

  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: POOL_SIZE,
      waitForConnections: true,
      /*
       * Unbounded queue. A capped queue drops requests under load, and a
       * dropped admin request looks like a bug rather than like backpressure.
       */
      queueLimit: 0,
      /* Idle connections are closed so a quiet instance stops holding one */
      idleTimeout: 30_000,
      enableKeepAlive: true,
      /*
       * Dates come back as strings rather than as JS Date objects. The driver
       * builds Dates in the server's local timezone, which on Vercel is UTC
       * and on a developer laptop is not, so the same row would parse to 2
       * different instants. Everything here is stored UTC and parsed
       * explicitly where it is needed.
       */
      dateStrings: true,
      timezone: 'Z',
      /* Big ints as strings, since TLD ids can exceed the safe integer range */
      supportBigNumbers: true,
      bigNumberStrings: true,
      namedPlaceholders: true,
    })
  }

  return globalForDb.__dbPool
}

/**
 * Runs a query and returns the rows.
 *
 * Always parameterised. `sql` carries :placeholders and `params` supplies the
 * values, so nothing built from user input is ever concatenated into a
 * statement. There is no variant of this function that takes raw SQL, and
 * there should not be.
 */
export async function query(sql, params = {}) {
  const [rows] = await pool().execute(sql, params)
  return rows
}

/**
 * Runs a query expected to return one row, or null.
 */
export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

/**
 * Runs several statements as one transaction.
 *
 * The callback receives a connection with the same `query` shape, so calling
 * code reads identically inside and outside a transaction. The connection is
 * always released, including when the callback throws, which is the bug this
 * wrapper exists to make impossible.
 */
export async function transaction(work) {
  const connection = await pool().getConnection()

  try {
    await connection.beginTransaction()
    const result = await work({
      query: async (sql, params = {}) => {
        const [rows] = await connection.execute(sql, params)
        return rows
      },
    })
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => {
      /* Rollback failing usually means the connection is already gone. The
         original error is the interesting one, so it is not masked. */
    })
    throw error
  } finally {
    connection.release()
  }
}
