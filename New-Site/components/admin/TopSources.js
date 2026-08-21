'use client'

/**
 * Top traffic sources on the dashboard, with a control that changes what the
 * bars measure.
 *
 * Ranked by leads produced rather than by traffic sent. A source that sends a
 * lot of traffic and no leads is not a top source, it is a cost.
 *
 * Client rather than server only because of the measure toggle. The bars are
 * plain divs sized as percentages, so there is nothing else to hydrate.
 */

import Link from 'next/link'
import { useState } from 'react'

/*
 * Counts only. A conversion rate belongs here in principle, but a source with
 * 3 leads and 1 enrollment ranks first at 33 percent and the card has no room
 * for the thin volume marking that makes such a number safe to read. The
 * attribution page does that properly, and the link at the top right goes
 * straight to it.
 */
const MEASURES = [
  { key: 'leads', label: 'Leads', noun: 'leads' },
  { key: 'conversions', label: 'Enrollments', noun: 'enrollments' },
]

/**
 * One measure button.
 *
 * A real button with aria-pressed, so it is keyboard reachable and announces
 * its state, matching the trend chart legend above it.
 */
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

/**
 * Renders the card.
 *
 * `measures` carries a separately ranked list per measure rather than one list
 * the client re-sorts. Taking the top 5 by leads and re-ordering those by
 * enrollments would hide a source that converts well on modest volume, which
 * is the source most worth finding.
 */
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
                  /*
                   * Scaled against the leader in the selected measure, so the
                   * top row always fills its bar and the rest read relative
                   * to it. Refitting is the point of switching.
                   */
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
