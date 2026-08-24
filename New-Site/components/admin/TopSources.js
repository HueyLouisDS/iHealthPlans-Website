'use client'
import Link from 'next/link'
import { useState } from 'react'

const MEASURES = [
  { key: 'leads', label: 'Leads', noun: 'leads' },
  { key: 'conversions', label: 'Enrollments', noun: 'enrollments' },
]

function MeasureToggle({ measure, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`px-2.5 py-1 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ihealthBlue/40 ${
        isActive ? 'bg-ihealthBlue text-white' : 'text-[#6C7381] hover:bg-[#f7f7f7]'
      }`}
    >
      {measure.label}
    </button>
  )
}

export default function TopSources({ measures }) {
  const [active, setActive] = useState(MEASURES[0])

  const rows = measures[active.key] || []

  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-lg font-bold text-ihealthBlue">Top sources</h2>
        <Link href="/admin/attribution/source" className="text-sm font-semibold text-[#105fa8] hover:underline">
          All attribution
        </Link>
      </div>

      <div className="flex items-center gap-1 mb-5 -ml-1">
        <span className="text-xs font-bold uppercase tracking-[1.2px] text-[#878F99] mr-2">Rank by</span>
        {MEASURES.map((measure) => (
          <MeasureToggle
            key={measure.key}
            measure={measure}
            isActive={measure.key === active.key}
            onSelect={() => setActive(measure)}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-base text-[#6C7381]">No {active.noun} in this period.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.source} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold text-ihealthBlue truncate">{row.source}</span>
                {/* The ranked measure first, then the other 2 numbers, so the
                    row still says what it cost to get there */}
                <span className="text-sm text-[#505258] tabular-nums flex-shrink-0">
                  {active.key === 'leads'
                    ? `${row.leads} leads, ${row.conversionRate}`
                    : `${row.conversions} of ${row.leads}, ${row.conversionRate}`}
                </span>
              </div>

              <div className="w-full h-2 bg-[#eef0f4] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    active.key === 'leads' ? 'bg-ihealthGreen' : 'bg-ihealthBlue'
                  }`}
                  style={{ width: `${row.share * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
