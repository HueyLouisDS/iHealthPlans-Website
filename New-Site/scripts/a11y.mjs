// Runs the accessibility self assessment the accessibility statement describes.
//
//   npm run dev            in one terminal
//   node scripts/a11y.mjs  in another
//
// Prints a per page summary and the distinct failing colour pairs, which is
// what the Known limitations section is written from. Rerun it before changing
// that section, because a statement listing problems that were fixed is as
// wrong as one hiding problems that were not.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const BASE = process.env.LH_A11Y_BASE || 'http://localhost:3000'

/*
 The rule sets the statement claims conformance against. Adding 2.2 here would
 change what the page has to say, so the two move together.
*/
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const PAGES = [
  '/', '/medicare-advantage', '/dual-eligible-snp', '/prescription-drug-plans',
  '/quote-health-plans', '/education', '/careers', '/do-not-call',
  '/privacy-policy', '/privacy-rights', '/terms-of-service', '/tpmo-disclosure',
  '/nondiscrimination-notice', '/accessibility', '/medicare-enrollment-periods',
  '/special-enrollment-period', '/medicare-advantage-open-enrollment',
]

/*-------- This is critical --------*/
/*
 axe needs a real browser. There is no headless driver in this project on
 purpose, since adding one pulls a browser download into every install for a
 task that runs a few times a year.

 So this script does not drive the pages itself. It prints the snippet to paste
 into the browser console, and the page count and rule set stay in one place
 rather than being retyped each time. Swap this for a driver only if the
 assessment starts running often enough to be worth the dependency.
*/
function snippet() {
  const axePath = path.join(appRoot, 'node_modules', 'axe-core', 'axe.min.js')
  if (!fs.existsSync(axePath)) {
    console.error('axe-core is not installed. Run: npm i -D axe-core')
    process.exit(1)
  }

  return `(async () => {
  const axeSrc = await fetch('/axe.min.js').then(r => r.text())
  const PAGES = ${JSON.stringify(PAGES)}
  const TAGS = ${JSON.stringify(TAGS)}
  const pairs = new Map(), rows = []

  for (const p of PAGES) {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;left:-9999px;width:1280px;height:900px;'
    document.body.appendChild(f)
    await new Promise(r => { f.onload = r; f.src = p })
    await new Promise(r => setTimeout(r, 600))
    f.contentWindow.eval(axeSrc)
    const res = await f.contentWindow.axe.run(f.contentDocument, { runOnly: { type: 'tag', values: TAGS } })
    rows.push(p.padEnd(36) + (res.violations.length
      ? res.violations.map(v => v.id + '(' + v.impact + ') x' + v.nodes.length).join(', ')
      : 'clean'))
    for (const v of res.violations) {
      if (v.id !== 'color-contrast') continue
      for (const n of v.nodes) {
        const d = (n.any[0] || {}).data || {}
        const k = d.fgColor + ' on ' + d.bgColor + '  ratio ' + d.contrastRatio + ' needs ' + d.expectedContrastRatio
        pairs.set(k, (pairs.get(k) || 0) + 1)
      }
    }
    f.remove()
  }
  return rows.join('\\n') + '\\n\\nFailing colour pairs\\n' +
    [...pairs].sort((a, b) => b[1] - a[1]).map(([k, n]) => String(n).padStart(4) + 'x  ' + k).join('\\n')
})()`
}

console.log(`Accessibility self assessment, ${PAGES.length} pages against ${TAGS.join(', ')}.

1. Start the dev server if it is not already up.
2. Copy node_modules/axe-core/axe.min.js into public/ so the page can load it
   from its own origin, then delete it when you are done.
3. Open ${BASE} and paste the snippet below into the browser console.

------------------------------------------------------------------
${snippet()}
------------------------------------------------------------------
`)
