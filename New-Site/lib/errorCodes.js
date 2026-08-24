// Error codes returned by the api routes.
// Namespaced so a code pasted into a support ticket is unambiguous, and so a
// grep for LH- across the client's own logs finds every failure this app
// produced rather than every failure anything produced.

/*=======================================================
        THE NUMBERING IS HTTP STATUS PLUS A SEQUENCE
========================================================*/

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
