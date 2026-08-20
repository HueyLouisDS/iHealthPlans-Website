/**
 * Horizontal category filter across the top of the education index.
 * Plain links rather than buttons, so each filtered view has its own url and
 * can be crawled, shared, and reported on. The live site runs this through a
 * carousel library and a click handler, which hides 9 landing pages from search.
 */

import Link from 'next/link'

/**
 * Renders the filter row.
 * Scrolls horizontally on narrow screens instead of wrapping, which is what the
 * carousel was doing, just without the dependency.
 */
export default function CategoryFilter({ categories, activeSlug }) {
  return (
    <div className="w-full h-fit border-b">
      <div className="max-w-shell w-full mx-auto px-4 flex items-center justify-start gap-6 overflow-x-auto">
        <FilterLink href="/education" label="All" isActive={!activeSlug} />

        {categories.map((category) => (
          <FilterLink
            key={category.slug}
            href={`/education?category=${category.slug}`}
            label={category.name}
            isActive={category.slug === activeSlug}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One filter link. Active state is a green underline and a darker label,
 * matching the live site's selected tab.
 */
function FilterLink({ href, label, isActive }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex-shrink-0 whitespace-nowrap transition-all duration-300 text-[clamp(16px,1.85vw,20px)] font-semibold flex flex-col items-center px-2.5 py-5 relative border-b-2 ${
        isActive
          ? 'text-ihealthBlue border-b-ihealthGreen'
          : 'text-[#878F99] border-b-transparent hover:text-ihealthBlue'
      }`}
    >
      {label}
    </Link>
  )
}
