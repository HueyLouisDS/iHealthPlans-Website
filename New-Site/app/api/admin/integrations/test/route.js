// Tests one integration's credentials, POST /api/admin/integrations/test.
//
// Backs the Test Connection buttons. Runs against the values typed into the
// form rather than the saved ones, because nothing is saved until Configure
// and you would otherwise have to write a bad key to disk to find out it was
// bad.

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
=============================================*/

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
  const errors = []
  for (const [key, value] of Object.entries(submitted)) {
    const problem = validateValue(key, value)
    if (problem) errors.push(problem)
  }

  if (errors.length > 0) {
    return errorResponse(ERRORS.invalidPayload, { error: 'Rejected.', errors })
  }

  const typed = envWritesEnabled() ? submitted : {} // ignored outside development

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

export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST { name, values } to test one integration.',
  })
}
