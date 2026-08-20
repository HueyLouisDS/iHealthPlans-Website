/**
 * Single source of truth for the values that repeat across every page.
 * The phone number alone appears 355 times across the current site, so it is
 * defined once here and imported. Compliance strings live here too, because
 * they change on a CMS review cycle and must never be edited for layout.
 */

// The one number the whole site dials today. Every rendering of it goes
// through components/tracking/CallLink so a click can be attributed later.
export const PHONE_NUMBER = '1-888-243-8046'
export const PHONE_TTY = 'TTY 771'
export const BUSINESS_HOURS = 'Monday-Friday, 9 AM-5:30 PM EST'

// CMS marketing Material ID, issued through MultiPlan. This is a compliance
// value, not a tracking id. It identifies the approved marketing material a
// visitor saw, and it must appear on every page carrying that material.
export const SMID = 'MULTIPLAN_IHP_WEB2025_C'

// Plan counts quoted in the Federal Contracting Statement. CMS requires these
// to be accurate, so they are pulled out where a reviewer can find them.
export const CARRIER_COUNT = 10
export const PRODUCT_COUNT = 38

// A nav entry with `children` renders as a dropdown on desktop and as a nested
// group in the mobile menu. Plans has no page of its own yet, so it is a menu
// only. TODO give it a /plans overview page if one is ever wanted, at which
// point add an href here and the dropdown label becomes a link.
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  {
    label: 'Plans',
    // No Medicare Supplement or Medigap entry, the agency cannot place them
    // and a nav entry is a claim that they can. D-SNP stays, it is a type of
    // Medicare Advantage plan.
    children: [
      { label: 'Medicare Advantage', href: '/medicare-advantage' },
      { label: 'Prescription Drug Plans', href: '/prescription-drug-plans' },
      { label: 'Dual Eligible (D-SNP)', href: '/dual-eligible-snp' },
    ],
  },
  {
    label: 'Enrollment Period',
    children: [
      // isOverview renders this as the group's parent, emphasised and with a
      // rule under it, and indents the entries below. It gives the hierarchy
      // of a nested submenu without a second flyout level, which is fiddly
      // with a mouse and unusable on touch.
      { label: 'All Enrollment Periods', href: '/medicare-enrollment-periods', isOverview: true },
      // "Open Enrollment" here means the Medicare Advantage Open Enrollment
      // Period, 1 January to 31 March. Worth knowing that Medicare.gov also
      // uses "Open Enrollment" for the 15 Oct to 7 Dec window, which is the
      // Annual Enrollment Period below. The url is explicit so the 2 pages do
      // not compete for the same search.
      { label: 'Open Enrollment', href: '/medicare-advantage-open-enrollment' },
      { label: 'Special Enrollment', href: '/special-enrollment-period' },
      { label: 'Annual Enrollment', href: '/annual-enrollment-period' },
    ],
  },
  { label: 'Education', href: '/education' },
  { label: 'Careers', href: '/careers' },
]
