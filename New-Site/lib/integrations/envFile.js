// Reads and rewrites .env.local so the admin page can set integration
// credentials without hand editing the file. Development only.

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { WRITABLE_KEYS } from '@/lib/integrations/fields'

/*=======================================================
        DEVELOPMENT ONLY
========================================================*/

/*
 A deployed app gets its environment from the host, so a write there would
 succeed and change nothing. next build always sets NODE_ENV to production,
 so a deployed app cannot reach this path.
*/
export function envWritesEnabled() {
  return process.env.NODE_ENV !== 'production'
}

const ENV_FILE = '.env.local'
const APPEND_HEADING = '# Added from /admin/integrations'

/**
 * Absolute path to .env.local. next dev runs with cwd at the app root, which
 * is where Next looks for it too.
 */
function envPath() {
  return path.join(process.cwd(), ENV_FILE)
}

/**
 * Formats a value for a dotenv line. Quoted only when it has to be, since an
 * unescaped quote truncates the value at parse time rather than erroring.
 */
function serialise(value) {
  if (value === '') return ''
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Rewrites .env.local with the given values.
 *
 * Existing keys are replaced in place so the layout and comments survive.
 * Returns key names, never values.
 */
export async function writeEnvValues(values) {
  if (!envWritesEnabled()) {
    throw new Error('Environment writes are disabled outside development.')
  }

  const filePath = envPath()

  let original = ''                       // current contents, empty if no file
  try {
    original = await fs.readFile(filePath, 'utf8')
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw cause
  }

  const lines = original.split(/\r?\n/)   // both, the file may be CRLF
  const pending = new Map(Object.entries(values))
  const updated = []                      // keys overwritten in place

  /* Matched at line start, so a commented out example is left alone */
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

  const added = [...pending.keys()]       // keys not already in the file

  if (added.length > 0) {
    if (!original.includes(APPEND_HEADING)) {
      if (rewritten[rewritten.length - 1] !== '') rewritten.push('')
      rewritten.push(APPEND_HEADING)
    }

    for (const [key, value] of pending) {
      rewritten.push(`${key}=${serialise(value)}`)
    }
  }

  /* Trailing newline, or the next append lands on the last value's line */
  let output = rewritten.join('\n')
  if (!output.endsWith('\n')) output += '\n'

  /* 0o600, since the default 0o644 is world readable. Ignored on Windows. */
  await fs.writeFile(filePath, output, { encoding: 'utf8', mode: 0o600 })

  return { updated, added }
}

/**
 * Which writable keys have a value. Presence only, so the UI can show what is
 * set without holding a credential.
 */
export function describeWritableKeys() {
  const present = {}                      // key name to boolean, never a value

  for (const key of WRITABLE_KEYS) {
    present[key] = Boolean(String(process.env[key] || '').trim())
  }

  return present
}
