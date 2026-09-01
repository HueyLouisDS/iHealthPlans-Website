// Turns a landing url and a referrer into the touch that produced a visit.
// Read by /api/track for the session's last touch, and on a first visit for
// the visitor's first touch as well. Pure functions, no database, no request.
const DIRECT_SOURCE = '(direct)'        // a visit carrying nothing to attribute
const DIRECT_MEDIUM = '(none)'
const ORGANIC_MEDIUM = 'organic'
const REFERRAL_MEDIUM = 'referral'

/*
 Column widths from migration 001. Truncated here rather than by the database,
 because Postgres errors on an over long value where MySQL silently trimmed
 it, and a beacon must never be the thing that fails a request.*/
const LIMITS = {
  source: 120,
  medium: 120,
  campaign: 200,
  content: 200,
  term: 200,
  landingPage: 500,
  referrer: 500,
  clickId: 255,
}

/*
 A click id identifies the platform on its own, so a paid visit is still
 attributed when the utm parameters are missing. That is the normal case for
 an auto tagged Google Ads click, where gclid arrives and nothing else does.*/
const CLICK_IDS = [
  { param: 'gclid', key: 'gclid', source: 'google', medium: 'cpc' },
  { param: 'fbclid', key: 'fbclid', source: 'facebook', medium: 'paid_social' },
  { param: 'msclkid', key: 'msclkid', source: 'bing', medium: 'cpc' },
]

// Referrer hosts that mean organic search rather than a link from a site
const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.', 'search.brave.', 'startpage.']

function clamp(value, max) {
  if (value === null || value === undefined) return null

  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}

/* the referrer reduced to origin and path, since a referring query string can carry personal data we have no reason to hold */
function safeReferrer(referrer) {
  if (!referrer) return null

  try {
    const url = new URL(referrer)
    return clamp(`${url.origin}${url.pathname}`, LIMITS.referrer)
  } catch {
    return null
  }
}

function referrerHost(referrer) {
  try {
    return new URL(referrer).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isSearchHost(host) {
  return SEARCH_HOSTS.some((prefix) => host.startsWith(prefix) || host.includes(`.${prefix}`))
}

/*=======================================================
        RESOLUTION ORDER, AND WHY IT IS THIS ORDER
========================================================*/

/*
 utm first, because somebody set it deliberately and an explicit tag beats
 anything inferred. Click ids next, since they are set by the platform rather
 than by a person and are correct when they appear. Referrer last, because it
 is the weakest signal and the one most often stripped in transit.

 An empty utm_source with a gclid present must fall through to the click id
 rather than resolving to direct, which is why each step tests for a value
 rather than for the parameter existing.
*/
export function readTouch({ url, referrer, siteHost }) {
  let parsed                            // the landing url, unparsed until proven valid

  try {
    parsed = new URL(url)
  } catch {
    return emptyTouch()
  }

  const params = parsed.searchParams
  const touch = {
    source: null,
    medium: null,
    campaign: clamp(params.get('utm_campaign'), LIMITS.campaign),
    content: clamp(params.get('utm_content'), LIMITS.content),
    term: clamp(params.get('utm_term'), LIMITS.term),
    // Path only. The query is already extracted above, and holding it again
    // would put click ids into a column reports group by.
    landingPage: clamp(parsed.pathname, LIMITS.landingPage),
    referrer: safeReferrer(referrer),
    gclid: clamp(params.get('gclid'), LIMITS.clickId),
    fbclid: clamp(params.get('fbclid'), LIMITS.clickId),
    msclkid: clamp(params.get('msclkid'), LIMITS.clickId),
  }

  const taggedSource = clamp(params.get('utm_source'), LIMITS.source)
  const taggedMedium = clamp(params.get('utm_medium'), LIMITS.medium)

  if (taggedSource) {
    touch.source = taggedSource
    touch.medium = taggedMedium || REFERRAL_MEDIUM
    return touch
  }

  const clickId = CLICK_IDS.find((entry) => touch[entry.key])
  if (clickId) {
    touch.source = clickId.source
    touch.medium = taggedMedium || clickId.medium
    return touch
  }

  const host = referrerHost(referrer)

  // A referrer from our own host is a page to page move, not a new touch
  if (!host || host === siteHost) {
    touch.source = DIRECT_SOURCE
    touch.medium = DIRECT_MEDIUM
    return touch
  }

  touch.source = clamp(host, LIMITS.source)
  touch.medium = isSearchHost(host) ? ORGANIC_MEDIUM : REFERRAL_MEDIUM

  return touch
}

// Every column null except the pair that says nothing was attributable
export function emptyTouch() {
  return {
    source: DIRECT_SOURCE,
    medium: DIRECT_MEDIUM,
    campaign: null,
    content: null,
    term: null,
    landingPage: null,
    referrer: null,
    gclid: null,
    fbclid: null,
    msclkid: null,
  }
}
