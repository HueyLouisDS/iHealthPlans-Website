// CSV reading for the book of business import.
//
// Hand written rather than a dependency, because the only CSV this project
// will ever read is a carrier portal export, and those are well formed. What
// they are not is consistent, so the useful work here is the header mapping
// below rather than the parsing.
//
// Every carrier names the same column differently. Aetna calls it Member Name,
// UnitedHealth calls it Beneficiary, one of them splits it into 2 columns. The
// alias table is the part that has to be maintained, and an unrecognised
// header is reported rather than dropped, so a column nobody mapped shows up
// as a warning instead of as silently missing data.

// Parses a CSV into rows of raw strings.
//
// Handles quoted fields containing commas, escaped quotes, CRLF, and the byte
// order mark that Excel writes. Not a general CSV implementation, it does not
// do embedded newlines inside quoted fields, because no carrier export has
// them and supporting it would mean a slower character loop for nothing.

export function parseCsv(text) {
  // Excel writes a BOM and it otherwise becomes part of the first header
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
          // A doubled quote inside a quoted field is one literal quote
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

function headerKey(heading) {
  return String(heading || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function mapHeaders(headings, overrides = {}) {
  const mapping = {}
  const unmapped = []

  headings.forEach((heading, index) => {
    const key = headerKey(heading)

    // An explicit override wins, for a heading too odd to be worth an alias
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
