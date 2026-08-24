// CSV export of the lead list, /admin/leads/export.
//
// This is a bulk extract of personal information about identifiable people,
// which makes it the single most sensitive action in the admin area. Three
// things follow from that and none of them are optional.
//
// 1. It is authorised again here. Middleware already guards /admin, but a
//    route that hands out every lead in one file should not rely on a single
//    check somewhere else in the stack.
// 2. Every export is written to an audit log with who took it, when, how many
//    records, and which filters were applied. After an incident this is the
//    first question asked, and "we do not know" is not an answer.
// 3. It exports exactly what the filters select, not the page on screen. An
//    export that silently returns 25 of 800 rows is worse than no export.
//
// TODO the audit currently goes to the server log. It needs to go to a table
// once the database exists, because a log that rotates is not an audit trail.

import { getAdminSession } from '@/lib/admin/session'
import { getLeadsForExport, parsePeriod, usingFixtures } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'
const COLUMNS = [
  ['name', 'Name'],
  ['phone', 'Phone'],
  ['zip', 'Zip'],
  ['status', 'Status'],
  ['source', 'Source'],
  ['campaign', 'Campaign'],
  ['landingPage', 'Landing page'],
  ['onBehalfOf', 'Enquiring for'],
  ['device', 'Device'],
  ['callCount', 'Calls'],
  ['agent', 'Agent'],
  ['createdAtLabel', 'Received'],
  ['id', 'Lead id'],
  ['visitorId', 'Visitor id'],
  ['sessionId', 'Session id'],
]

function toCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${guarded.replace(/"/g, '""')}"`
}

export async function GET(request) {
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) {
    return new Response('Not authorised', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = {
    days: parsePeriod(searchParams.get('period')),
    source: searchParams.get('source') || undefined,
    status: searchParams.get('status') || undefined,
    query: searchParams.get('q') || undefined,
    sort: searchParams.get('sort') || 'newest',
  }

  const ids = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)

  const leads = await getLeadsForExport(filters, ids)
  console.warn('[audit] lead export', {
    by: session.user.email,
    at: new Date().toISOString(),
    records: leads.length,
    filters,
    // Recorded so an audit can tell a whole view from a hand picked subset
    selection: ids.length ? ids.length : 'all matching',
    // Flagged so a fabricated export is never mistaken for a real one in the log
    fixtures: usingFixtures(),
  })

  const header = COLUMNS.map(([, label]) => toCell(label)).join(',')
  const rows = leads.map((lead) => COLUMNS.map(([key]) => toCell(lead[key])).join(','))
  const csv = `﻿${[header, ...rows].join('\r\n')}\r\n`

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = usingFixtures() ? `DEMO-DATA-leads-${stamp}.csv` : `leads-${stamp}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Never cached. This is personal data and it is per user.
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
