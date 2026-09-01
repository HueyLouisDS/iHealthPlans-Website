// Shared handling for the two beacon routes, /api/track and /api/call/click.
// Reads the request rather than the payload wherever it can, since anything
// the browser sends is a claim and anything the request carries is a fact.

export const MAX_BODY_BYTES = 4 * 1024  // a beacon payload is a few hundred bytes

/*
 Named so a check reads as a rule rather than as a magic string. Deliberately
 short, since this is a traffic filter and not a security control. Anything
 determined to look like a browser will, and no reporting figure is worth
 maintaining a fingerprint list to catch it.
*/
const BOT_MARKERS = [
  'bot', 'crawl', 'spider', 'slurp', 'headless', 'phantom', 'curl', 'wget',
  'python-requests', 'axios', 'lighthouse', 'pingdom', 'monitor', 'preview',
]

const MOBILE_MARKERS = ['iphone', 'ipod', 'android', 'windows phone']
const TABLET_MARKERS = ['ipad', 'tablet', 'kindle', 'playbook']

export const DEVICES = { mobile: 'mobile', tablet: 'tablet', desktop: 'desktop' }

// A missing user agent counts as a bot, since every real browser sends one
export function looksLikeBot(userAgent) {
  if (!userAgent) return true

  const agent = userAgent.toLowerCase()
  return BOT_MARKERS.some((marker) => agent.includes(marker))
}

export function deviceFrom(userAgent) {
  if (!userAgent) return null

  const agent = userAgent.toLowerCase()

  // Tablet first. An iPad reports itself as touch and would otherwise be caught by the mobile markers on some Android builds.
  if (TABLET_MARKERS.some((marker) => agent.includes(marker))) return DEVICES.tablet
  if (MOBILE_MARKERS.some((marker) => agent.includes(marker))) return DEVICES.mobile

  return DEVICES.desktop
}

/*=======================================================
        THE ADDRESS IS TRUNCATED BEFORE IT IS STORED
========================================================*/

/*
 A full address is personal data under several state privacy laws and is not
 needed for anything this reports. v4 keeps 3 octets, v6 keeps the first 3
 groups, which is the /48 a single site is allocated.

 Truncating here rather than at the query means there is one place to look
 when somebody asks what the site holds, and no path that writes a full one.*/
export function truncateIp(address) {
  if (!address) return null

  const raw = String(address).trim()
  if (!raw) return null

  if (raw.includes('.')) {
    const octets = raw.split('.')
    return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0` : null
  }

  if (raw.includes(':')) {
    const groups = raw.split(':').filter(Boolean)
    return groups.length >= 3 ? `${groups[0]}:${groups[1]}:${groups[2]}::` : null
  }

  return null
}

// First entry of x-forwarded-for is the client, the rest are proxies
export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0].trim() || null
}

/*
 Read once here so both routes agree on what a request carries. user_agent is
 VARCHAR(500) in migration 001, and a few crawlers send far more than that.
*/
export function requestFacts(request) {
  const userAgent = request.headers.get('user-agent')

  return {
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
    device: deviceFrom(userAgent),
    ipPrefix: truncateIp(clientIp(request)),
    isBot: looksLikeBot(userAgent),
  }
}

/*
 Nothing is returned to the browser. sendBeacon discards the response, and a
 body here would only be read by somebody probing what the endpoint knows.
*/
export function accepted() {
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
