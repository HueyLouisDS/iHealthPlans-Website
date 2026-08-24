// What a book of business record is, and how many carrier exports become one.
//
// The model is one person with many enrollments, not one row per enrollment.
// That matters operationally rather than aesthetically. A client with an MA
// plan from one carrier and a standalone PDP from another appears in 2
// exports, and a campaign built on rows would call them twice, which is
// exactly the thing that makes somebody leave.
//
// TODO this writes to a json file because there is no database. Once
// db/migrations exists it becomes a people table and an enrollments table with
// the same shape, and importBook.mjs writes there instead.

// Relative rather than the @/ alias, and with the extension, because
// scripts/importBook.mjs runs under plain node where the alias does not
// resolve. Next handles a relative import identically, so this works in both.
import { normalisePhone } from '../leads/schema.js'

export const EBR_MONTHS = 18

export function normaliseDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  // Already ISO, or close enough that Date parses it unambiguously
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw.slice(0, 10))
    return Number.isNaN(parsed.getTime()) ? null : raw.slice(0, 10)
  }

  const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(raw)
  if (!parts) return null

  const [, month, day, year] = parts
  const fullYear = year.length === 2 ? `20${year}` : year
  const iso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : iso
}

export function splitName(full) {
  const raw = String(full || '').trim().replace(/\s+/g, ' ')
  if (!raw) return { firstName: null, lastName: null }

  if (raw.includes(',')) {
    const [last, rest] = raw.split(',')
    return { firstName: rest?.trim() || null, lastName: last.trim() || null }
  }

  const parts = raw.split(' ')
  if (parts.length === 1) return { firstName: null, lastName: parts[0] }

  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export function normalisePlanIds(contractId, pbpId) {
  const contract = String(contractId || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const pbp = String(pbpId || '').trim().replace(/[^0-9]/g, '')

  return {
    contractId: /^[HRSE]\d{4}$/.test(contract) ? contract : null,
    pbpId: pbp ? pbp.padStart(3, '0') : null,
  }
}

export function toEnrollment(record, { carrier, rowNumber }) {
  const phone = normalisePhone(record.phone)
  if (!phone) {
    return { error: { rowNumber, reason: 'no usable phone number', name: record.fullName || record.lastName || null } }
  }

  const named = record.firstName || record.lastName
    ? { firstName: record.firstName || null, lastName: record.lastName || null }
    : splitName(record.fullName)

  const { contractId, pbpId } = normalisePlanIds(record.contractId, record.pbpId)

  return {
    enrollment: {
      carrier,
      phone,
      firstName: named.firstName,
      lastName: named.lastName,
      email: String(record.email || '').trim().toLowerCase() || null,
      zip: /^\d{5}/.test(String(record.zip || '')) ? String(record.zip).slice(0, 5) : null,
      state: String(record.state || '').trim().toUpperCase().slice(0, 2) || null,
      county: String(record.county || '').trim() || null,
      memberId: String(record.memberId || '').trim() || null,

      planName: String(record.planName || '').trim() || null,
      contractId,
      pbpId,
      // The pair is what the Landscape files key on, so it is stored ready
      planKey: contractId && pbpId ? `${contractId}-${pbpId}` : null,

      effectiveDate: normaliseDate(record.effectiveDate),
      termDate: normaliseDate(record.termDate),
      status: String(record.status || '').trim() || null,

      agentName: String(record.agentName || '').trim() || null,
      agentId: String(record.agentId || '').trim() || null,
    },
  }
}

export function ebrStatus(enrollments, now = new Date()) {
  const dates = enrollments.map((e) => e.effectiveDate).filter(Boolean).sort()
  const latest = dates[dates.length - 1] || null
  if (!latest) return { lastTransaction: null, monthsSince: null, withinEbr: false }

  const since = new Date(latest)
  const monthsSince =
    (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth())

  return { lastTransaction: latest, monthsSince, withinEbr: monthsSince <= EBR_MONTHS }
}

export function collapseToPeople(enrollments, now = new Date()) {
  const byPhone = new Map()

  for (const enrollment of enrollments) {
    if (!byPhone.has(enrollment.phone)) {
      byPhone.set(enrollment.phone, {
        phone: enrollment.phone,
        firstName: enrollment.firstName,
        lastName: enrollment.lastName,
        email: enrollment.email,
        zip: enrollment.zip,
        state: enrollment.state,
        county: enrollment.county,
        agentName: enrollment.agentName,
        agentId: enrollment.agentId,
        enrollments: [],
      })
    }

    const person = byPhone.get(enrollment.phone)
    person.firstName ||= enrollment.firstName
    person.lastName ||= enrollment.lastName
    person.email ||= enrollment.email
    person.zip ||= enrollment.zip
    person.state ||= enrollment.state
    person.county ||= enrollment.county
    person.agentName ||= enrollment.agentName
    person.agentId ||= enrollment.agentId

    person.enrollments.push(enrollment)
  }

  return [...byPhone.values()].map((person) => ({
    ...person,
    ...ebrStatus(person.enrollments, now),
    carriers: [...new Set(person.enrollments.map((e) => e.carrier))],
  }))
}

export function redactPerson(person) {
  return {
    phoneLast4: person.phone.slice(-4),
    zip: person.zip,
    carriers: person.carriers,
    plans: person.enrollments.map((e) => e.planKey || e.planName || 'unknown'),
    withinEbr: person.withinEbr,
  }
}
