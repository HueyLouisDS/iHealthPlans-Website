/**
 * Page navigation under the article grid.
 * Server rendered links rather than client state, so every one of the 14 pages
 * has a real url. The live site paginates in the browser, which means search
 * engines only ever see the newest 13 of 170 articles.
 */

import Link from 'next/link'

// How many numbered links to show around the current page before collapsing
// the rest into an ellipsis. 14 pages would fit, but a category filter can
// change the count and this keeps the row a fixed width.
const WINDOW_SIZE = 2

/**
 * Builds the list of page numbers to render, with nulls marking gaps.
 * Always keeps the first and last page visible so a visitor can jump to either
 * end without stepping through.
 */
function buildPageList(currentPage, totalPages) {
  const pages = new Set([1, totalPages])

  for (let offset = -WINDOW_SIZE; offset <= WINDOW_SIZE; offset += 1) {
    const page = currentPage + offset
    if (page >= 1 && page <= totalPages) pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const withGaps = []

  sorted.forEach((page, index) => {
    // A jump of more than 1 means pages were skipped, mark it with a null
    if (index > 0 && page - sorted[index - 1] > 1) withGaps.push(null)
    withGaps.push(page)
  })

  return withGaps
}

/**
 * Renders the pagination row, or nothing at all when there is only 1 page.
 * `categorySlug` is carried through every link so paging never silently drops
 * the active filter.
 */
export default function Pagination({ page, totalPages, categorySlug }) {
  if (totalPages <= 1) return null

  const hrefFor = (target) => {
    const params = new URLSearchParams()
    if (categorySlug) params.set('category', categorySlug)
    if (target > 1) params.set('page', String(target))
    const query = params.toString()
    return query ? `/education?${query}` : '/education'
  }

  const pages = buildPageList(page, totalPages)

  return (
    <nav aria-label="Article pages" className="w-full h-fit px-4">
      <div className="max-w-[480px] w-full mx-auto flex items-center justify-center gap-2">
        <PageLink href={hrefFor(page - 1)} isDisabled={page === 1} label="Previous">
          &larr;
        </PageLink>

        {pages.map((target, index) =>
          target === null ? (
            <span key={`gap-${index}`} className="px-2 text-[#878F99]">
              &hellip;
            </span>
          ) : (
            <PageLink key={target} href={hrefFor(target)} isActive={target === page} label={`Page ${target}`}>
              {target}
            </PageLink>
          )
        )}

        <PageLink href={hrefFor(page + 1)} isDisabled={page === totalPages} label="Next">
          &rarr;
        </PageLink>
      </div>
    </nav>
  )
}

/**
 * One pagination control.
 * Disabled ends render as a span rather than a link, since a link that goes
 * nowhere is still focusable and still announced to a screen reader.
 */
function PageLink({ href, children, isActive = false, isDisabled = false, label }) {
  const base = 'w-10 h-10 rounded-md flex items-center justify-center text-sm font-semibold transition-colors'

  if (isDisabled) {
    return <span className={`${base} text-[#C4C9D0] cursor-default`}>{children}</span>
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`${base} ${
        isActive ? 'bg-ihealthBlue text-white' : 'text-[#525B67] hover:bg-ihealthBlue/10'
      }`}
    >
      {children}
    </Link>
  )
}
