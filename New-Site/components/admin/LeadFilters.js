'use client'

/**
 * Collapsible, tabbed filter panel for the lead list.
 *
 * The 4 filter groups used to stack as rows, which cost most of the screen
 * above the table before a single lead was visible. They are tabs now, and the
 * whole panel collapses.
 *
 * Only the tab selection and the open state are client side. Every chip is
 * still a real link to a real url, so filtering keeps working without
 * JavaScript, a filtered view stays bookmarkable, and the export route can
 * reuse the same parameters. Turning these into buttons with handlers would
 * have traded all of that for nothing.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Asking for this many rows or more gets a confirmation first. Large pages are
// slow to render and hard to scan, and the person almost always wants an
// export rather than a very long table.
const LARGE_PAGE_THRESHOLD = 200

const TABS = [
  { key: 'period', label: 'Period' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'sort', label: 'Sort' },
  { key: 'show', label: 'Show' },
]

/**
 * Builds a url that keeps the current filters and changes only what is passed.
 * Without this, choosing a status would silently drop the search and the
 * period, which is the usual way filter bars end up untrustworthy.
 */
function buildHref(params, overrides) {
  const next = new URLSearchParams()
  const merged = { ...params, ...overrides }

  for (const key of ['period', 'source', 'status', 'q', 'sort', 'perPage', 'page']) {
    const value = merged[key]
    if (value && !(key === 'page' && String(value) === '1')) next.set(key, String(value))
  }

  const query = next.toString()
  return query ? `/admin/leads?${query}` : '/admin/leads'
}

/**
 * One group of filter chips.
 */
