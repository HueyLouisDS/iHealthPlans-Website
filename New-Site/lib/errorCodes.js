// Error codes returned by the api routes.
// Namespaced so a code pasted into a support ticket is unambiguous, and so a
// grep for LH- across the client's own logs finds every failure this app
// produced rather than every failure anything produced.

/*=======================================================
        THE NUMBERING IS HTTP STATUS PLUS A SEQUENCE
========================================================*/

/*
 LH-4002 is the second distinct 400 this app can return. Reading the status
 straight off the code means somebody triaging a ticket knows whether it was
 their request or our server before they open anything.

 A code is permanent once it has been returned to anybody. Retire one rather
 than reusing the number, because a support ticket from 6 months ago still
 says LH-4002 and it has to still mean what it meant then.

 `reason` is the machine readable slug an integrator matches on. `code` is
 the human readable thing they quote at you. Both are sent, because a
 client library should never have to parse prose.
*/
export const ERRORS = {
  malformedJson:    { code: 'LH-4001', status: 400, reason: 'malformed_json' },
  invalidLead:      { code: 'LH-4002', status: 400, reason: 'invalid_lead' },
  invalidPayload:   { code: 'LH-4003', status: 400, reason: 'invalid_payload' },
  unauthorised:     { code: 'LH-4011', status: 401, reason: 'unauthorised' },
  forbidden:        { code: 'LH-4031', status: 403, reason: 'forbidden' },
  notFound:         { code: 'LH-4041', status: 404, reason: 'not_found' },
  methodNotAllowed: { code: 'LH-4051', status: 405, reason: 'method_not_allowed' },
  tooLarge:         { code: 'LH-4131', status: 413, reason: 'too_large' },
  ingestionOff:     { code: 'LH-5031', status: 503, reason: 'ingestion_disabled' },
}

/**
 * Builds an error response from one of the codes above.
 *
 * Here rather than at each route so the body shape is decided once. An
 * integrator writing against 2 endpoints that disagree about whether the field
 * is called `error` or `message` will pick one and be broken by the other.
 */
export function errorResponse(error, extra = {}) {
  const body = {                        // the response body, code first so it is the first thing read
    code: error.code,
    reason: error.reason,
    ...extra,
  }

  return Response.json(body, {
    status: error.status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
