// Single source of truth for the values that repeat across every page.
// The phone number alone appears 355 times across the current site, so it is
// defined once here and imported. Compliance strings live here too, because
// they change on a CMS review cycle and must never be edited for layout.

// The canonical origin, used to build absolute urls for the sitemap and for
// canonical tags. Overridable so a preview deploy does not publish a sitemap
// pointing at production.
export const SITE_URL = (process.env.LH_SITE_URL || 'https://ihealthplans.com').replace(/\/$/, '')
export const PHONE_NUMBER = '1-888-243-8046'
/*
 711, not 771. The live site says 771 on 528 pages and it reaches nothing.
 711 is the FCC's national relay code, so a deaf or hard of hearing caller
 dials it, reaches a relay operator, and the operator dials this office on an
 ordinary voice line. Nothing has to be integrated on our side, which is why
 an agency publishes 711 rather than running a dedicated TTY line.

 Required next to every phone number. From the Spark website guidelines,
 under the requirements that apply to all sites: "Include TTY and days and
 hours of operation with a phone number."
*/
export const PHONE_TTY = 'TTY 711'
export const BUSINESS_HOURS = 'Monday-Friday, 9 AM-5:30 PM EST'
export const SMID = 'MULTIPLAN_IHP_WEB2025_C'
export const CARRIER_COUNT = 10
export const PRODUCT_COUNT = 38
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  {
    label: 'Plans',
    children: [
      { label: 'Medicare Advantage', href: '/medicare-advantage' },
      { label: 'Prescription Drug Plans', href: '/prescription-drug-plans' },
      { label: 'Dual Eligible (D-SNP)', href: '/dual-eligible-snp' },
    ],
  },
  {
    label: 'Enrollment Period',
    children: [
      { label: 'All Enrollment Periods', href: '/medicare-enrollment-periods', isOverview: true },
      { label: 'Open Enrollment', href: '/medicare-advantage-open-enrollment' },
      { label: 'Special Enrollment', href: '/special-enrollment-period' },
      { label: 'Annual Enrollment', href: '/annual-enrollment-period' },
    ],
  },
  { label: 'Education', href: '/education' },
  { label: 'Careers', href: '/careers' },
]
