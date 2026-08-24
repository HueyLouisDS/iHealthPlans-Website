// Applies the SQL files in db/migrations, in filename order, once each.
//
// Run it with:
//   node scripts/migrate.mjs           apply anything not yet applied
//   node scripts/migrate.mjs --status  list what has run and what has not
//
// Deliberately small. A migration tool is a dependency that has to be
// understood by whoever is holding the pager at 2am, and this one is 100 lines
// of code they can read in full.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { resolveDbConfig, describeDbConfig } from '../lib/db/dsn.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const migrationsDir = path.join(appRoot, 'db', 'migrations')
try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
   }

   /*================================================================================
   MIGRATIONS ARE APPLIED, NEVER EDITED
   ==================================================================================*/

   const LEDGER = `
   CREATE TABLE IF NOT EXISTS schema_migrations (
   filename    VARCHAR(255) NOT NULL,
   checksum    CHAR(64)     NOT NULL,
   applied_at  DATETIME(3)  NOT NULL,
   duration_ms INT          NOT NULL,
   PRIMARY KEY (filename)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
   `

function statements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function connect() {
  const { config } = resolveDbConfig()
  const { database, ...server } = config

  if (database) {
    // Connect with no database selected, so this works before it exists
    const bootstrap = await mysql.createConnection(server)
    try {
      const [before] = await bootstrap.query('SHOW DATABASES LIKE ?', [database])
      if (before.length === 0) {
         await bootstrap.query(`CREATE DATABASE \`${database.replace(/`/g, '')}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
         console.log(`  created  database ${database}`)
         }
         } finally {
         await bootstrap.end()
         }
         }

         return mysql.createConnection(config)
         }

         async function run() {
  if (process.argv.includes('--check')) {
    console.log(describeDbConfig())
    return
  }

  const { config, problems } = resolveDbConfig()
  if (!config) {
    for (const problem of problems) console.error(problem)
    console.error(`Set them in ${path.join(appRoot, '.env.local')}`)
    process.exitCode = 1
    return
  }

  const statusOnly = process.argv.includes('--status')

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No migrations in db/migrations.')
    return
  }

  const connection = await connect()

  try {
    await connection.execute(LEDGER)
    const [applied] = await connection.execute('SELECT filename, checksum FROM schema_migrations')
    const byName = new Map(applied.map((row) => [row.filename, row.checksum]))

    let ran = 0

    for (const filename of files) {
      const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8')
      const checksum = crypto.createHash('sha256').update(sql).digest('hex')
      const previous = byName.get(filename)

      if (previous && previous !== checksum) {
        console.error(
          `\n${filename} has been edited since it was applied.\n` +
            'A migration that has run is immutable. Add a new file instead.\n'
        )
        process.exitCode = 1
        return
      }

      if (previous) {
        if (statusOnly) console.log(`  applied  ${filename}`)
        continue
      }

      if (statusOnly) {
        console.log(`  PENDING  ${filename}`)
        continue
      }

      const started = Date.now()
      for (const statement of statements(sql)) {
        await connection.query(statement)
      }

      const duration = Date.now() - started
      await connection.execute(
        'INSERT INTO schema_migrations (filename, checksum, applied_at, duration_ms) VALUES (?, ?, UTC_TIMESTAMP(3), ?)',
        [filename, checksum, duration]
      )

      console.log(`  applied  ${filename}  ${duration}ms`)
      ran += 1
    }

    if (!statusOnly) {
      console.log(ran === 0 ? '\nNothing to apply, schema is current.' : `\n${ran} applied.`)
    }
  } finally {
    await connection.end()
  }
}

run()
