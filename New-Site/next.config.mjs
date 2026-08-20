/**
 * Next configuration.
 * Deliberately close to empty. Nothing platform specific goes in here, since
 * the deploy target is still an open question and a bare config is the one
 * thing that ports cleanly between Vercel, a Node host, or anywhere else.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TODO add a remotePatterns entry for cdn.sanity.io if the 171 education
  // articles end up staying in Sanity rather than moving into content/.
}

export default nextConfig
