// Demo data for the admin area, so the reporting UI can be built and reviewed
// before the database and tracking exist.

/*=============================================
    THIS IS FABRICATED DATA, NOT MEASUREMENT
=============================================*/
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

function weightedPick(rng, entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = rng() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }

  return entries[entries.length - 1]
}

function daysAgo(days, hour = 12, minute = 0) {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, minute)
  return date
}

/*
 dailySpend is what the channel costs per day. Organic is not free, SEO
 carries a content retainer, so it has a figure too. Direct and referral are
 the only genuinely unpaid rows.
*/
const SOURCES = [
  { source: 'google', medium: 'cpc', label: 'google / cpc', weight: 34, dailySpend: 68 },
  { source: 'google', medium: 'organic', label: 'google / organic', weight: 26, dailySpend: 30 },
  { source: 'bing', medium: 'cpc', label: 'bing / cpc', weight: 11, dailySpend: 14 },
  { source: 'facebook', medium: 'paid_social', label: 'facebook / paid', weight: 13, dailySpend: 38 },
  { source: '(direct)', medium: '(none)', label: '(direct)', weight: 10, dailySpend: 0 },
  { source: 'medicare.gov', medium: 'referral', label: 'medicare.gov / referral', weight: 6, dailySpend: 0 },
]

/*
 spendWeight is deliberately not the same shape as weight. If spend tracked
 lead volume exactly then every campaign would show an identical cost per
 lead and the table would say nothing. Brand converts cheaply, conquest does
 not, and that spread is the reason anyone opens this page.
*/
const CAMPAIGNS = [
  { name: 'aep-brand', weight: 24, spendWeight: 14 },
  { name: 'aep-generic-ma', weight: 30, spendWeight: 38 },
  { name: 'dsnp-always-on', weight: 14, spendWeight: 12 },
  { name: 'part-d-generic', weight: 12, spendWeight: 18 },
  { name: 'competitor-conquest', weight: 8, spendWeight: 18 },
  { name: '(not set)', weight: 12, spendWeight: 0 },
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

/*
 Post sale rates, taken from the sister agency's operating model. Replace with
 measured values once there is enough history to measure them.
*/
const EFFECTUATION_RATE = 0.9           // submitted enrollments that start coverage
const RETENTION_RATE = 0.9              // effectuated members still on at 90 days
export const RETENTION_DAYS = 90        // the window retention is judged over
const DAY_MS = 86_400_000

// Coverage starts on the 1st of a later month, never on the signing date
function firstOfMonthAfter(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

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



function buildDataset() {
  const rng = makeRng(20260820)

  const DAYS = 90
  const leads = []
  const calls = []
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
    const phone = `(555) 01${String(10 + (i % 90)).padStart(2, '0')}`   // reserved fiction range
    const visitorId = `vis_${(rng() * 1e9).toString(36).slice(0, 10)}`
    const sessionId = `ses_${(rng() * 1e9).toString(36).slice(0, 10)}`
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
        matched: rng() > 0.24,
        hasRecording: connected,
        sessionId,
        visitorId,
      })
    }

    /*
     What happens to an enrollment after it is submitted, on the sister
     agency's observed rates, 90% effectuate and 90% of those survive 90 days.

     Both are dated rather than boolean because both lag. Coverage starts on
     the 1st of a later month, and retention cannot be known until 90 days
     after that, so a recent enrollment is unresolved rather than failed.
    */
    const isSubmitted = status.value === 'enrolled'
    const effectiveDate = isSubmitted ? firstOfMonthAfter(createdAt) : null
    const didEffectuate = isSubmitted && rng() < EFFECTUATION_RATE

    leads.push({
      id,
      effectiveDate: didEffectuate ? effectiveDate : null,
      // Set only when it actually lapsed, inside the 90 day window
      disenrolledAt:
        didEffectuate && rng() > RETENTION_RATE
          ? new Date(effectiveDate.getTime() + Math.floor(rng() * RETENTION_DAYS) * DAY_MS)
          : null,
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
      onBehalfOf: rng() < 0.26 ? 'A parent or family member' : 'Myself',
      callCount,
    })
  }

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

  const daily = []
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const date = daysAgo(day)
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

  /*
   One spend row per paid source per day. Held by day rather than as a single
   monthly figure so a 7 day view and a 30 day view do not have to divide a
   total and pretend the result means something.
  */
  const spend = []
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const date = daysAgo(day)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    for (const source of SOURCES) {
      if (source.dailySpend === 0) continue

      // Weekends pace down, the way most ad accounts actually run
      const pacing = isWeekend ? 0.62 : 1
      const wobble = 0.85 + rng() * 0.3
      spend.push({
        date,
        source: source.label,
        amount: Math.round(source.dailySpend * pacing * wobble * 100) / 100,
      })
    }
  }

  leads.sort((a, b) => b.createdAt - a.createdAt)
  calls.sort((a, b) => b.startedAt - a.startedAt)

  const conversions = leads.filter((lead) => lead.status === 'enrolled').length

  return { leads, calls, daily, spend, conversions, days: DAYS }
}

let cached = null

export function getDataset() {
  if (!cached) cached = buildDataset()
  return cached
}

export { formatDuration, formatDateTime } from '@/lib/admin/format'

export { AGENTS, SOURCES, CAMPAIGNS, LANDING_PAGES, CALL_LOCATIONS, daysAgo }
