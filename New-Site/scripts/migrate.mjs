// Applies the SQL files in db/migrations, in filename order, once each.
//
// Run it with:
//   node scripts/migrate.mjs           apply anything not yet applied
//   node scripts/migrate.mjs --status  list what has run and what has not
//   node scripts/migrate.mjs --check   print the resolved connection settings
//
// Deliberately small. A migration tool is a dependency that has to be
// understood by whoever is holding the pager at 2am, and this one is 150 lines
// of code they can read in full.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { resolveDbConfig, describeDbConfig } from '../lib/db/dsn.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const migrationsDir = path.join(appRoot, 'db', 'migrations')

try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
  // No .env.local is fine, the environment may already carry the values
}

/*================================================================================
    MIGRATIONS ARE APPLIED, NEVER EDITED
==================================================================================*/

const LEDGER = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename    VARCHAR(255)    NOT NULL,
  checksum    CHAR(64)        NOT NULL,
  applied_at  TIMESTAMPTZ(3)  NOT NULL,
  duration_ms INTEGER         NOT NULL,
  PRIMARY KEY (filename)
)
`

/*
 Splits a file into statements on semicolons, after dropping -- lines.

 Block comments are left in place deliberately. Postgres accepts them inside a
 statement, and stripping them risks eating a semicolon that happens to sit
 inside prose, which would split one statement into two broken halves.
*/
function statements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

/*
 Creates the database if it is missing, by connecting to the maintenance
 database first. A managed host has already created it and the user usually
 cannot see pg_database, so a failure here is not fatal, the real connection
 below reports the problem properly if there is one.
*/
async function ensureDatabase(config) {
  const admin = new pg.Client({ ...config, database: 'postgres' })

  try {
    await admin.connect()
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      config.database,
    ])

    if (found.rowCount === 0) {
      // Identifier, so it cannot be parameterised. Quoted and quotes doubled.
      await admin.query(`CREATE DATABASE "${config.database.replace(/"/g, '""')}"`)
      console.log(`  created  database ${config.database}`)
    }
  } catch {
    // Managed hosts refuse this, and that is the normal case
  } finally {
    await admin.end().catch(() => {})
  }
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

  await ensureDatabase(config)

  const client = new pg.Client(config)
  await client.connect()

  try {
    await client.query(LEDGER)
    const applied = await client.query('SELECT filename, checksum FROM schema_migrations')
    const byName = new Map(applied.rows.map((row) => [row.filename, row.checksum]))

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

      /*
       One transaction per file, which MySQL could not do because its DDL
       commits implicitly. A half applied migration was possible before and is
       not now, so a failure leaves the schema exactly as it was.
      */
      const started = Date.now()
      await client.query('BEGIN')

      try {
        for (const statement of statements(sql)) {
          await client.query(statement)
        }

        const duration = Date.now() - started
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum, applied_at, duration_ms) VALUES ($1, $2, now(), $3)',
          [filename, checksum, duration]
        )

        await client.query('COMMIT')
        console.log(`  applied  ${filename}  ${duration}ms`)
        ran += 1
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        console.error(`\n${filename} failed and was rolled back.\n${error.message}\n`)
        process.exitCode = 1
        return
      }
    }

    if (!statusOnly) {
      console.log(ran === 0 ? '\nNothing to apply, schema is current.' : `\n${ran} applied.`)
    }
  } finally {
    await client.end()
  }
}

run()
