// Writes integration credentials into .env.local, POST /api/admin/integrations.
//
// Backs the Configure button on /admin/integrations, so the keys can be set
// from the UI instead of by hand editing the file mid session.
//
// Development only. See the banner in lib/integrations/envFile.js for why a
// deployed app must never take this path.

import { getAdminSession } from '@/lib/admin/session'
import { validateValue } from '@/lib/integrations/fields'
import { writeEnvValues, envWritesEnabled } from '@/lib/integrations/envFile'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the write needs node:fs
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!envWritesEnabled()) {
    return errorResponse(ERRORS.forbidden, {
      error: 'Integration settings can only be changed in development. Set these on the host.',
    })
  }

  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) {
    return errorResponse(ERRORS.unauthorised, { error: 'Sign in to change integration settings.' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const values = body?.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return errorResponse(ERRORS.invalidPayload, { error: 'Expected a values object.' })
  }

  const errors = []
  for (const [key, value] of Object.entries(values)) {
    const problem = validateValue(key, value)
    if (problem) errors.push(problem)
  }

  if (errors.length > 0) {
    return errorResponse(ERRORS.invalidPayload, { error: 'Rejected.', errors })
  }

  if (Object.keys(values).length === 0) {
    return Response.json({ status: 'unchanged', updated: [], added: [] })
  }

  let result
  try {
    result = await writeEnvValues(values)
  } catch (cause) {
    return errorResponse(ERRORS.invalidPayload, {
      error: `Could not write .env.local: ${cause.message}`,
    })
  }

  console.warn('[admin:integrations] env updated by %s: %s', session.user.email, [
    ...result.updated,
    ...result.added,
  ].join(', '))

  return Response.json({
    status: 'saved',
    updated: result.updated,
    added: result.added,
    note: 'The dev server reloads .env.local automatically. Give it a second, then refresh.',
  })
}

export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST a values object with the integration settings to change.',
  })
}
