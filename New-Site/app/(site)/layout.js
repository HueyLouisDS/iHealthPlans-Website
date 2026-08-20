/**
 * Layout for the public marketing site.
 * Holds the header and footer that every public page shares. Admin pages sit
 * outside this group so they inherit none of it.
 *
 * The (site) folder is a route group, so it does not appear in any url. The
 * home page is still /, careers is still /careers, and so on.
 */

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

/**
 * Wraps every public page.
 * Header is fixed, so pages that begin with full bleed content render
 * HeaderSpacer themselves rather than getting it for free here.
 */
export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
