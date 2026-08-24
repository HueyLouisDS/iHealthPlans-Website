import 'server-only'
import mysql from 'mysql2/promise'
import { resolveDbConfig, databaseConfigured as configured } from '@/lib/db/dsn'

/*================================================================================
    POOL SIZE IS DELIBERATELY TINY, AND SERVERLESS IS THE REASON
==================================================================================*/

const POOL_SIZE = 2                     // per instance, not in total. Serverless multiplies this.
const globalForDb = globalThis

export function databaseConfigured() {
  return configured()
}

export function pool() {
  if (!databaseConfigured()) {
    throw new Error('No database configured. Check databaseConfigured() before calling pool().')
  }

  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = mysql.createPool({
      ...resolveDbConfig().config,
      connectionLimit: POOL_SIZE,
      waitForConnections: true,
      queueLimit: 0,
      // Idle connections are closed so a quiet instance stops holding one
      idleTimeout: 30_000,
      enableKeepAlive: true,
      namedPlaceholders: true,
    })
  }

  return globalForDb.__dbPool
}

export async function query(sql, params = {}) {
  const [rows] = await pool().execute(sql, params)
  return rows
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

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
    })
    throw error
  } finally {
    connection.release()
  }
}
