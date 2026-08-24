'use client'

/**
 * Daily leads and calls on the dashboard, with a legend that filters.
 *
 * Client rather than server only because of the legend. The chart itself is
 * plain divs sized as percentages, so there is no charting library here and
 * nothing to hydrate beyond which series are showing.
 *
 * Gridlines and a labelled scale rather than a bare row of bars, so a reader
 * can tell roughly what a bar is worth without hovering it.
 */

import { useState } from 'react'

/*
 "Connected" rather than "Calls", because the series counts connected calls
 only, matching the funnel stage above it. It used to count every call, which
 put a peak of 45 on a chart sitting under a tile reading 528 connected out
 of 939. Two numbers for the same word on one screen is how a dashboard
 stops being believed.
*/
const SERIES = [
  { key: 'leads', label: 'Leads', colour: 'bg-ihealthBlue' },
  { key: 'calls', label: 'Connected', colour: 'bg-ihealthGreen' },
]

/*
 Colour per funnel stage, for when a tile has focused the chart on one of
 them. Leads and calls keep the colours they have in the default 2 series
 view, or selecting a tile would recolour a series the reader just learned.
*/
const STAGE_COLOURS = {
  sessions: 'bg-ihealthGreen',
  callClicks: 'bg-ihealthGreen',
  calls: 'bg-ihealthGreen',
  leads: 'bg-ihealthBlue',
  conversions: 'bg-ihealthBlue',
}

/**
 * One legend entry, which is also the control that shows and hides its series.
 *
 * A real button rather than a span with an onClick, so it is reachable by
 * keyboard and announces its state. aria-pressed is the right role here
 * because this is a toggle, not navigation.
 */
function LegendToggle({ series, isVisible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isVisible}
      className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm font-semibold transition-colors hover:bg-[#f7f7f7] focus:outline-none focus:ring-2 focus:ring-ihealthBlue/40 ${
        isVisible ? 'text-[#505258]' : 'text-[#A1A8B2]'
      }`}
    >
      {/* Hidden series keep their swatch as an outline rather than losing it.
          A legend entry with no colour at all stops saying which series it is. */}
      <span
        className={`w-3 h-3 rounded-sm ${isVisible ? series.colour : 'border-2 border-[#C4C9D2]'}`}
        aria-hidden="true"
      />
      {series.label}
    </button>
  )
}

/**
 * Renders the chart.
 *
 * `peak` comes from the server as the peak across both series. It is
 * recalculated here from whatever is showing, because that is the whole point
 * of hiding a series. Leads top out around 13 a day against calls at 45, so
 * leaving the axis alone would leave leads as a row of stubs and the filter
 * would show you nothing you could not already see.
 */
export default function TrendChart({ days, peak: fullPeak, stage = null }) {
  const [hidden, setHidden] = useState(() => new Set())

  /**
   * Shows or hides one series.
   *
   * Hiding the last visible series brings both back rather than emptying the
   * chart. An empty chart is never what someone meant by clicking, and it is
   * a state you would then have to work out how to leave.
   */
  function toggle(key) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else if (next.size === SERIES.length - 1) return new Set()
      else next.add(key)
      return next
    })
  }

  /*
   A selected funnel stage overrides the legend entirely. The 2 series view
   and a single focused stage are different questions, and offering both
   controls at once would let you hide the very series you just asked for.
  */
  const visible = stage
    ? [{ key: stage.key, label: stage.label, colour: STAGE_COLOURS[stage.key] || 'bg-ihealthGreen' }]
    : SERIES.filter((series) => !hidden.has(series.key))

  /*
   Rescaled to what is on screen. Never below 1, or a period with no activity
   divides by zero and every bar renders as NaN percent.
  */
  const peak = Math.max(
    1,
    ...days.flatMap((day) => visible.map((series) => day[series.key]))
  )

  /*
   A long period would render bars a pixel wide, so past a point only the
   gaps between them are dropped rather than the bars themselves
  */
  const gap = days.length > 45 ? 'gap-px' : 'gap-1'

  /*
   The axis labels sit in this gutter. Sessions run to 4 digits where leads
   run to 2, so a fixed gutter would let "1117" sit on top of the first bar.
  */
  const gutter = peak >= 1000 ? 'pl-12' : 'pl-8'

  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-lg font-bold text-ihealthBlue">
          {stage ? `Daily ${stage.noun}` : 'Daily trend'}
        </h2>

        {stage ? (
          <span className="flex items-center gap-2 text-sm font-semibold text-[#505258]">
            <span
              className={`w-3 h-3 rounded-sm ${STAGE_COLOURS[stage.key] || 'bg-ihealthGreen'}`}
              aria-hidden="true"
            />
            {stage.label}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            {SERIES.map((series) => (
              <LegendToggle
                key={series.key}
                series={series}
                isVisible={!hidden.has(series.key)}
                onToggle={() => toggle(series.key)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative h-[200px]">
        {/* Gridlines at the quarters, with the scale labelled */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <div
            key={fraction}
            className="absolute left-0 right-0 border-t border-dashed border-gray-200 flex items-start"
            style={{ top: `${fraction * 100}%` }}
          >
            <span className="text-xs text-[#878F99] tabular-nums -mt-2 bg-white pr-2">
              {Math.round(peak * (1 - fraction))}
            </span>
          </div>
        ))}

        <div className={`absolute inset-0 flex items-end ${gap} ${gutter}`}>
          {days.map((day) => (
            <div
              key={day.date.toISOString()}
              className="flex-1 flex items-end gap-px h-full"
              // Only what is showing, so the tooltip cannot contradict the chart
              title={`${day.date.toDateString()}: ${visible
                .map((series) => `${day[series.key]} ${series.label.toLowerCase()}`)
                .join(', ')}`}
            >
              {visible.map((series) => (
                <div
                  key={series.key}
                  className={`flex-1 ${series.colour} rounded-t transition-[height] duration-300`}
                  style={{ height: `${(day[series.key] / peak) * 100}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`flex justify-between items-baseline gap-4 text-xs text-[#878F99] mt-2 ${gutter}`}>
        <span>{days[0]?.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>

        {/* Says the axis moved. Without this a rescaled chart looks like the
            numbers changed rather than the scale. */}
        {peak !== fullPeak && (
          <span className="text-[#A1A8B2]">
            Scale fitted to {visible.map((series) => series.label.toLowerCase()).join(' and ')}
          </span>
        )}

        <span>{days[days.length - 1]?.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
      </div>
    </div>
  )
}
