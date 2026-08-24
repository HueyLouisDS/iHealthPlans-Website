// CSV export of the call log, /admin/calls/export.
//
// Same rules as the lead export, and one more that is specific to calls.
//
// 1. Authorised again here rather than relying on middleware alone.
// 2. Every export is audited, with who, when, how many, and which filters.
// 3. It exports what the filters select, not the page on screen.
// 4. NO RECORDING URLS. A call recording contains personal health information,
//    and a url in a spreadsheet is a link that gets forwarded, pasted into
//    chat, and opened by people who were never granted access. The export says
//    whether a recording exists. Reaching it stays behind the audited path on
//    the call detail page.
//
// TODO the audit currently goes to the server log. It needs a table once the
// database exists, because a log that rotates is not an audit trail.

import { getAdminSession } from '@/lib/admin/session'
import { getCallsForExport, parsePeriod, usingFixtures } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

const COLUMNS = [
  ['startedAtLabel', 'Started'],
  ['fromNumber', 'From'],
  ['leadName', 'Lead'],
  ['agent', 'Agent'],
  ['disposition', 'Outcome'],
  ['durationLabel', 'Duration'],
  ['matched', 'Matched to session'],
  ['hasRecording', 'Recording exists'],
  ['id', 'Call id'],
  ['leadId', 'Lead id'],
  ['sessionId', 'Session id'],
  ['visitorId', 'Visitor id'],
]

function toCell(value) {
  const text =
    value === null || value === undefined
      ? ''
      : typeof value === 'boolean'
        ? value
          ? 'yes'
          : 'no'
        : String(value)

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
    matched: searchParams.get('matched') || undefined,
    disposition: searchParams.get('disposition') || undefined,
    agentId: searchParams.get('agent') || undefined,
    hasRecording: searchParams.get('recording') || undefined,
    sort: searchParams.get('sort') || 'newest',
  }

  const ids = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)

  const calls = await getCallsForExport(filters, ids)

  console.warn('[audit] call export', {
    by: session.user.email,
    at: new Date().toISOString(),
    records: calls.length,
    filters,
    selection: ids.length ? ids.length : 'all matching',
    fixtures: usingFixtures(),
  })

  const header = COLUMNS.map(([, label]) => toCell(label)).join(',')
  const rows = calls.map((call) => COLUMNS.map(([key]) => toCell(call[key])).join(','))

  // The BOM is what makes Excel read the file as UTF-8
  const csv = `﻿${[header, ...rows].join('\r\n')}\r\n`

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = usingFixtures() ? `DEMO-DATA-calls-${stamp}.csv` : `calls-${stamp}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
