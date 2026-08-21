'use client'

/**
 * Collapsible, tabbed filter panel, shared by the admin list pages.
 *
 * Generalised out of the lead list once calls needed the same thing, and
 * attribution and agents will too. The page supplies the tabs, the chips, and
 * which url they point at, and this handles the collapse, the tab state, the
 * applied filter summary, and the large page confirmation.
 *
 * Everything except the collapse and the tab selection stays server driven.
 * Chips are real links and the search is a real GET form, so filtering works
 * without JavaScript, a filtered view is bookmarkable, and an export route can
 * reuse the same parameters and be sure the file matches the screen.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildHref } from '@/lib/admin/urls'

/*
 * Asking for this many rows or more gets a confirmation first. Large pages are
 * slow to render and hard to scan, and the person almost always wants an
 * export rather than a very long table.
 */
const LARGE_PAGE_THRESHOLD = 200

/**
 * One group of filter chips.
 */
function Chips({ options, activeValue, onHref, onIntercept, paramKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = (activeValue || null) === (option.value || null)
        const href = onHref(paramKey, option.value)

        return (
          <Link
            key={option.label}
            href={href}
            /*
             * Still a real link. The handler intercepts only when it has
             * something to ask, so this keeps working without JavaScript.
             */
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
 * not expecting it. Focus moves to cancel on open and escape closes it, so the
 * keyboard path out matches the mouse one.
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
      /*
       * Only a click that started on the backdrop cancels, so a drag out of
       * the panel does not dismiss it
       */
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

          {exportHref && (
            <a
              href={exportHref}
              onClick={onCancel}
              className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter]"
            >
              Export instead
            </a>
          )}

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
 * Opens by default only when a filter is applied, so an unfiltered list starts
 * clean and a filtered one shows why. Applied filters are summarised on the
 * header row while collapsed, because a hidden filter quietly narrowing the
 * results is how people stop trusting a report.
 */
export default function FilterPanel({
  basePath,
  paramKeys,
  params,
  tabs,
  applied = [],
  search,
  perPage,
  perPageOptions,
  perPageMin,
  perPageMax,
  exportHref,
  summaryLabel,
}) {
  const router = useRouter()
  const [pending, setPending] = useState(null)
  const [isOpen, setIsOpen] = useState(applied.length > 0)

  /*
   * Open on whichever tab is already doing something, so the reason the list
   * is narrowed is the first thing shown
   */
  const firstApplied = tabs.find((tab) => tab.isApplied)
  const [tab, setTab] = useState(firstApplied?.key || tabs[0]?.key)

  const href = (paramKey, value) =>
    buildHref(basePath, paramKeys, params, { [paramKey]: value, page: 1 })

  /**
   * Stops a chip or the size form from navigating straight to a very long
   * page, and asks first. Anything below the threshold passes through
   * untouched so the common case is never interrupted.
   */
  function guardLargePage(event, value, target) {
    const rows = Number.parseInt(value, 10)
    if (!Number.isFinite(rows) || rows < LARGE_PAGE_THRESHOLD) return
    event.preventDefault()
    setPending({ rows, href: target })
  }

  return (
    <div className="bg-white border rounded-lg mb-6">
      {search && (
        /* Search stays out of the collapse. It is the primary way anyone finds
           a specific record, and hiding it to save 60px is a bad trade. */
        <form action={basePath} method="get" className="px-5 pt-5 pb-4 flex flex-wrap gap-3">
          {paramKeys
            .filter((key) => key !== search.name && key !== 'page')
            .map((key) => (params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null))}
          <label htmlFor={search.name} className="sr-only">
            {search.placeholder}
          </label>
          <input
            id={search.name}
            name={search.name}
            type="search"
            defaultValue={params[search.name] || ''}
            placeholder={search.placeholder}
            className="flex-1 min-w-[220px] h-11 px-4 border rounded-md text-base focus:outline-none focus:border-ihealthBlue"
          />
          <button
            type="submit"
            className="h-11 px-5 rounded-md bg-ihealthBlue text-white font-semibold hover:brightness-110 transition-[filter]"
          >
            Search
          </button>
        </form>
      )}

      <div className={`px-5 pb-4 flex items-center gap-3 flex-wrap ${search ? 'border-t pt-4' : 'pt-5'}`}>
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

        {summaryLabel && <span className="text-sm text-[#6C7381]">{summaryLabel}</span>}

        {/* Applied filters stay visible while collapsed, each removable on its
            own rather than only as an all or nothing clear */}
        {applied.map((filter) => (
          <Link
            key={filter.key}
            href={buildHref(basePath, paramKeys, params, { [filter.key]: undefined, page: 1 })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ihealthBlue/10 text-ihealthBlue text-sm font-semibold hover:bg-ihealthBlue/20 transition-colors"
          >
            {filter.label}
            <span aria-hidden="true">&times;</span>
            <span className="sr-only">Remove this filter</span>
          </Link>
        ))}

        {applied.length > 0 && (
          <Link href={basePath} className="text-sm font-semibold text-[#105fa8] hover:underline ml-auto">
            Clear all
          </Link>
        )}
      </div>

      {isOpen && (
        <div className="border-t">
          <div className="flex overflow-x-auto" role="tablist" aria-label="Filter by">
            {tabs.map((entry) => {
              const isActive = tab === entry.key

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
                  {/* The dot marks a tab that is narrowing the results, so a
                      collapsed group cannot hide what it is doing */}
                  {entry.isApplied && <span className="w-1.5 h-1.5 rounded-full bg-ihealthGreen" aria-hidden="true" />}
                </button>
              )
            })}

            {perPageOptions && (
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'show'}
                onClick={() => setTab('show')}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  tab === 'show'
                    ? 'border-b-ihealthGreen text-ihealthBlue'
                    : 'border-b-transparent text-[#6C7381] hover:text-ihealthBlue'
                }`}
              >
                Show
              </button>
            )}
          </div>

          <div className="px-5 py-4" role="tabpanel">
            {tabs.map(
              (entry) =>
                tab === entry.key && (
                  <Chips
                    key={entry.key}
                    paramKey={entry.paramKey}
                    activeValue={entry.activeValue}
                    options={entry.options}
                    onHref={href}
                  />
                )
            )}

            {tab === 'show' && perPageOptions && (
              <div className="flex flex-col gap-3">
                <Chips
                  paramKey="perPage"
                  activeValue={String(perPage)}
                  options={perPageOptions.map((size) => ({ value: String(size), label: `${size} per page` }))}
                  onHref={href}
                  onIntercept={guardLargePage}
                />

                {/* A GET form, so a typed size works without JavaScript too */}
                <form
                  action={basePath}
                  method="get"
                  onSubmit={(event) => {
                    const value = new FormData(event.currentTarget).get('perPage')
                    guardLargePage(event, value, href('perPage', value))
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  {paramKeys
                    .filter((key) => key !== 'perPage' && key !== 'page')
                    .map((key) => (params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null))}
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
            const target = pending.href
            setPending(null)
            router.push(target)
          }}
        />
      )}
    </div>
  )
}
