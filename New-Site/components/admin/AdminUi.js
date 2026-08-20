/**
 * Small shared pieces for the admin pages, grouped in one file because each is
 * a few lines and they are only ever used together.
 * Stat tiles, tables, empty states, and the "no data yet" notice that every
 * page currently shows.
 */

import Link from 'next/link'

/**
 * A single number with its label, and optionally the rate it converts at from
 * the stage above it in the funnel.
 */
export function StatTile({ label, value, rate, isMuted = false }) {
  return (
    <div className={`bg-white border rounded-lg p-5 flex flex-col gap-1 ${isMuted ? 'opacity-60' : ''}`}>
      <p className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381]">{label}</p>
      <p className="text-3xl font-bold text-ihealthBlue tabular-nums">{value}</p>
      {rate !== null && rate !== undefined && (
        <p className="text-sm text-[#505258]">{rate} from previous stage</p>
      )}
    </div>
  )
}

/**
 * Generic table.
 * `columns` is a list of { key, label, align, render }. Passing a render
 * function keeps formatting decisions with the page that owns the data rather
 * than pushing them into this component.
 */
export function DataTable({ columns, rows, emptyMessage, getRowHref }) {
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="bg-white border rounded-lg overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-[#f7f7f7]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-sm font-bold uppercase tracking-[1.2px] text-[#505258] whitespace-nowrap ${
                  column.align === 'right' ? 'text-right' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const href = getRowHref?.(row)

            return (
              <tr key={row.id || index} className="border-b last:border-b-0 hover:bg-[#f7f7f7]">
                {columns.map((column, columnIndex) => {
                  const content = column.render ? column.render(row) : row[column.key]

                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-base ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {/* Only the first cell links, so the row is navigable
                          without wrapping a whole table row in an anchor,
                          which is invalid markup and breaks selection */}
                      {href && columnIndex === 0 ? (
                        <Link href={href} className="text-[#105fa8] font-semibold hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Shown when a query returns nothing.
 */
export function EmptyState({ message }) {
  return (
    <div className="bg-white border rounded-lg px-6 py-14 text-center">
      <p className="text-lg text-[#505258]">{message}</p>
    </div>
  )
}

/**
 * The notice every admin page currently carries.
 * These pages are built and their data contracts are settled, but nothing is
 * being captured yet, so every number is zero. Saying so plainly is better
 * than showing a confident zero that reads as "we had no leads".
 */
export function NoDataYetNotice({ needs }) {
  return (
    <div className="mb-6 border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 rounded-r-lg">
      <p className="text-sm font-bold uppercase tracking-[1.2px] text-amber-800 mb-1">
        Not collecting data yet
      </p>
      <p className="text-lg text-amber-900">
        This page is built and its queries are defined, but there is no database and no tracking in
        place, so every figure below is zero rather than measured.
      </p>
      {needs && (
        <p className="text-base text-amber-900 mt-2">
          <span className="font-semibold">This page needs:</span> {needs}
        </p>
      )}
    </div>
  )
}
