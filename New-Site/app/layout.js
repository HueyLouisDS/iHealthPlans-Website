// Root layout. Loads the brand font and sets the shared metadata for every
// route, public and admin alike.
// The header and footer live in app/(site)/layout.js so the admin area does
// not inherit them. Analytics and attribution providers will mount here, since
// session identity has to be established on every route.

import { Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { authorshipMetadata, authorshipJsonLd, BUNDLER_BANNER } from '@/lib/authorship'

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
  // Build credit. See lib/authorship.js
  ...authorshipMetadata,
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

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
