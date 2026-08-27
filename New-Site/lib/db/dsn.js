// Resolves the database connection settings from the environment.
//
// No `server-only` here on purpose, because scripts/migrate.mjs runs under
// plain node and has to resolve the same settings the app does. Nothing in
// this file touches a network or holds a pool, it only reads variables.

/*================================================================================
    TWO WAYS TO CONFIGURE, AND THE DISCRETE ONE EXISTS FOR A REASON
==================================================================================*/

/*
 A managed Postgres hands you one url and it is the easier path. Discrete
 variables exist because a generated password routinely contains characters
 that have to be percent encoded inside a url, and a password pasted in raw
 silently truncates the connection string at the first @ or #.
*/

const DEFAULT_PORT = 5432

/*
 The zone name, never the abbreviation. EST is a fixed UTC-5 with no daylight
 saving, so pinning to it puts every timestamp between March and November an
 hour out.

 TIMESTAMPTZ stores an instant either way, so this changes nothing about what
 is written. It decides what a date means when one is derived from a
 timestamp, so date_trunc, ::date, and any grouping by day land on the Eastern
 business day rather than splitting it across 2 UTC days.

 Set here rather than on the pool, because scripts/migrate.mjs and anything
 else holding a plain Client would otherwise silently run in the server's own
 zone. Same value as TLD_TIMEZONE in lib/tld/sync.js, both because the
 business runs Eastern.
*/
const SESSION_OPTIONS = '-c timezone=America/New_York'

/*
 TLS on, certificate verified. Neon and Supabase both present publicly trusted
 certificates, so there is no reason to turn verification off, and turning it
 off means an attacker who can reach the connection can present any
 certificate at all and be believed.

 LH_DB_SSL takes 3 values:
   unset or 'verify'  encrypted and verified, the default
   'no-verify'        encrypted, certificate not checked. Only for a server
                      using a self signed certificate, and it is a downgrade.
   'false'            no TLS. Local plaintext server only, never over a network.
*/
function sslSetting(env) {
  const mode = String(env.LH_DB_SSL || '').toLowerCase()

  if (mode === 'false') return false
  if (mode === 'no-verify') return { rejectUnauthorized: false }

  return { rejectUnauthorized: true }
}

export function resolveDbConfig(env = process.env) {
  const problems = []

  // Discrete variables win. Set LH_DB_HOST to opt into this form.
  if (env.LH_DB_HOST) {
    const port = Number.parseInt(env.LH_DB_PORT || String(DEFAULT_PORT), 10)
    if (!Number.isFinite(port)) problems.push('LH_DB_PORT is not a number.')
    if (!env.LH_DB_USER) problems.push('LH_DB_USER is not set.')
    if (!env.LH_DB_NAME) problems.push('LH_DB_NAME is not set.')

    return {
      source: 'discrete',
      problems,
      config: problems.length
        ? null
        : {
            host: env.LH_DB_HOST,
            port,
            user: env.LH_DB_USER,
            password: env.LH_DB_PASSWORD ?? '',
            database: env.LH_DB_NAME,
            ssl: sslSetting(env),
            options: SESSION_OPTIONS,
          },
    }
  }

  if (env.DATABASE_URL) {
    let url
    try {
      url = new URL(env.DATABASE_URL)
    } catch {
      return { source: 'url', problems: ['DATABASE_URL is not a valid url.'], config: null }
    }

    const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!database) problems.push('DATABASE_URL has no database name after the host.')
    if (!url.username) problems.push('DATABASE_URL has no username.')

    return {
      source: 'url',
      problems,
      config: problems.length
        ? null
        : {
            host: url.hostname,
            port: Number.parseInt(url.port || String(DEFAULT_PORT), 10),
            // decodeURIComponent, since a url carries these encoded
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database,
            ssl: sslSetting(env),
            options: SESSION_OPTIONS,
          },
    }
  }

  return {
    source: 'none',
    problems: ['No database configured. Set LH_DB_HOST, LH_DB_USER, LH_DB_PASSWORD, and LH_DB_NAME.'],
    config: null,
  }
}

export function databaseConfigured(env = process.env) {
  return resolveDbConfig(env).config !== null
}

export function describeDbConfig(env = process.env) {
  const { config, source, problems } = resolveDbConfig(env)

  return {
    source,
    problems,
    host: config?.host ?? null,
    port: config?.port ?? null,
    user: config?.user ?? null,
    database: config?.database ?? null,
    passwordLength: config ? config.password.length : null,
  }
}
