/**
 * What a book of business record is, and how many carrier exports become one.
 *
 * The model is one person with many enrollments, not one row per enrollment.
 * That matters operationally rather than aesthetically. A client with an MA
 * plan from one carrier and a standalone PDP from another appears in 2
 * exports, and a campaign built on rows would call them twice, which is
 * exactly the thing that makes somebody leave.
 *
 * TODO this writes to a json file because there is no database. Once
 * db/migrations exists it becomes a people table and an enrollments table with
 * the same shape, and importBook.mjs writes there instead.
 */

/*
 * Relative rather than the @/ alias, and with the extension, because
 * scripts/importBook.mjs runs under plain node where the alias does not
 * resolve. Next handles a relative import identically, so this works in both.
 */
import { normalisePhone } from '../leads/schema.js'

/**
 * How long an established business relationship lasts for do not call
 * purposes, counted from the last transaction.
 *
 * This is the field that decides whether somebody can be called at all, which
 * is why it is computed at import rather than worked out per campaign. A
 * transaction buys 18 months. A bare inquiry, which is what a lead is, buys 3,
 * and that is handled in the lead schema rather than here.
 *
 * TODO confirm against the states you are licensed in. Several run stricter
 * rules than the federal baseline and Florida is the usual one to catch people
 * out.
 */
export const EBR_MONTHS = 18

/**
 * Turns a date from any of the formats a carrier export uses into an ISO date,
 * or null. Returns null rather than guessing, because a wrong effective date
 * silently moves somebody in or out of the callable window.
 */
export function normaliseDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  /* Already ISO, or close enough that Date parses it unambiguously */
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw.slice(0, 10))
    return Number.isNaN(parsed.getTime()) ? null : raw.slice(0, 10)
  }

  /*
   * US ordering, which is what every carrier portal exports. Parsed by hand
   * rather than handed to Date, because Date reads 03/04/2026 as March in some
   * runtimes and April in others depending on locale, and a 1 month error here
   * moves people across the callable boundary.
   */
  const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(raw)
  if (!parts) return null

  const [, month, day, year] = parts
  const fullYear = year.length === 2 ? `20${year}` : year
  const iso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : iso
}

/**
 * Splits a single name column into first and last.
 * Handles "Last, First" as well as "First Last", since exports use both. A
 * middle name is folded into the first name rather than dropped, because the
 * only use for this field is an agent reading it aloud.
 */
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

/**
 * Normalises the plan identifiers.
 *
 * A contract is H followed by 4 digits, a PBP is 3 digits, and together they
 * identify a specific plan in the CMS Landscape files. Kept strictly formatted
 * because matching the book against next year's terminations is a string
 * comparison, and "H1234" not matching "h1234 " would quietly report that
 * nobody's plan is ending.
 */
export function normalisePlanIds(contractId, pbpId) {
  const contract = String(contractId || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const pbp = String(pbpId || '').trim().replace(/[^0-9]/g, '')

  return {
    contractId: /^[HRSE]\d{4}$/.test(contract) ? contract : null,
    pbpId: pbp ? pbp.padStart(3, '0') : null,
  }
}

/**
 * Turns one raw CSV record into an enrollment, or explains why it cannot.
 *
 * A phone number is the only hard requirement, because a client you cannot
 * ring is not reachable by any campaign this is being built for. Everything
 * else is recorded when present and reported when absent.
 */
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
      /* The pair is what the Landscape files key on, so it is stored ready */
      planKey: contractId && pbpId ? `${contractId}-${pbpId}` : null,

      effectiveDate: normaliseDate(record.effectiveDate),
      termDate: normaliseDate(record.termDate),
      status: String(record.status || '').trim() || null,

      agentName: String(record.agentName || '').trim() || null,
      agentId: String(record.agentId || '').trim() || null,
    },
  }
}

/**
 * Whether a person is inside the established business relationship window.
 *
 * Counted from the most recent effective date across their enrollments, which
 * is the closest thing an export gives us to a last transaction. Somebody who
 * renewed into a new plan year has a fresher date than somebody who enrolled
 * once in 2019 and never moved, and that is the right distinction.
 */
export function ebrStatus(enrollments, now = new Date()) {
  const dates = enrollments.map((e) => e.effectiveDate).filter(Boolean).sort()
  const latest = dates[dates.length - 1] || null
  if (!latest) return { lastTransaction: null, monthsSince: null, withinEbr: false }

  const since = new Date(latest)
  const monthsSince =
    (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth())

  return { lastTransaction: latest, monthsSince, withinEbr: monthsSince <= EBR_MONTHS }
}

/**
 * Collapses many enrollment rows into one record per person.
 *
 * Keyed on the normalised phone number. Not on name, because 2 Margaret
 * Wilsons in the same county are a real thing and merging them would put one
 * person's plan against another's. A shared household line merges 2 spouses
 * into 1 record, which is the known cost of this choice, and it is the safer
 * error of the two since it produces 1 call to a household rather than a
 * wrongly attributed plan.
 *
 * TODO once a member id or MBI is reliably present across exports, key on that
 * and fall back to phone, which fixes the shared line case.
 */
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

    /*
     * First non empty value wins for the person level fields. A later export
     * missing a zip should not blank one an earlier export supplied.
     */
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

/**
 * A version of a person safe to write to a log or a console summary.
 */
export function redactPerson(person) {
  return {
    phoneLast4: person.phone.slice(-4),
    zip: person.zip,
    carriers: person.carriers,
    plans: person.enrollments.map((e) => e.planKey || e.planName || 'unknown'),
    withinEbr: person.withinEbr,
  }
}
