/**
 * Tests one integration's credentials, POST /api/admin/integrations/test.
 *
 * Backs the Test Connection buttons. Runs against the values typed into the
 * form rather than the saved ones, because nothing is saved until Configure
 * and you would otherwise have to write a bad key to disk to find out it was
 * bad.
 */

import { getAdminSession } from '@/lib/admin/session'
import { validateValue } from '@/lib/integrations/fields'
import { envWritesEnabled } from '@/lib/integrations/envFile'
import { crmConfig, vendorConfig } from '@/lib/integrations/config'
import { testCrm, testVendor } from '@/lib/integrations/testConnection'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, the config modules are server-only
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*=============================================
    TYPED VALUES ARE ONLY ACCEPTED IN DEVELOPMENT

    Outside development the form is read only, so there is nothing legitimate
    to submit. Accepting a base url from a browser and then having the server
    fetch it is a request forgery primitive, and the fewer environments that
    can reach it the better.

    In production the button still works, it just tests what is already
    configured on the host and ignores anything sent with the request.
=============================================*/

/**
 * Runs one integration's check.
 * 400 for an unknown integration, 401 without an authorised session, 200 with
 * { ok, message } either way once it has actually run.
 */
export async function POST(request) {
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) {
    return errorResponse(ERRORS.unauthorised, { error: 'Sign in to test a connection.' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const name = String(body?.name || '')
  const submitted = body?.values && typeof body.values === 'object' ? body.values : {}

  /*
   Checked against the same whitelist the write route uses, so this endpoint
   cannot be handed an arbitrary key name either.
  */
  const errors = []
  for (const [key, value] of Object.entries(submitted)) {
    const problem = validateValue(key, value)
    if (problem) errors.push(problem)
  }

  if (errors.length > 0) {
    return errorResponse(ERRORS.invalidPayload, { error: 'Rejected.', errors })
  }

  // Ignored outside development, see the banner
  const typed = envWritesEnabled() ? submitted : {}

  if (name === 'crm') {
    const stored = crmConfig()
    return Response.json(
      await testCrm({
        baseUrl: typed.LH_CRM_BASE_URL ?? stored.baseUrl,
        apiId: typed.LH_CRM_API_ID ?? stored.apiId,
        apiKey: typed.LH_CRM_API_KEY ?? stored.apiKey,
      }),
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (name === 'vendor') {
    const stored = vendorConfig()
    return Response.json(
      await testVendor({
        postUrl: typed.LH_VENDOR_POST_URL ?? stored.postUrl,
        vendorId: typed.LH_VENDOR_ID ?? stored.vendorId,
        postKey: typed.LH_VENDOR_POST_KEY ?? stored.postKey,
      }),
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return errorResponse(ERRORS.invalidPayload, { error: `Unknown integration "${name}".` })
}

/**
 * Everything else, answered explicitly rather than with a bare 405.
 */
export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST { name, values } to test one integration.',
  })
}
