// One off migration tool, the companion to extractEducationIndex.mjs. That one
// produced the article list, this one produces the article bodies.
// Reads the scraped pages in ../Old-Site and writes one file per article into
// content/education/bodies.
//
// Run it with: node scripts/extractEducationBodies.mjs
// It is safe to re-run, everything it writes is derived and overwritten.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const pagesDir = path.join(appRoot, '..', 'Old-Site', 'Pages')
const indexFile = path.join(appRoot, 'content', 'education', 'articles.json')
const outputDir = path.join(appRoot, 'content', 'education', 'bodies')
const WRAPPER = '<div id="portable-text-wrapper">'
const WORDS_PER_MINUTE = 200

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

function extractWrapper(html) {
  const start = html.indexOf(WRAPPER)
  if (start < 0) return null
  return matchBalanced(html, start + WRAPPER.length, 'div')?.inner ?? null
}

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
  return spans.map((span) =>
    span.text ? { ...span, text: span.text.replace(/<[^>]*>/g, '') } : span
  )
}

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

function parseBlocks(html) {
  const blocks = []
  const unknown = []

  const open = /<(p|ul|ol)\b[^>]*>/g
  let cursor = 0
  let match

  while ((match = open.exec(html))) {
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

function collectText(blocks) {
  const out = []

  const fromItems = (items) => {
    for (const item of items) {
      for (const span of item.spans) if (span.text) out.push(span.text)
      if (item.list) fromItems(item.list.items)
    }
  }

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

function countWords(blocks) {
  return collectText(blocks).split(/\s+/).filter(Boolean).length
}

async function run() {
  const articles = JSON.parse(await fs.readFile(indexFile, 'utf8'))
  await fs.mkdir(outputDir, { recursive: true })
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
