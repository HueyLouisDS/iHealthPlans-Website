// Reads and rewrites .env.local so the admin page can set integration
// credentials without hand editing the file. Development only, see the banner.

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { WRITABLE_KEYS } from '@/lib/integrations/fields'

/*=======================================================
        DEVELOPMENT ONLY, AND THE GUARD IS NOT OPTIONAL
========================================================*/

/**
 * A deployed app must never write this file. Three reasons, any one of which
 * is enough:
 *
 *   .env.local is not where a deployed app gets its environment. The host
 *   injects those, so a write would succeed and change nothing, which is worse
 *   than failing because it looks like it worked.
 *
 *   Production filesystems are usually read only, and on the ones that are not,
 *   a web form that writes an executable config file is a foothold.
 *
 *   Secrets that arrive through a browser have been through the browser. That
 *   is acceptable on a developer machine and not acceptable for live keys.
 *
 * next build always sets NODE_ENV to production, so a built and deployed app
 * cannot take this path regardless of what the environment says. Same guard
 * shape as the auth bypass in lib/admin/session.js.
 */
export function envWritesEnabled() {
  return process.env.NODE_ENV !== 'production'
}

const ENV_FILE = '.env.local'

/* Marks where this file appends keys that were not already present */
const APPEND_HEADING = '# Added from /admin/integrations'

/**
 * Absolute path to .env.local, resolved from the process working directory.
 * next dev runs with cwd at the app root, which is where Next itself looks for
 * the file, so the 2 always agree.
 */
function envPath() {
  return path.join(process.cwd(), ENV_FILE)
}

/**
 * Formats a value for a dotenv line.
 *
 * Bare when it is safe to be bare, which covers urls, ids and keys. Anything
 * else is quoted with backslashes and quotes escaped, because an unescaped
 * quote silently truncates the value at parse time rather than erroring.
 */
function serialise(value) {
  if (value === '') return ''
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Rewrites .env.local with the given values.
 *
 * Existing lines keep their position and their comments. A key already in the
 * file is replaced in place, so the layout and the explanations around each
 * block survive. Anything new is appended under one heading rather than
 * scattered, so it is obvious what was set from the UI.
 *
 * Returns { updated, added } as key name arrays for the caller to report. It
 * never returns a value.
 */
export async function writeEnvValues(values) {
  if (!envWritesEnabled()) {
    throw new Error('Environment writes are disabled outside development.')
  }

  const filePath = envPath()

  let original = ''                       // current file contents, empty if there is none
  try {
    original = await fs.readFile(filePath, 'utf8')
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw cause
  }

  const lines = original.split(/\r?\n/)   // split on both, the file may be CRLF on Windows
  const pending = new Map(Object.entries(values))
  const updated = []

  /*
   Replace in place. Matched on the key at the start of a line so a commented
   out example like `# LH_CRM_API_ID=` is left alone rather than being
   uncommented and overwritten, which would lose the example.
  */
  const rewritten = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (!match) return line

    const key = match[1]
    if (!pending.has(key)) return line

    const value = pending.get(key)
    pending.delete(key)
    updated.push(key)

    return `${key}=${serialise(value)}`
  })

  const added = [...pending.keys()]

  if (added.length > 0) {
    // One blank line before the heading, and only add the heading once
    if (!original.includes(APPEND_HEADING)) {
      if (rewritten[rewritten.length - 1] !== '') rewritten.push('')
      rewritten.push(APPEND_HEADING)
    }

    for (const [key, value] of pending) {
      rewritten.push(`${key}=${serialise(value)}`)
    }
  }

  /*
   Written with a trailing newline. A file ending mid line parses fine but
   makes the next append land on the same line as the last value.
  */
  let output = rewritten.join('\n')
  if (!output.endsWith('\n')) output += '\n'

  /*
   0o600, owner read and write only. The default would be 0o644 on a unix
   machine, which puts live credentials in a world readable file. Ignored on
   Windows, where the parent directory's ACL governs instead.
  */
  await fs.writeFile(filePath, output, { encoding: 'utf8', mode: 0o600 })

  return { updated, added }
}

/**
 * Which writable keys currently have a value in the environment.
 *
 * Presence only. Used so the UI can show which fields are already set without
 * the page ever holding a credential.
 */
export function describeWritableKeys() {
  const present = {}                      // key name to boolean, never a value

  for (const key of WRITABLE_KEYS) {
    present[key] = Boolean(String(process.env[key] || '').trim())
  }

  return present
}
