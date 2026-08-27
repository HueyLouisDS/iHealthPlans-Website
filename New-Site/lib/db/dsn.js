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
 Neon and Supabase both require TLS and neither presents a certificate that
 chains to a root node ships with, so verification is off while encryption
 stays on. Set LH_DB_SSL=false for a local server that speaks plaintext.
*/
function sslSetting(env) {
  if (String(env.LH_DB_SSL || '').toLowerCase() === 'false') return false
  return { rejectUnauthorized: false }
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
