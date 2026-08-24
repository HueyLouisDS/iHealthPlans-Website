// Text only article link, no image. Fills the narrow third column beside the
// featured card on the first row of the education index.
// Exists so the featured row has 4 articles in it rather than 1.

import Link from 'next/link'
import CategoryChip from '@/components/education/CategoryChip'

export default function CompactArticleLink({ article }) {
  return (
    <Link
      href={`/education/${article.slug}`}
      className="w-full flex flex-col items-start pb-6 mb-6 border-b last-of-type:border-0 last-of-type:pb-0 last-of-type:mb-0 first-of-type:border-t first-of-type:pt-6 ml:first-of-type:border-t-0 ml:first-of-type:pt-0 group"
    >
      <CategoryChip name={article.category} />
      <h2 className="text-[clamp(18px,1.85vw,20px)] font-semibold text-ihealthBlue mt-3 mb-2 group-hover:underline">
        {article.title}
      </h2>
      <p className="text-sm text-[#505258]">{article.displayDate}</p>
    </Link>
  )
}
