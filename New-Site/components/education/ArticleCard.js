// Article card with a hero image, used in 2 sizes on the education index.
// The featured variant spans 2 grid columns at the top of page 1, the standard
// variant fills the 3 column grid below it.

import Image from 'next/image'
import Link from 'next/link'
import CategoryChip from '@/components/education/CategoryChip'

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-ihealthGreen" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

export default function ArticleCard({ article, isFeatured = false }) {
  return (
    <Link href={`/education/${article.slug}`} className="w-full flex flex-col items-start group">
      <Image
        src={article.image}
        alt={article.title}
        width={1456}
        height={970}
        sizes={isFeatured ? '(min-width: 1080px) 66vw, 100vw' : '(min-width: 1080px) 33vw, 100vw'}
        className="w-full h-[320px] rounded-md object-cover origin-center"
      />

      <div className="w-full flex flex-col items-start">
        <div className="w-full mt-8 mb-4 flex items-start justify-between gap-10">
          <CategoryChip name={article.category} />
          <div className="w-fit flex-shrink-0 mt-1 flex items-center gap-1.5">
            <CalendarIcon />
            <p className="text-sm text-[#505258]">{article.displayDate}</p>
          </div>
        </div>

        <h2
          className={`font-semibold text-ihealthBlue group-hover:underline ${
            isFeatured ? 'text-[clamp(20px,2.59vw,28px)]' : 'text-[clamp(18px,1.85vw,22px)]'
          }`}
        >
          {article.title}
        </h2>
      </div>
    </Link>
  )
}
