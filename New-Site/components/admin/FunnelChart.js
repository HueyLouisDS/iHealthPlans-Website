/**
 * The funnel as an actual funnel, with each stage sized by volume.
 *
 * This exists because 5 equal tiles do not communicate a funnel. Reading
 * "1,180 call clicks" next to "503 calls connected" tells you almost nothing,
 * whereas seeing the second bar at 43% of the first, with the drop labelled,
 * tells you immediately that more than half the people who tapped to call
 * never got through. That is the number this whole engagement is about.
 *
 * Rendered as divs rather than with a charting library. Five bars and some
 * labels do not justify a dependency, and this cannot fail to hydrate.
 */

/**
 * One stage. Width is its share of the top of the funnel, so the taper is
 * proportional to real volume rather than decorative.
 */
function Stage({ stage, isLast, isSelected, isDimmed }) {
  // Below about 2% a proportional bar is a sliver nobody can see or click, so
  // there is a floor. It distorts the taper at the bottom, which is why the
  // percentage is always printed as well and never inferred from the width.
  const width = Math.max(stage.shareOfTop * 100, 2)

  return (
    <div
      className={`w-full transition-opacity ${isDimmed ? 'opacity-40' : ''} ${
        isSelected ? 'ring-2 ring-ihealthGreen rounded-md -m-2 p-2' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <p className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381]">{stage.label}</p>
        <div className="flex items-baseline gap-3">
          {stage.rateFromPrevious && (
            <span className="text-sm font-semibold text-ihealthBlue">{stage.rateFromPrevious}</span>
          )}
          <span className="text-lg font-bold text-ihealthBlue tabular-nums">
            {stage.count.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="w-full h-10 bg-[#eef0f4] rounded-md overflow-hidden">
        <div
          className="h-full bg-[linear-gradient(90deg,var(--ihealth-blue),var(--ihealth-green))] rounded-md transition-[width] duration-500"
          style={{ width: `${width}%` }}
        />
      </div>

      {/* The loss between this stage and the next, which is the part people
          act on. A funnel that only shows what survived hides the problem. */}
      {!isLast && stage.dropToNext > 0 && (
        <p className="text-sm text-[#6C7381] mt-1.5 mb-1">
          {stage.dropToNext.toLocaleString()} lost here
        </p>
      )}
    </div>
  )
}

/**
 * Renders the funnel.
 * Takes the stages straight from getFunnelSummary, and computes each stage's
 * loss to the next one so the drop offs read down the page.
 */
export default function FunnelChart({ stages, selectedKey = null }) {
  const withDrops = stages.map((stage, index) => ({
    ...stage,
    dropToNext: index < stages.length - 1 ? stage.count - stages[index + 1].count : 0,
  }))

  return (
    <div className="bg-white border rounded-lg p-6 flex flex-col gap-5">
      {withDrops.map((stage, index) => (
        <Stage
          key={stage.key}
          stage={stage}
          isLast={index === withDrops.length - 1}
          isSelected={stage.key === selectedKey}
          // The others fade rather than disappear. A funnel with a stage
          // removed is not a funnel, and the whole point of the shape is what
          // the selected stage sits between.
          isDimmed={Boolean(selectedKey) && stage.key !== selectedKey}
        />
      ))}
    </div>
  )
}
