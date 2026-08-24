/**
 * Resolves the database connection settings from the environment.
 *
 * No `server-only` here on purpose, because scripts/migrate.mjs runs under
 * plain node and has to resolve the same settings the app does. Nothing in
 * this file touches a network or holds a pool, it only reads variables.
 */

/*================================================================================
    TWO WAYS TO CONFIGURE, AND THE DISCRETE ONE EXISTS FOR A REASON

    DATABASE_URL is what a hosted provider hands you, so it stays supported.

    But a url has to percent encode the password, and a MySQL password
    containing @ # / : ? or % is common. Get that wrong and the failure is
    "Access denied", which sends somebody off checking credentials that were
    correct all along. It cost us exactly that once already.

    So LH_DB_HOST and friends take precedence when present. No encoding, no
    parsing, no class of bug.
==================================================================================*/

/*
 * How every connection behaves, regardless of which form configured it.
 *
 * Here rather than on the pool, because a script opening its own connection
 * gets the same semantics as the app. Without that, the same row read from a
 * migration script and from a page parses to 2 different types.
 */
const BEHAVIOUR = {
  /*
   * Dates as strings, timezone pinned to UTC. The driver otherwise builds Date
   * objects in the server's local timezone, which is UTC on Vercel and
   * something else on a laptop, so identical rows parse to different instants.
   */
  dateStrings: true,
  timezone: 'Z',
  /* TLD ids can exceed the safe integer range, so big ints stay strings */
  supportBigNumbers: true,
  bigNumberStrings: true,
}

/**
 * Returns { config, source, problems }.
 *
 * `config` is a mysql2 connection options object, or null when nothing is
 * configured. Never throws, because the caller decides whether an unconfigured
 * database is an error or just the current state of the project.
 */
export function resolveDbConfig(env = process.env) {
  const problems = []

  /* Discrete variables win. Set LH_DB_HOST to opt into this form. */
  if (env.LH_DB_HOST) {
    const port = Number.parseInt(env.LH_DB_PORT || '3306', 10)
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
            /* Empty string is a valid MySQL password, so undefined rather
               than a falsy check, or a blank password becomes "not set" */
            password: env.LH_DB_PASSWORD ?? '',
            database: env.LH_DB_NAME,
            ...BEHAVIOUR,
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
            port: Number.parseInt(url.port || '3306', 10),
            /* decodeURIComponent, since a url carries these encoded */
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database,
            ...BEHAVIOUR,
          },
    }
  }

  return {
    source: 'none',
    problems: ['No database configured. Set LH_DB_HOST, LH_DB_USER, LH_DB_PASSWORD, and LH_DB_NAME.'],
    config: null,
  }
}

/**
 * Whether a database is configured at all.
 */
export function databaseConfigured(env = process.env) {
  return resolveDbConfig(env).config !== null
}

/**
 * A description safe to print.
 *
 * The password is never shown, but its length is, because the single most
 * useful diagnostic is whether the value arrived whole. A 15 character
 * password reported as 4 characters says the url truncated it at a special
 * character, which is a completely different problem from a wrong password.
 */
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
