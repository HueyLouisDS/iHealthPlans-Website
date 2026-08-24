/**
 * One off migration tool, the companion to extractEducationIndex.mjs. That one
 * produced the article list, this one produces the article bodies.
 * Reads the scraped pages in ../Old-Site and writes one file per article into
 * content/education/bodies.
 *
 * Run it with: node scripts/extractEducationBodies.mjs
 * It is safe to re-run, everything it writes is derived and overwritten.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const pagesDir = path.join(appRoot, '..', 'Old-Site', 'Pages')
const indexFile = path.join(appRoot, 'content', 'education', 'articles.json')
const outputDir = path.join(appRoot, 'content', 'education', 'bodies')

/*
 The old site is a Next.js app rendering Sanity portable text, and it wraps
 every article body in this one element. Everything outside it is chrome,
 breadcrumbs, share buttons, and the related articles rail.
*/
const WRAPPER = '<div id="portable-text-wrapper">'

/*
 Average adult reading speed for this kind of material. Only used to print
 "4 min read", so being 20 percent out costs nothing.
*/
const WORDS_PER_MINUTE = 200

/**
 * Finds the end of an element whose opening tag has already been consumed.
 *
 * Depth counted rather than searching for the next closing tag, because these
 * elements nest and the naive version silently truncates at the first inner
 * close. That failure is invisible, the page still renders, it just stops
 * halfway through. It cost 10 articles their nested lists before this existed.
 */
function matchBalanced(html, from, tag) {
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
  tags.lastIndex = from

  let depth = 1
  let match

  while ((match = tags.exec(html))) {
    depth += match[1] ? -1 : 1
    if (depth === 0) return { inner: html.slice(from, match.index), end: tags.lastIndex }
  }

  return null
}

/**
 * Pulls the body out of a page.
 */
function extractWrapper(html) {
  const start = html.indexOf(WRAPPER)
  if (start < 0) return null

  /*
   An unbalanced wrapper means the scrape is truncated. Returning the rest of
   the file would quietly publish the footer as article text.
  */
  return matchBalanced(html, start + WRAPPER.length, 'div')?.inner ?? null
}

/**
 * Turns HTML entities back into characters.
 * Only the 3 named entities the scrape actually contains, plus the numeric
 * forms, so an unexpected one shows up as itself rather than being silently
 * mangled into something plausible.
 */
function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Last, or it would turn &amp;#x27; into an apostrophe rather than text
    .replace(/&amp;/g, '&')
}

/**
 * Parses inline markup into spans.
 *
 * Returns plain data rather than HTML, so the renderer never has to trust the
 * scrape. Anything this parser does not recognise is dropped to text, which
 * means a stray tag in the source can produce a wrong looking sentence but
 * never an injected element.
 */
function parseSpans(html) {
  const spans = []
  const marks = []
  let buffer = ''

  const flush = () => {
    if (!buffer) return
    const text = decodeEntities(buffer)
    if (text) spans.push(marks.length ? { text, marks: [...marks] } : { text })
    buffer = ''
  }

  const token = /<(\/?)(strong|em|br)\s*\/?>/g
  let cursor = 0
  let match

  while ((match = token.exec(html))) {
    buffer += html.slice(cursor, match.index)
    cursor = token.lastIndex

    const [, closing, name] = match

    if (name === 'br') {
      flush()
      spans.push({ break: true })
      continue
    }

    flush()
    if (closing) {
      const at = marks.lastIndexOf(name)
      if (at >= 0) marks.splice(at, 1)
    } else {
      marks.push(name)
    }
  }

  buffer += html.slice(cursor)
  flush()

  /*
   Strip anything left over, which should be nothing. Logged by the caller if
   it is not, since a surprise here means the scrape changed shape.
  */
  return spans.map((span) =>
    span.text ? { ...span, text: span.text.replace(/<[^>]*>/g, '') } : span
  )
}

/**
 * Splits a list's contents into items, keeping any nested list with its item.
 *
 * Lists here go 2 deep. A parent item is a label and the list under it holds
 * the detail, so flattening them would put a label and its own explanation at
 * the same level and read as a contradiction.
 */
function parseItems(html) {
  const items = []
  const open = /<li\b[^>]*>/g
  let match

  while ((match = open.exec(html))) {
    const found = matchBalanced(html, open.lastIndex, 'li')
    if (!found) break
    open.lastIndex = found.end

    // The nested list comes out first, so its markup is not read as text
    let inner = found.inner
    let nested = null

    const nestedOpen = /<(ul|ol)\b[^>]*>/.exec(inner)
    if (nestedOpen) {
      const tag = nestedOpen[1]
      const from = nestedOpen.index + nestedOpen[0].length
      const list = matchBalanced(inner, from, tag)
      if (list) {
        nested = { ordered: tag === 'ol', items: parseItems(list.inner) }
        inner = inner.slice(0, nestedOpen.index) + inner.slice(list.end)
      }
    }

    const spans = parseSpans(inner)
    if (spans.some((span) => span.text?.trim()) || nested) {
      items.push(nested ? { spans, list: nested } : { spans })
    }
  }

  return items
}

