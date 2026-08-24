// Small shared pieces for the admin pages, grouped in one file because each is
// a few lines and they are only ever used together.
// Stat tiles, tables, empty states, and the "no data yet" notice that every
// page currently shows.

import Link from 'next/link'

export function StatTile({ label, value, rate, delta, isMuted = false, href, isSelected = false, selectedLabel }) {
  const className = `bg-white border rounded-lg p-5 flex flex-col gap-1 transition-[box-shadow,opacity,border-color] ${
    isMuted ? 'opacity-60' : ''
  } ${
    isSelected
      ? 'border-ihealthGreen ring-2 ring-ihealthGreen'
      : href
        ? /*
           * Hover is blue, selected is green, so the 2 states are different
           * colours rather than 2 strengths of one. Focus gets the full green
           * ring, since a keyboard user never sees hover at all and needs to
           * know where the selection would land.
           */
          'hover:border-ihealthBlue/40 hover:ring-2 hover:ring-ihealthBlue/25 focus-visible:outline-none focus-visible:border-ihealthGreen focus-visible:ring-2 focus-visible:ring-ihealthGreen'
        : ''
  }`

  const body = (
    <>
      <p className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381]">{label}</p>

      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-3xl font-bold text-ihealthBlue tabular-nums">{value}</p>
        {delta && <DeltaBadge delta={delta} />}
      </div>

      {rate !== null && rate !== undefined && (
        <p className="text-sm text-[#505258]">{rate} from previous stage</p>
      )}
    </>
  )

  if (!href) return <div className={className}>{body}</div>

  return (
    <Link
      href={href}
      aria-current={isSelected ? 'true' : undefined}
      className={className}
    >
      {body}
      {selectedLabel && <span className="sr-only">{selectedLabel}</span>}
    </Link>
  )
}

export function DeltaBadge({ delta }) {
  const styles = {
    up: 'bg-green-100 text-green-900',
    down: 'bg-red-100 text-red-900',
    flat: 'bg-gray-100 text-gray-700',
  }

  const arrows = { up: '↑', down: '↓', flat: '→' }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-semibold ${styles[delta.direction]}`}
      title="Compared with the previous period of the same length"
    >
      <span aria-hidden="true">{arrows[delta.direction]}</span>
      {delta.value}
      <span className="sr-only">
        {delta.direction === 'up' ? 'increase' : delta.direction === 'down' ? 'decrease' : 'no change'} on the
        previous period
      </span>
    </span>
  )
}

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

export function StatusPill({ status }) {
  const styles = {
    new: 'bg-blue-100 text-blue-900',
    contacted: 'bg-amber-100 text-amber-900',
    qualified: 'bg-purple-100 text-purple-900',
    enrolled: 'bg-green-100 text-green-900',
    lost: 'bg-gray-200 text-gray-800',
  }

  return (
    <span className={`inline-block px-2.5 py-1 rounded text-sm font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export function MatchPill({ matched }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded text-sm font-semibold ${matched ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
      {matched ? 'Matched' : 'Unmatched'}
    </span>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="bg-white border rounded-lg px-6 py-14 text-center">
      <p className="text-lg text-[#505258]">{message}</p>
    </div>
  )
}

export function DemoDataNotice() {
  return (
    <div className="mb-6 border-2 border-red-500 bg-red-50 px-5 py-4 rounded-lg">
      <p className="text-sm font-bold uppercase tracking-[1.2px] text-red-800 mb-1">
        Demo data, not real measurement
      </p>
      <p className="text-lg text-red-900">
        Every figure on this page is fabricated. It exists so the reporting interface can be built
        before tracking is in place. No decision should be made from anything shown here.
      </p>
      <p className="text-base text-red-900 mt-2">
        Turn it off by removing <code className="font-mono font-semibold">LH_ADMIN_USE_FIXTURES</code>{' '}
        from <code className="font-mono font-semibold">.env.local</code>. It must never be set in a
        deployed environment.
      </p>
    </div>
  )
}

export function DataSourceNotice({ isFixtures, needs }) {
  return isFixtures ? <DemoDataNotice /> : <NoDataYetNotice needs={needs} />
}

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
