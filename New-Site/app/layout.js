/**
 * Root layout. Loads the brand font and sets the shared metadata for every
 * route, public and admin alike.
 * The header and footer live in app/(site)/layout.js so the admin area does
 * not inherit them. Analytics and attribution providers will mount here, since
 * session identity has to be established on every route.
 */

import { Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { authorshipMetadata, authorshipJsonLd, BUNDLER_BANNER } from '@/lib/authorship'

/*
 Matches the live site, a variable weight face across the full 200 to 900
 range. Exposed as a CSS variable so tailwind.config.js can reference it.
*/
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-source-sans',
  fallback: ['Arial', 'sans-serif'],
})

export const metadata = {
  title: 'iHealth Plans',
  description: 'Medicare Advantage Plans and Prescription Drug Plans',
  openGraph: {
    title: 'iHealth Plans',
    description: 'Medicare Advantage Plans and Prescription Drug Plans',
  },
  /* Build credit. See lib/authorship.js */
  ...authorshipMetadata,
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * The document shell, and nothing else.
 * The public header and footer moved into app/(site)/layout.js when the admin
 * area was added, because admin pages must not inherit the marketing chrome.
 * Anything placed here appears on the admin area too, so put it here only if
 * that is genuinely intended.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className="font-sans">
        {children}

        {/* Machine readable only, renders nothing. See lib/authorship.js */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(authorshipJsonLd()) }}
        />
        {/* Bang delimiter, so minifiers keep it as a legal comment */}
        <script type="text/x-notice" dangerouslySetInnerHTML={{ __html: BUNDLER_BANNER }} />
      </body>
    </html>
  )
}