/**
 * Turns one article body into blocks.
 *
 * Paragraphs and lists only, which is everything these 170 articles use. A
 * paragraph that is nothing but one bold run is treated as a heading, because
 * that is what it is. The old site has no real headings inside an article, so
 * every one of these pages is a wall of paragraphs with no structure for a
 * screen reader to navigate by and nothing for search to read as an outline.
 */
function parseBlocks(html) {
  const blocks = []
  const unknown = []

  const open = /<(p|ul|ol)\b[^>]*>/g
  let cursor = 0
  let match

  while ((match = open.exec(html))) {
    /*
     Anything between blocks is content the old site put outside a paragraph.
     Reported rather than dropped, so a shape change is loud.
    */
    const between = html.slice(cursor, match.index).replace(/<[^>]*>/g, '').trim()
    if (between) unknown.push(between.slice(0, 80))

    const tag = match[1]
    const found = matchBalanced(html, open.lastIndex, tag)
    if (!found) break
    open.lastIndex = found.end
    cursor = found.end

    if (tag === 'p') {
      const spans = parseSpans(found.inner)
      // An empty paragraph is spacing in the source, not content
      if (!spans.some((span) => span.text?.trim())) continue

      const isHeading =
        spans.length === 1 && spans[0].marks?.length === 1 && spans[0].marks[0] === 'strong'

      blocks.push(
        isHeading ? { type: 'heading', text: spans[0].text.trim() } : { type: 'paragraph', spans }
      )
      continue
    }

    const items = parseItems(found.inner)
    if (items.length) blocks.push({ type: 'list', ordered: tag === 'ol', items })
  }

  const trailing = html.slice(cursor).replace(/<[^>]*>/g, '').trim()
  if (trailing) unknown.push(trailing.slice(0, 80))

  return { blocks, unknown }
}

/**
 * Collects every piece of text in a block tree, nested list items included.
 */
function collectText(blocks) {
  const out = []

  const fromItems = (items) => {
    for (const item of items) {
      for (const span of item.spans) if (span.text) out.push(span.text)
      if (item.list) fromItems(item.list.items)
    }
  }

  /*
   Braces on every branch. Without them the trailing `else if` binds to the
   brace-less `if (span.text)` inside the paragraph loop rather than to this
   chain, so list text is never collected and every article with a list
   reports a reading time far shorter than it is.
  */
  for (const block of blocks) {
    if (block.type === 'heading') {
      out.push(block.text)
    } else if (block.type === 'paragraph') {
      for (const span of block.spans) {
        if (span.text) out.push(span.text)
      }
    } else if (block.type === 'list') {
      fromItems(block.items)
    }
  }

  return out.join(' ')
}

/**
 * Counts words, for the reading time.
 */
function countWords(blocks) {
  return collectText(blocks).split(/\s+/).filter(Boolean).length
}

async function run() {
  const articles = JSON.parse(await fs.readFile(indexFile, 'utf8'))
  await fs.mkdir(outputDir, { recursive: true })

  /*
   Anything already there is from a previous run. Removed rather than left,
   so a slug that disappears from the index does not linger as a stale page.
  */
  for (const stale of await fs.readdir(outputDir).catch(() => [])) {
    if (stale.endsWith('.json')) await fs.unlink(path.join(outputDir, stale))
  }

  const failures = []
  const surprises = []
  let written = 0

  for (const article of articles) {
    const source = path.join(pagesDir, `education_${article.slug}.html`)

    let html
    try {
      html = await fs.readFile(source, 'utf8')
    } catch {
      failures.push({ slug: article.slug, reason: 'no scraped page' })
      continue
    }

    const body = extractWrapper(html)
    if (body === null) {
      failures.push({ slug: article.slug, reason: 'no balanced body wrapper' })
      continue
    }

    const { blocks, unknown } = parseBlocks(body)
    if (!blocks.length) {
      failures.push({ slug: article.slug, reason: 'body parsed to nothing' })
      continue
    }
    if (unknown.length) surprises.push({ slug: article.slug, unknown })

    const words = countWords(blocks)

    await fs.writeFile(
      path.join(outputDir, `${article.slug}.json`),
      `${JSON.stringify({ slug: article.slug, words, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)), blocks }, null, 2)}\n`,
      'utf8'
    )
    written += 1
  }

  console.log(`wrote ${written} of ${articles.length} article bodies`)
  if (surprises.length) {
    console.warn(`${surprises.length} articles had text outside a known block:`)
    for (const item of surprises.slice(0, 10)) console.warn('  ', item.slug, item.unknown)
  }
  if (failures.length) {
    console.error(`${failures.length} failed:`)
    for (const item of failures) console.error('  ', item.slug, item.reason)
    process.exitCode = 1
  }
}

run()
