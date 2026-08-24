// Page navigation under the article grid.
// Server rendered links rather than client state, so every one of the 14 pages
// has a real url. The live site paginates in the browser, which means search
// engines only ever see the newest 13 of 170 articles.

import Link from 'next/link'

const WINDOW_SIZE = 2

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
