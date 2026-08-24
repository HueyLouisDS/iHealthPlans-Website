/**
 * CSV reading for the book of business import.
 *
 * Hand written rather than a dependency, because the only CSV this project
 * will ever read is a carrier portal export, and those are well formed. What
 * they are not is consistent, so the useful work here is the header mapping
 * below rather than the parsing.
 *
 * Every carrier names the same column differently. Aetna calls it Member Name,
 * UnitedHealth calls it Beneficiary, one of them splits it into 2 columns. The
 * alias table is the part that has to be maintained, and an unrecognised
 * header is reported rather than dropped, so a column nobody mapped shows up
 * as a warning instead of as silently missing data.
 */

/**
 * Parses a CSV into rows of raw strings.
 *
 * Handles quoted fields containing commas, escaped quotes, CRLF, and the byte
 * order mark that Excel writes. Not a general CSV implementation, it does not
 * do embedded newlines inside quoted fields, because no carrier export has
 * them and supporting it would mean a slower character loop for nothing.
 */
export function parseCsv(text) {
  /* Excel writes a BOM and it otherwise becomes part of the first header */
  const clean = text.replace(/^﻿/, '')

  const rows = []
  for (const line of clean.split(/\r?\n/)) {
    if (!line.trim()) continue

    const cells = []
    let cell = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          /* A doubled quote inside a quoted field is one literal quote */
          if (line[i + 1] === '"') {
            cell += '"'
            i += 1
          } else {
            inQuotes = false
          }
        } else {
          cell += char
        }
        continue
      }

      if (char === '"') inQuotes = true
      else if (char === ',') {
        cells.push(cell)
        cell = ''
      } else cell += char
    }

    cells.push(cell)
    rows.push(cells.map((value) => value.trim()))
  }

  return rows
}

/**
 * Column aliases, keyed by the field this project uses.
 *
 * Compared after stripping everything except letters and digits, so "Member
 * Name", "member_name", and "MEMBER NAME " all collapse to the same key and
 * only genuinely different wordings need an entry.
 *
 * TODO extend as real exports arrive. Each carrier that fails to map should
 * add its heading here rather than having its file edited by hand, or the next
 * export breaks the same way.
 */
const ALIASES = {
  firstName: ['firstname', 'fname', 'memberfirstname', 'beneficiaryfirstname', 'givenname'],
  lastName: ['lastname', 'lname', 'memberlastname', 'beneficiarylastname', 'surname', 'familyname'],
  fullName: ['name', 'membername', 'beneficiaryname', 'fullname', 'memberfullname', 'enrolleename'],
  phone: ['phone', 'phonenumber', 'homephone', 'telephone', 'primaryphone', 'contactnumber', 'mobile', 'cellphone'],
  email: ['email', 'emailaddress', 'memberemail'],
  zip: ['zip', 'zipcode', 'postalcode', 'zip5'],
  state: ['state', 'statecode', 'st'],
  county: ['county', 'countyname'],
  planName: ['plan', 'planname', 'productname', 'planproduct'],
  contractId: ['contract', 'contractid', 'contractnumber', 'hnumber', 'contracth', 'cmscontract'],
  pbpId: ['pbp', 'pbpid', 'pbpnumber', 'planbenefitpackage', 'pbpcode'],
  effectiveDate: ['effectivedate', 'enrollmenteffectivedate', 'coverageeffectivedate', 'effective', 'startdate'],
  termDate: ['termdate', 'terminationdate', 'enddate', 'disenrollmentdate'],
  agentName: ['agent', 'agentname', 'writingagent', 'agentofrecord', 'producer', 'producername', 'writingbroker'],
  agentId: ['agentid', 'writingagentid', 'npn', 'producerid', 'agentnpn'],
  memberId: ['memberid', 'mbi', 'subscriberid', 'hicn', 'beneficiaryid'],
  status: ['status', 'enrollmentstatus', 'memberstatus', 'policystatus'],
}

/**
 * Reduces a heading to its comparable form.
 */
function headerKey(heading) {
  return String(heading || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Maps a header row onto this project's field names.
 *
 * Returns the mapping and the headings it could not place. The unmapped list
 * is the important half. A carrier export carrying a column called "Plan Term
 * Date" that nobody mapped means the termination segment is silently empty,
 * and an empty segment looks exactly like good news.
 */
export function mapHeaders(headings, overrides = {}) {
  const mapping = {}
  const unmapped = []

  headings.forEach((heading, index) => {
    const key = headerKey(heading)

    /* An explicit override wins, for a heading too odd to be worth an alias */
    if (overrides[heading]) {
      mapping[overrides[heading]] = index
      return
    }

    const field = Object.keys(ALIASES).find((name) => ALIASES[name].includes(key))
    if (field && mapping[field] === undefined) mapping[field] = index
    else if (!field) unmapped.push(heading)
  })

  return { mapping, unmapped }
}

/**
 * Turns a parsed CSV into objects keyed by this project's field names.
 * Rows shorter than the header are padded rather than rejected, since a
 * trailing empty column is a common export artefact and not a broken row.
 */
export function toRecords(rows, overrides = {}) {
  if (rows.length < 2) return { records: [], unmapped: [], headings: rows[0] || [] }

  const [headings, ...body] = rows
  const { mapping, unmapped } = mapHeaders(headings, overrides)

  const records = body.map((cells) => {
    const record = {}
    for (const [field, index] of Object.entries(mapping)) {
      record[field] = cells[index] ?? ''
    }
    return record
  })

  return { records, unmapped, headings }
}
