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

import { useState } from 'react'
import Link from 'next/link'

const TABS = [
  { key: 'period', label: 'Period' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'sort', label: 'Sort' },
]

/**
 * Builds a url that keeps the current filters and changes only what is passed.
 * Without this, choosing a status would silently drop the search and the
 * period, which is the usual way filter bars end up untrustworthy.
 */
function buildHref(params, overrides) {
  const next = new URLSearchParams()
  const merged = { ...params, ...overrides }

  for (const key of ['period', 'source', 'status', 'q', 'sort', 'page']) {
    const value = merged[key]
    if (value && !(key === 'page' && String(value) === '1')) next.set(key, String(value))
  }

  const query = next.toString()
  return query ? `/admin/leads?${query}` : '/admin/leads'
}

/**
 * One group of filter chips.
 */
function Chips({ options, activeValue, params, paramKey }) {
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
export default function LeadFilters({ params, days, periods, statuses, statusCounts, sources, sorts }) {
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
        {['period', 'source', 'status', 'sort'].map((key) =>
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
          </div>
        </div>
      )}
    </div>
  )
}
