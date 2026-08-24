/**
 * Runs the TLD sync, POST /api/admin/sync.
 *
 * A route rather than a standalone script for 2 reasons. The `@/` alias and
 * `import 'server-only'` only resolve inside the Next build, and revalidateTag
 * only works with a request context, so a plain node script could pull the
 * data but could not tell the admin pages it had.
 *
 * scripts/sync.mjs is a thin caller for cron.
 */

import { revalidateTag } from 'next/cache'
import { timingSafeEqual, createHash } from 'node:crypto'

import { getAdminSession } from '@/lib/admin/session'
import { syncAll, inspect } from '@/lib/tld/sync'
import { RESOURCES } from '@/lib/tld/resources'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the database driver needs it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300          // a first full pull is not quick

/*=============================================
    TWO WAYS IN, AND CRON CANNOT SIGN IN

    An admin session covers a person clicking Sync now. A scheduled run has no
    session, so it presents LH_CRON_SECRET instead.

    Unset means the header route is closed entirely rather than open with an
    empty secret. An unconfigured cron that silently accepts every request is
    the failure worth designing out, since nothing about it looks wrong until
    somebody finds the endpoint.
=============================================*/

/**
 * Constant time comparison, hashed first so both sides are the same length.
 * timingSafeEqual throws on a length mismatch, and catching that would leak
 * the real secret's length through timing.
 */
function secretMatches(presented) {
  const configured = String(process.env.LH_CRON_SECRET || '').trim()
  if (!configured || !presented) return false

  const left = createHash('sha256').update(String(presented)).digest()
  const right = createHash('sha256').update(configured).digest()

  return timingSafeEqual(left, right)
}

/**
 * Whether this request may run a sync, and how it proved it.
 */
async function authorise(request) {
  if (secretMatches(request.headers.get('x-lh-cron-secret'))) return 'cron'

  const session = await getAdminSession()
  if (session?.user?.isAuthorised) return session.user.email

  return null
}

/**
 * Runs the sync, or inspects the field mapping.
 *
 * Body may carry { only } to sync one resource, { dryRun } to fetch and map
 * without writing, or { inspect } to report what TLD actually returns against
 * what resources.js expects.
 */
export async function POST(request) {
  const actor = await authorise(request)
  if (!actor) {
    return errorResponse(ERRORS.unauthorised, { error: 'Sign in or present the cron secret.' })
  }

  /* An empty body is a plain full sync, which is what cron sends */
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (body.inspect) {
    return Response.json(
      { status: 'inspected', findings: await inspect() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const startedAt = Date.now()
  const result = await syncAll({ only: body.only || null, dryRun: Boolean(body.dryRun) })

  /*
   Only tags whose resource actually wrote something. Invalidating everything
   on every run would throw away good cached aggregates because an unrelated
   endpoint happened to fail.
  */
  if (!body.dryRun) {
    const changed = new Set(
      result.results
        .filter((one) => one.ok && one.rows > 0)
        .map((one) => RESOURCES.find((r) => r.name === one.name)?.tag)
        .filter(Boolean)
    )

    for (const tag of changed) revalidateTag(tag)
    if (changed.size > 0) revalidateTag('db:attribution')
  }

  console.warn(
    '[sync] run by %s, %s',
    actor,
    result.results.map((one) => `${one.name}=${one.ok ? one.rows : 'FAILED'}`).join(' ')
  )

  return Response.json(
    { ...result, durationMs: Date.now() - startedAt },
    {
      /* 207 when some resources failed, so cron can alert without parsing */
      status: result.ok ? 200 : 207,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

/**
 * Everything else, answered explicitly rather than with a bare 405.
 */
export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST to run the sync. Body may carry only, dryRun, or inspect.',
  })
}
