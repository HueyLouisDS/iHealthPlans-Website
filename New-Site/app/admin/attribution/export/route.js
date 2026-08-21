/**
 * CSV export of the attribution breakdown, /admin/attribution/export.
 *
 * Unlike the lead and call exports this file holds aggregates, not people, so
 * it carries no personal data and no health information. It is still authorised
 * and still audited, because "this one is harmless" is how an export route ends
 * up being the one nobody checked.
 *
 * TODO the audit currently goes to the server log. It needs a table once the
 * database exists, because a log that rotates is not an audit trail.
 */

import { getAdminSession } from '@/lib/admin/session'
import {
  getAttributionForExport,
  parsePeriod,
  parseDimension,
  usingFixtures,
  ATTRIBUTION_DIMENSIONS,
  LOW_VOLUME_LEADS,
} from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

const COLUMNS = [
  ['leads', 'Leads'],
  ['leadShare', 'Share of leads'],
  ['calls', 'Calls'],
  ['callsPerLead', 'Calls per lead'],
  ['conversions', 'Enrollments'],
  ['conversionRate', 'Enrollment rate'],
  // Carried into the file on purpose. The thin marker is the only thing
  // stopping a 3 lead row reading as the best performing source, and a
  // spreadsheet strips every visual cue the page had.
  ['lowVolume', `Fewer than ${LOW_VOLUME_LEADS} leads`],
]

/**
 * Escapes one CSV cell.
 *
 * The leading apostrophe on anything starting with an operator is deliberate.
 * A spreadsheet treats a cell beginning with =, +, -, or @ as a formula, so an
 * attacker supplied value becomes code when the file is opened in Excel. Group
 * values here are campaign names and landing paths, which come from whatever
 * somebody typed into an ad platform, so they are exactly that kind of value.
 */
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
  const groupBy = parseDimension(searchParams.get('groupBy'))
  const dimension = ATTRIBUTION_DIMENSIONS.find((d) => d.value === groupBy)

  const filters = {
    groupBy,
    days: parsePeriod(searchParams.get('period')),
    device: searchParams.get('device') || undefined,
    onBehalfOf: searchParams.get('audience') || undefined,
    sort: searchParams.get('sort') || 'leads',
  }

  // An explicit selection from the table. These are slugs rather than the group
  // values themselves, because a campaign name containing a comma would split
  // into 2 ids and export the wrong rows.
  const ids = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)

  const rows = await getAttributionForExport(filters, ids)

  console.warn('[audit] attribution export', {
    by: session.user.email,
    at: new Date().toISOString(),
    records: rows.length,
    filters,
    selection: ids.length ? ids.length : 'all matching',
    fixtures: usingFixtures(),
  })

  // The first column is named after whatever was grouped, matching the screen
  const header = [toCell(dimension.column), ...COLUMNS.map(([, label]) => toCell(label))].join(',')
  const body = rows.map((row) =>
    [toCell(row.value), ...COLUMNS.map(([key]) => toCell(row[key]))].join(',')
  )

  // The BOM is what makes Excel read the file as UTF-8
  const csv = `﻿${[header, ...body].join('\r\n')}\r\n`

  const stamp = new Date().toISOString().slice(0, 10)
  const name = `attribution-${groupBy}-${stamp}.csv`
  const filename = usingFixtures() ? `DEMO-DATA-${name}` : name

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  })
}