function Chips({ options, activeValue, params, paramKey, onIntercept }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = (activeValue || null) === (option.value || null)
        // Changing any filter resets to page 1, otherwise a narrower result
        // set lands the reader on a page that no longer exists
        const href = buildHref(params, { [paramKey]: option.value, page: 1 })

        return (
          <Link
            key={option.label}
            href={href}
            // Still a real link. The handler only intercepts when it has
            // something to ask, so this keeps working without JavaScript.
            onClick={(event) => onIntercept?.(event, option.value, href)}
            aria-current={isActive ? 'page' : undefined}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              isActive ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258] hover:border-ihealthBlue'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={isActive ? 'text-white/70' : 'text-[#878F99]'}> {option.count}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Confirmation shown before loading a very large page.
 *
 * A real dialog rather than window.confirm, because a native confirm cannot be
 * styled, cannot offer a third option, and reads as a browser error to anyone
 * who is not expecting it.
 *
 * Focus moves to the cancel button on open and Escape closes it, so the
 * keyboard path out is the same as the mouse one.
 */
function LargePageDialog({ rows, onConfirm, onCancel, exportHref }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      // Clicking the backdrop cancels, but only the backdrop itself, not a
      // click that started inside the panel and drifted out
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="large-page-title"
        className="bg-white rounded-xl max-w-md w-full p-6 flex flex-col gap-4"
      >
        <h2 id="large-page-title" className="text-xl font-bold text-ihealthBlue">
          Show {rows.toLocaleString()} rows?
        </h2>

        <p className="text-base text-[#505258]">
          A page this long takes noticeably longer to load and is hard to scan. If you are after
          the whole set rather than reading it on screen, an export is usually the better tool.
        </p>

        <div className="flex flex-wrap gap-3 mt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-md border bg-white text-[#505258] font-semibold hover:border-ihealthBlue transition-colors"
          >
            Cancel
          </button>

          <a
            href={exportHref}
            onClick={onCancel}
            className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter]"
          >
            Export instead
          </a>

          <button
            type="button"
            onClick={onConfirm}
            className="h-11 px-5 rounded-md bg-ihealthBlue text-white font-semibold hover:brightness-110 transition-[filter] ml-auto"
          >
            Show {rows.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Chevron for the collapse toggle.
 */
function Chevron({ isOpen }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Renders the panel.
 *
 * Opens by default only when a filter is already applied, so an unfiltered
 * list starts clean and a filtered one shows why. The applied filters are also
 * summarised on the header row while collapsed, because a hidden filter that
 * is silently narrowing the results is how people end up mistrusting a report.
 */
export default function LeadFilters({
  params,
  days,
  perPage,
  periods,
  statuses,
  statusCounts,
  sources,
  sorts,
  perPageOptions,
  perPageMin,
  perPageMax,
  exportHref,
}) {
  const router = useRouter()
  // Set while a large page is waiting on confirmation
  const [pending, setPending] = useState(null)

  /**
   * Stops a chip or the custom form from navigating straight to a very long
   * page, and asks first. Anything below the threshold passes through
   * untouched so the common case is never interrupted.
   */
  function guardLargePage(event, value, href) {
    const rows = Number.parseInt(value, 10)
    if (!Number.isFinite(rows) || rows < LARGE_PAGE_THRESHOLD) return
    event.preventDefault()
    setPending({ rows, href })
  }
  const applied = [
    params.status && { key: 'status', label: `Status: ${params.status}` },
    params.source && { key: 'source', label: `Source: ${params.source}` },
    params.q && { key: 'q', label: `Search: ${params.q}` },
  ].filter(Boolean)

  const [isOpen, setIsOpen] = useState(applied.length > 0)
  // Open on whichever tab is already doing something, so the reason the list
  // is narrowed is the first thing shown
  const [tab, setTab] = useState(params.status ? 'status' : params.source ? 'source' : 'period')

  return (
    <div className="bg-white border rounded-lg mb-6">
      {/* Search stays out of the collapse. It is the primary way anyone finds
          a specific person, and hiding it behind a toggle to save 60px would
          be a bad trade. A GET form, so it works without JavaScript and the
          result is a real url. */}
      <form action="/admin/leads" method="get" className="px-5 pt-5 pb-4 flex flex-wrap gap-3">
        {['period', 'source', 'status', 'sort', 'perPage'].map((key) =>
          params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null
        )}
        <label htmlFor="q" className="sr-only">
          Search by name, phone, or zip
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={params.q || ''}
          placeholder="Search name, phone, or zip"
          className="flex-1 min-w-[220px] h-11 px-4 border rounded-md text-base focus:outline-none focus:border-ihealthBlue"
        />
        <button
          type="submit"
          className="h-11 px-5 rounded-md bg-ihealthBlue text-white font-semibold hover:brightness-110 transition-[filter]"
        >
          Search
        </button>
      </form>

      <div className="px-5 pb-4 flex items-center gap-3 flex-wrap border-t pt-4">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="h-11 px-4 rounded-md border font-semibold text-ihealthBlue inline-flex items-center gap-2 hover:border-ihealthBlue transition-colors"
        >
          Filters
          {applied.length > 0 && (
            <span className="bg-ihealthBlue text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
              {applied.length}
            </span>
          )}
          <Chevron isOpen={isOpen} />
        </button>

        <span className="text-sm text-[#6C7381]">Last {days} days</span>

        {/* Applied filters stay visible while collapsed, each removable on its
            own rather than only as an all or nothing clear */}
        {applied.map((filter) => (
          <Link
            key={filter.key}
            href={buildHref(params, { [filter.key]: undefined, page: 1 })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ihealthBlue/10 text-ihealthBlue text-sm font-semibold hover:bg-ihealthBlue/20 transition-colors"
          >
            {filter.label}
            <span aria-hidden="true">&times;</span>
            <span className="sr-only">Remove this filter</span>
          </Link>
        ))}

        {applied.length > 0 && (
          <Link href="/admin/leads" className="text-sm font-semibold text-[#105fa8] hover:underline ml-auto">
            Clear all
          </Link>
        )}
      </div>

      {isOpen && (
        <div className="border-t">
          <div className="flex overflow-x-auto" role="tablist" aria-label="Filter by">
            {TABS.map((entry) => {
              const isActive = tab === entry.key
              // The dot marks a tab that is currently narrowing the results,
              // so a collapsed group cannot hide what it is doing
              const isApplied =
                (entry.key === 'status' && params.status) || (entry.key === 'source' && params.source)

              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(entry.key)}
                  className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-2 ${
                    isActive
                      ? 'border-b-ihealthGreen text-ihealthBlue'
                      : 'border-b-transparent text-[#6C7381] hover:text-ihealthBlue'
                  }`}
                >
                  {entry.label}
                  {isApplied && <span className="w-1.5 h-1.5 rounded-full bg-ihealthGreen" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <div className="px-5 py-4" role="tabpanel">
            {tab === 'period' && (
              <Chips
                params={params}
                paramKey="period"
                activeValue={String(days)}
                options={periods.map((period) => ({ value: period.value, label: period.label }))}
              />
            )}

            {tab === 'status' && (
              <Chips
                params={params}
                paramKey="status"
                activeValue={params.status}
                options={[
                  { value: undefined, label: 'All' },
                  ...statuses.map((status) => ({
                    value: status.value,
                    label: status.label,
                    count: statusCounts[status.value] || 0,
                  })),
                ]}
              />
            )}

            {tab === 'source' && (
              <Chips
                params={params}
                paramKey="source"
                activeValue={params.source}
                options={[{ value: undefined, label: 'All' }, ...sources.map((s) => ({ value: s, label: s }))]}
              />
            )}

            {tab === 'sort' && (
              <Chips params={params} paramKey="sort" activeValue={params.sort || 'newest'} options={sorts} />
            )}

            {tab === 'show' && (
              <div className="flex flex-col gap-3">
                <Chips
                  params={params}
                  paramKey="perPage"
                  activeValue={String(perPage)}
                  options={perPageOptions.map((size) => ({ value: String(size), label: `${size} per page` }))}
                  onIntercept={guardLargePage}
                />

                {/* A GET form, so a typed size works without JavaScript too.
                    The handler only intercepts to confirm a large page. */}
                <form
                  action="/admin/leads"
                  method="get"
                  onSubmit={(event) => {
                    const value = new FormData(event.currentTarget).get('perPage')
                    guardLargePage(event, value, buildHref(params, { perPage: value, page: 1 }))
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  {['period', 'source', 'status', 'sort', 'q'].map((key) =>
                    params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null
                  )}
                  <label htmlFor="perPage" className="text-sm font-semibold text-[#6C7381]">
                    Or type a number
                  </label>
                  <input
                    id="perPage"
                    name="perPage"
                    type="number"
                    min={perPageMin}
                    max={perPageMax}
                    step="1"
                    defaultValue={perPage}
                    className="w-24 h-10 px-3 border rounded-md text-base focus:outline-none focus:border-ihealthBlue"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-md border bg-white text-ihealthBlue font-semibold hover:border-ihealthBlue transition-colors"
                  >
                    Apply
                  </button>
                  <span className="text-sm text-[#6C7381]">
                    {perPageMin} to {perPageMax}, anything outside that is clamped
                  </span>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {pending && (
        <LargePageDialog
          rows={pending.rows}
          exportHref={exportHref}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const href = pending.href
            setPending(null)
            router.push(href)
          }}
        />
      )}
    </div>
  )
}
