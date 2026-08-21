/**
 * Demo data for the admin area, so the reporting UI can be built and reviewed
 * before the database and tracking exist.
 */

/*=============================================
    THIS IS FABRICATED DATA. It is not measurement and no decision should ever
    be made from it.

    It is only ever returned when ADMIN_USE_FIXTURES is explicitly set to true,
    which lives in .env.local and must never be set in a deployed environment.
    Any page rendering it shows a banner saying so. See lib/admin/data.js for
    the switch.

    Two rules held throughout:
    1. Every generated person is obviously fictional. Names are invented, phone
       numbers use the 555-01xx range reserved for fiction, and emails are
       @example.com. Nothing here should ever be mistaken for a real lead, and
       nothing here resembles a real person's details.
    2. Everything is seeded and deterministic. Math.random would produce
       different numbers on every server render, so the same page would
       contradict itself on refresh and nobody could review a layout.
=============================================*/

/**
 * Small seeded generator, mulberry32.
 * Deterministic output for a given seed, which is the whole point. Do not
 * replace with Math.random.
 */
function makeRng(seed) {
  let a = seed >>> 0
  return function next() {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Picks an item from a weighted list, so the demo data has a realistic shape
 * rather than an even split across every source.
 */
function weightedPick(rng, entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = rng() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return entries[entries.length - 1]
}

/**
 * A date a whole number of days ago, floored to the day.
 * Day granularity keeps output stable within a day so a page does not shuffle
 * between refreshes while somebody is reviewing it.
 */
function daysAgo(days, hour = 12, minute = 0) {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, minute)
  return date
}

const SOURCES = [
  { source: 'google', medium: 'cpc', label: 'google / cpc', weight: 34 },
  { source: 'google', medium: 'organic', label: 'google / organic', weight: 26 },
  { source: 'bing', medium: 'cpc', label: 'bing / cpc', weight: 11 },
  { source: 'facebook', medium: 'paid_social', label: 'facebook / paid', weight: 13 },
  { source: '(direct)', medium: '(none)', label: '(direct)', weight: 10 },
  { source: 'medicare.gov', medium: 'referral', label: 'medicare.gov / referral', weight: 6 },
]

const CAMPAIGNS = [
  { name: 'aep-brand', weight: 24 },
  { name: 'aep-generic-ma', weight: 30 },
  { name: 'dsnp-always-on', weight: 14 },
  { name: 'part-d-generic', weight: 12 },
  { name: 'competitor-conquest', weight: 8 },
  { name: '(not set)', weight: 12 },
]

const LANDING_PAGES = [
  { path: '/', weight: 22 },
  { path: '/medicare-advantage', weight: 26 },
  { path: '/dual-eligible-snp', weight: 12 },
  { path: '/prescription-drug-plans', weight: 10 },
  { path: '/annual-enrollment-period', weight: 16 },
  { path: '/special-enrollment-period', weight: 8 },
  { path: '/education', weight: 6 },
]

const CALL_LOCATIONS = ['heroCallNow', 'headerPhoneBlock', 'announcementBar', 'productHero:medicare-advantage', 'enrollmentHero:aep']

/*
 * Invented names. Any resemblance to a real person is unintended, which is
 * exactly why they are paired with reserved 555-01xx numbers.
 */
const FIRST_NAMES = ['Marguerite', 'Cornelius', 'Delphine', 'Rowan', 'Estelle', 'Barnaby', 'Winifred', 'Alden', 'Clementine', 'Horace', 'Beatrix', 'Sylvester', 'Odette', 'Rupert', 'Guinevere', 'Thaddeus']
const LAST_NAMES = ['Ashcombe', 'Berrycloth', 'Dunwoody', 'Fairweather', 'Grimsditch', 'Hollingsworth', 'Kettleborough', 'Larkspur', 'Mossbank', 'Pemberton', 'Quillfeather', 'Rookwood', 'Stanhope', 'Thistlewood', 'Vandermeer', 'Wexley']

const AGENTS = [
  { id: 'ag-01', name: 'A. Rivera' },
  { id: 'ag-02', name: 'D. Okonkwo' },
  { id: 'ag-03', name: 'M. Lindqvist' },
  { id: 'ag-04', name: 'J. Castellanos' },
  { id: 'ag-05', name: 'S. Nakamura' },
  { id: 'ag-06', name: 'P. Achterberg' },
  { id: 'ag-07', name: 'R. Delacroix' },
  { id: 'ag-08', name: 'T. Oyelaran' },
]

const STATUSES = [
  { value: 'new', weight: 18 },
  { value: 'contacted', weight: 30 },
  { value: 'qualified', weight: 22 },
  { value: 'enrolled', weight: 16 },
  { value: 'lost', weight: 14 },
]

const DISPOSITIONS = [
  { value: 'connected', weight: 58 },
  { value: 'voicemail', weight: 18 },
  { value: 'no answer', weight: 16 },
  { value: 'abandoned', weight: 8 },
]

/**
 * Formats seconds as m:ss, which is how a call log is normally read.
 */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Formats a date for the admin tables. Short, sortable at a glance, no year
 * clutter for recent records.
 */
export function formatDateTime(date) {
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Builds the full demo dataset in one pass.
 * Leads, calls, and sessions are generated together so they reference each
 * other consistently. Generating them separately would produce a call log that
 * does not match the leads, which is exactly the bug this data exists to help
 * find in the real implementation.
 */
function buildDataset() {
  const rng = makeRng(20260820)

  const DAYS = 90
  const leads = []
  const calls = []

  /*
   * Roughly one lead per 90 sessions, which is a plausible shape for this kind
   * of business and keeps the funnel percentages believable
   */
  const leadCount = 800

  for (let i = 0; i < leadCount; i += 1) {
    const source = weightedPick(rng, SOURCES)
    const campaign = weightedPick(rng, CAMPAIGNS)
    const landing = weightedPick(rng, LANDING_PAGES)
    const status = weightedPick(rng, STATUSES)
    const agent = AGENTS[Math.floor(rng() * AGENTS.length)]

    const day = Math.floor(rng() * DAYS)
    const hour = 8 + Math.floor(rng() * 11)
    const minute = Math.floor(rng() * 60)
    const createdAt = daysAgo(day, hour, minute)

    const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]

    const id = `ld_${String(1000 + i)}`
    // 555-01xx is reserved for fiction, so these cannot dial a real person
    const phone = `(555) 01${String(10 + (i % 90)).padStart(2, '0')}`
    const visitorId = `vis_${(rng() * 1e9).toString(36).slice(0, 10)}`
    const sessionId = `ses_${(rng() * 1e9).toString(36).slice(0, 10)}`

    /*
     * Most leads made a call, some arrived by form only. That split is the
     * thing the attribution work has to be able to tell apart.
     */
    const callCount = rng() < 0.72 ? 1 + Math.floor(rng() * 2) : 0

    for (let c = 0; c < callCount; c += 1) {
      const disposition = weightedPick(rng, DISPOSITIONS)
      const connected = disposition.value === 'connected'
      calls.push({
        id: `cl_${calls.length + 2000}`,
        leadId: id,
        leadName: `${firstName} ${lastName}`,
        startedAt: new Date(createdAt.getTime() + c * 36e5),
        fromNumber: phone,
        agentId: agent.id,
        agent: agent.name,
        durationSeconds: connected ? 120 + Math.floor(rng() * 900) : Math.floor(rng() * 40),
        disposition: disposition.value,
        /*
         * A quarter of calls fail to match back to a session. That is
         * realistic, and the unmatched rate is the metric that tells you
         * whether the click to call binding is actually working.
         */
        matched: rng() > 0.24,
        hasRecording: connected,
        sessionId,
        visitorId,
      })
    }

    leads.push({
      id,
      name: `${firstName} ${lastName}`,
      phone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      zip: String(10000 + Math.floor(rng() * 89999)),
      source: source.label,
      sourceRaw: source,
      campaign: campaign.name,
      landingPage: landing.path,
      status: status.value,
      createdAt,
      agentId: agent.id,
      agent: agent.name,
      visitorId,
      sessionId,
      device: rng() < 0.61 ? 'mobile' : 'desktop',
      /*
       * A quarter identify as someone acting for a parent. That is the split
       * worth measuring for real, since the 2 groups convert differently.
       */
      onBehalfOf: rng() < 0.26 ? 'A parent or family member' : 'Myself',
      callCount,
    })
  }

  /*
   * Calls that never became a lead. Most people who dial do not convert, so
   * the call log has to be far bigger than the lead list or the funnel reports
   * a conversion rate above 100% between calls and leads, which is nonsense.
   * These also carry no leadId, which is what makes the call log's "unmatched"
   * and "no lead" cases realistic to build against.
   */
  const UNCONVERTED_CALLS = 1_920

  for (let i = 0; i < UNCONVERTED_CALLS; i += 1) {
    const disposition = weightedPick(rng, DISPOSITIONS)
    const connected = disposition.value === 'connected'
    const agent = AGENTS[Math.floor(rng() * AGENTS.length)]
    const day = Math.floor(rng() * DAYS)
    const matched = rng() > 0.24

    calls.push({
      id: `cl_${calls.length + 2000}`,
      leadId: null,
      leadName: null,
      startedAt: daysAgo(day, 8 + Math.floor(rng() * 11), Math.floor(rng() * 60)),
      fromNumber: `(555) 01${String(10 + (i % 90)).padStart(2, '0')}`,
      agentId: agent.id,
      agent: agent.name,
      durationSeconds: connected ? 60 + Math.floor(rng() * 420) : Math.floor(rng() * 40),
      disposition: disposition.value,
      matched,
      hasRecording: connected,
      sessionId: matched ? `ses_${(rng() * 1e9).toString(36).slice(0, 10)}` : null,
      visitorId: matched ? `vis_${(rng() * 1e9).toString(36).slice(0, 10)}` : null,
    })
  }

  /*
   * Sessions and call clicks are volume, not individual records, so they are
   * generated as a daily series. Two scalars could not be filtered by date,
   * which is what broke as soon as the dashboard grew a period selector.
   */
  const daily = []
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const date = daysAgo(day)
    /*
     * Weekends are quieter, which is realistic and makes the trend chart
     * look like data rather than noise
     */
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const base = isWeekend ? 460 : 900
    const sessions = Math.round(base * (0.75 + rng() * 0.5))
    daily.push({
      date,
      sessions,
      // Around 4.8% of sessions click to call, wobbling a little day to day
      callClicks: Math.round(sessions * (0.040 + rng() * 0.017)),
    })
  }

  leads.sort((a, b) => b.createdAt - a.createdAt)
  calls.sort((a, b) => b.startedAt - a.startedAt)

  const conversions = leads.filter((lead) => lead.status === 'enrolled').length

  return { leads, calls, daily, conversions, days: DAYS }
}

/*
 * Built once per process. Regenerating per request would be wasteful and, more
 * importantly, would let the numbers drift between two pages of the same view.
 */
let cached = null

/**
 * The demo dataset. Built on first use and reused thereafter.
 */
export function getDataset() {
  if (!cached) cached = buildDataset()
  return cached
}

export { AGENTS, SOURCES, CAMPAIGNS, LANDING_PAGES, CALL_LOCATIONS, daysAgo }
