/**
 * Root layout. Loads the brand font, sets the shared metadata, and wraps every
 * route in the header and footer.
 * The analytics and attribution providers will mount here once they exist,
 * which is why the body has a single obvious insertion point.
 */

import { Source_Sans_3 } from 'next/font/google'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import './globals.css'

// Matches the live site, a variable weight face across the full 200 to 900
// range. Exposed as a CSS variable so tailwind.config.js can reference it.
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-source-sans',
  fallback: ['Arial', 'sans-serif'],
})

export const metadata = {
  title: 'iHealth Plans',
  description: 'Medicare Advantage Plans, Medicare Supplement Plans, and Prescription Drug Plans',
  openGraph: {
    title: 'iHealth Plans',
    description: 'Medicare Advantage Plans, Medicare Supplement Plans, and Prescription Drug Plans',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Wraps every page.
 * Header is fixed, so pages that start with full bleed content are responsible
 * for rendering HeaderSpacer themselves rather than getting it for free here.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className="font-sans">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
