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

export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatDateTime(date) {
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

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
    // 555-01xx is reserved for fiction, so these cannot dial a real person
    const phone = `(555) 01${String(10 + (i % 90)).padStart(2, '0')}`
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

  leads.sort((a, b) => b.createdAt - a.createdAt)
  calls.sort((a, b) => b.startedAt - a.startedAt)

  const conversions = leads.filter((lead) => lead.status === 'enrolled').length

  return { leads, calls, daily, conversions, days: DAYS }
}

let cached = null

export function getDataset() {
  if (!cached) cached = buildDataset()
  return cached
}

export { AGENTS, SOURCES, CAMPAIGNS, LANDING_PAGES, CALL_LOCATIONS, daysAgo }
