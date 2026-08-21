/**
 * PostCSS pipeline for Tailwind.
 * Kept as a plain CommonJS file so it works without "type": "module" in
 * package.json, which tailwind.config.js also depends on.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
