// CSV export of agent performance, /admin/agents/export. No health or
// customer data, but it is named colleagues ranked against each other, so it
// audits like the others and carries its caveat as a column rather than as
// text on a page nobody forwards.

import { getAdminSession } from '@/lib/admin/session'
import { getAgentPerformance, parsePeriod, usingFixtures, LOW_VOLUME_LEADS } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

const COLUMNS = [
  ['name', 'Agent'],
  ['calls', 'Calls'],
  ['connected', 'Connected'],
  ['connectedRate', 'Connect rate'],
  ['talkTime', 'Talk time'],
  ['averageCall', 'Average connected call'],
  ['leads', 'Leads assigned'],
  ['conversions', 'Enrollments'],
  ['conversionRate', 'Enrollment rate'],
  ['lowVolume', `Fewer than ${LOW_VOLUME_LEADS} leads`],
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
  const days = parsePeriod(searchParams.get('period'))
  const sort = searchParams.get('sort') || 'conversions'

  const result = await getAgentPerformance({ days, sort })

  // An explicit selection from the table, which here means specific people
  const ids = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)
  const wanted = new Set(ids)
  const rows = ids.length ? result.agents.filter((agent) => wanted.has(agent.id)) : result.agents

  console.warn('[audit] agent export', {
    by: session.user.email,
    at: new Date().toISOString(),
    records: rows.length,
    filters: { days, sort },
    selection: ids.length ? ids : 'all agents',
    fixtures: usingFixtures(),
  })

  const header = COLUMNS.map(([, label]) => toCell(label)).join(',')
  const body = rows.map((agent) => COLUMNS.map(([key]) => toCell(agent[key])).join(','))
  const note =
    'Enrollment rate is not a like for like comparison. Lead quality varies by source and by hour, and none of that is held constant. Comparing agents fairly means comparing them within a source.'

  const csv = `﻿${[header, ...body, '', toCell(note)].join('\r\n')}\r\n`    // BOM for Excel UTF-8

  const stamp = new Date().toISOString().slice(0, 10)
  const name = `agents-${days}d-${stamp}.csv`
  const filename = usingFixtures() ? `DEMO-DATA-${name}` : name

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
