'use client'
import { useState } from 'react'

const SERIES = [
  { key: 'leads', label: 'Leads', colour: 'bg-ihealthBlue' },
  { key: 'calls', label: 'Connected', colour: 'bg-ihealthGreen' },
]

// Green above the sale, blue at and below it, so the eye reads the split
const STAGE_COLOURS = {
  sessions: 'bg-ihealthGreen',
  callClicks: 'bg-ihealthGreen',
  calls: 'bg-ihealthGreen',
  leads: 'bg-ihealthBlue',
  submitted: 'bg-ihealthBlue',
  effectuated: 'bg-ihealthBlue',
  retained: 'bg-ihealthBlue',
}

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

export default function TrendChart({ days, peak: fullPeak, stage = null }) {
  const [hidden, setHidden] = useState(() => new Set())

  function toggle(key) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else if (next.size === SERIES.length - 1) return new Set()
      else next.add(key)
      return next
    })
  }

  const visible = stage
    ? [{ key: stage.key, label: stage.label, colour: STAGE_COLOURS[stage.key] || 'bg-ihealthGreen' }]
    : SERIES.filter((series) => !hidden.has(series.key))
  const peak = Math.max(
    1,
    ...days.flatMap((day) => visible.map((series) => day[series.key]))
  )
  const gap = days.length > 45 ? 'gap-px' : 'gap-1'
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
