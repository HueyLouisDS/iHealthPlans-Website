/**
 * Tailwind configuration for the iHealth Plans site.
 * The screens block is deliberately non standard, it mirrors the breakpoints
 * the live site already ships so the recreated markup lays out identically.
 * Brand colors live in app/globals.css as CSS variables and are surfaced here.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,mdx}',
    './components/**/*.{js,jsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    // Full custom breakpoint scale, read off the live stylesheet rather than
    // guessed. xs, sm, nm, md, and lg are confirmed against generated classes.
    // TODO the names for 1080, 1400, and 1600 are inferred, nothing on the
    // homepage uses them. Confirm before relying on ml, xl, or xxl anywhere.
    screens: {
      xs: '400px',
      sm: '600px',
      nm: '720px',
      md: '900px',
      ml: '1080px',
      lg: '1200px',
      xl: '1400px',
      xxl: '1600px',
    },
    extend: {
      colors: {
        // Pulled from :root on the live site. The existing codebase also has
        // #1A2A55 and #04A350 hardcoded in places, which are near misses of
        // these two. Everything here uses the variables so the drift stops.
        ihealthBlue: 'var(--ihealth-blue)',
        ihealthGreen: 'var(--ihealth-green)',
      },
      fontFamily: {
        // next/font injects the real family through this variable, see layout.js
        sans: ['var(--font-source-sans)', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        // The header and footer both use this exact shell width
        shell: '1520px',
      },
    },
  },
  plugins: [],
}
