// Imports the book of business from carrier portal exports.
//
// Takes one CSV per carrier, maps whatever columns each one uses onto a common
// shape, collapses them into one record per person, and writes the result to
// content/book/book.json for the admin area to read.
//
// Run it with:
//   node scripts/importBook.mjs aetna=~/Downloads/aetna.csv uhc=~/Downloads/uhc.csv
//
// The name before the equals sign is the carrier label and it ends up on every
// enrollment from that file, so keep it short and stable.

/*=============================================
    THIS TOUCHES REAL BENEFICIARY DATA
=============================================*/

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv, toRecords } from '../lib/book/csv.js'
import { toEnrollment, collapseToPeople } from '../lib/book/schema.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const outputDir = path.join(appRoot, 'content', 'book')
const outputFile = path.join(outputDir, 'book.json')

function parseArgs(argv) {
  const inputs = []

  for (const arg of argv) {
    const separator = arg.indexOf('=')
    if (separator < 1) {
      console.error(`Skipping "${arg}". Expected carrier=path, for example aetna=./aetna.csv`)
      continue
    }

    inputs.push({ carrier: arg.slice(0, separator).trim(), file: arg.slice(separator + 1).trim() })
  }

  return inputs
}

async function readCarrier({ carrier, file }) {
  const text = await fs.readFile(file, 'utf8')
  const { records, unmapped, headings } = toRecords(parseCsv(text))

  const enrollments = []
  const errors = []

  records.forEach((record, index) => {
    const result = toEnrollment(record, { carrier, rowNumber: index + 2 })  // row 1 is the header
    if (result.error) errors.push(result.error)
    else enrollments.push(result.enrollment)
  })

  return { carrier, file, enrollments, errors, unmapped, headings, rowCount: records.length }
}

async function run() {
  const inputs = parseArgs(process.argv.slice(2))

  if (inputs.length === 0) {
    console.error('Usage: node scripts/importBook.mjs carrier=path.csv [carrier=path.csv ...]')
    process.exitCode = 1
    return
  }

  const results = []
  for (const input of inputs) {
    try {
      results.push(await readCarrier(input))
    } catch (error) {
      console.error(`Could not read ${input.file}: ${error.message}`)
      process.exitCode = 1
      return
    }
  }

  const allEnrollments = results.flatMap((result) => result.enrollments)
  const people = collapseToPeople(allEnrollments)

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    outputFile,
    `${JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        carriers: results.map((r) => ({ carrier: r.carrier, rows: r.rowCount, used: r.enrollments.length })),
        people,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  console.log('')
  for (const result of results) {
    console.log(
      `${result.carrier.padEnd(12)} ${String(result.rowCount).padStart(6)} rows  ` +
        `${String(result.enrollments.length).padStart(6)} usable  ` +
        `${String(result.errors.length).padStart(5)} dropped`
    )

    if (result.unmapped.length) {
      console.warn(`  UNMAPPED COLUMNS, add these to ALIASES in lib/book/csv.js:`)
      for (const heading of result.unmapped) console.warn(`    "${heading}"`)
    }

    if (result.errors.length) {
      const sample = result.errors.slice(0, 3).map((e) => `row ${e.rowNumber}`).join(', ')
      console.warn(`  dropped for no usable phone: ${sample}${result.errors.length > 3 ? ', ...' : ''}`)
    }
  }

  const withinEbr = people.filter((person) => person.withinEbr).length
  const noDate = people.filter((person) => !person.lastTransaction).length
  const multiCarrier = people.filter((person) => person.carriers.length > 1).length

  console.log('')
  console.log(`${allEnrollments.length} enrollments collapsed to ${people.length} people`)
  console.log(`  ${multiCarrier} appear with more than 1 carrier and were merged`)
  console.log(`  ${withinEbr} inside the ${18} month established business relationship window`)
  console.log(`  ${people.length - withinEbr} outside it, of which ${noDate} have no effective date at all`)
  console.log('')
  console.log(`Written to ${path.relative(appRoot, outputFile)}, which is gitignored.`)

  if (people.length - withinEbr > 0) {
    console.log('')
    console.log(
      'The ones outside the window cannot be cold called on an established business\n' +
        'relationship alone. They need express written consent on file, or they need to\n' +
        'be reached by mail instead.'
    )
  }
}

run()
