/**
 * Applies the SQL files in db/migrations, in filename order, once each.
 *
 * Run it with:
 *   node scripts/migrate.mjs           apply anything not yet applied
 *   node scripts/migrate.mjs --status  list what has run and what has not
 *
 * Deliberately small. A migration tool is a dependency that has to be
 * understood by whoever is holding the pager at 2am, and this one is 100 lines
 * of code they can read in full.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const migrationsDir = path.join(appRoot, 'db', 'migrations')

/*
 * Next loads .env.local automatically, plain node does not, so a script run
 * from a terminal would see no DATABASE_URL and report it as unset when it is
 * sitting right there in the file.
 *
 * Resolved against the app root rather than the working directory, so this
 * works whether it is run from New-Site or from the repository root.
 */
try {
  process.loadEnvFile(path.join(appRoot, '.env.local'))
} catch {
  /* No .env.local is normal in CI, where the variable comes from the
     environment directly. The missing DATABASE_URL check below reports it. */
}

/*================================================================================
    MIGRATIONS ARE APPLIED, NEVER EDITED

    Each file's contents are hashed and the hash is stored. Editing a file that
    has already run makes the hash disagree and this refuses to continue.

    That is not pedantry. An edited migration produces 2 databases with the
    same version number and different schemas, and the one that is wrong is
    always production. Fix a mistake with a new migration.
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

/*
 * Splits a migration file into statements.
 *
 * MySQL's protocol runs one statement per call unless multipleStatements is
 * enabled, and enabling that turns every query in the process into a possible
 * injection point. Splitting here keeps that flag off.
 *
 * Comment lines are stripped first so a semicolon inside a comment does not
 * split a statement in half.
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

/**
 * Connects, creating the database first if it does not exist yet.
 *
 * Saves a separate step and a confusing first error. A url naming a database
 * that has not been created fails with ER_BAD_DB_ERROR, which reads like a
 * credentials problem to anybody who has not seen it before.
 *
 * Only the database is created. Nothing here creates a user or grants
 * anything, so the credentials in the url still have to be real.
 */
async function connect() {
  const url = new URL(process.env.DATABASE_URL)
  const database = url.pathname.replace(/^\//, '')

  if (database) {
    /* Connect with no database selected, so this works before it exists */
    const server = new URL(url)
    server.pathname = '/'

    const bootstrap = await mysql.createConnection({ uri: server.toString() })
    try {
      const [before] = await bootstrap.query('SHOW DATABASES LIKE ?', [database])
      if (before.length === 0) {
        /* Backtick quoted rather than parameterised, because an identifier
           cannot be a placeholder. The backticks inside the name are stripped
           so the quoting cannot be escaped out of. */
        await bootstrap.query(`CREATE DATABASE \`${database.replace(/`/g, '')}\`
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
        console.log(`  created  database ${database}`)
      }
    } finally {
      await bootstrap.end()
    }
  }

  return mysql.createConnection({ uri: process.env.DATABASE_URL })
}

async function run() {
  if (!process.env.DATABASE_URL) {
    /* Naming the resolved path, since this script can be run from either the
       repository root or from New-Site and the file is only in one of them */
    console.error(`DATABASE_URL is not set. Add it to ${path.join(appRoot, '.env.local')}`)
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

      /*
       * No transaction around this. MySQL commits DDL implicitly, so wrapping
       * it would give the false impression that a half applied migration
       * rolls back. It does not, which is why each file should do one
       * coherent thing.
       */
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
