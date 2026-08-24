// One off migration tool. Reads the scraped copy of the live site in
// ../Old-Site and produces the data the /education route needs.
// Writes content/education/articles.json and copies every hero image into
// public/images/education, downscaled on the way through.
//
// Run it with: node scripts/extractEducationIndex.mjs
// It is safe to re-run, everything it writes is derived and overwritten.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(scriptDir, '..')
const oldSite = path.join(appRoot, '..', 'Old-Site')
const pagesDir = path.join(oldSite, 'Pages')
const sourceImages = path.join(oldSite, 'Images')
const outputImages = path.join(appRoot, 'public', 'images', 'education')
const outputData = path.join(appRoot, 'content', 'education', 'articles.json')
const MAX_IMAGE_WIDTH = 2000
const JPEG_QUALITY = 82

function match(source, pattern) {
  const found = source.match(pattern)
  return found ? found[1] : null
}

function decodeEntities(value) {
  if (!value) return value
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

function toIsoDate(displayDate) {
  if (!displayDate) return null
  const parsed = new Date(`${displayDate} UTC`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

async function parseArticle(fileName) {
  const source = await fs.readFile(path.join(pagesDir, fileName), 'utf8')
  const slug = fileName.replace(/^education_/, '').replace(/\.html$/, '')

  const rawTitle = match(source, /<meta property="og:title" content="([^"]*)"/)
  const title = decodeEntities(rawTitle || '').replace('iHealth Plans | ', '').trim()
  const description = decodeEntities(match(source, /<meta name="description" content="([^"]*)"/) || '').trim()
  const categorySlug = match(source, /href="\/education\?category=([^"]+)">/)
  const categoryName = decodeEntities(match(source, /href="\/education\?category=[^"]+">([^<]+)<\/a>/) || '')

  // Hero images are Sanity CDN urls, percent encoded inside the optimizer src
  const imageFile = match(source, /cdn\.sanity\.io%2Fimages%2F41pq407l%2Fproduction%2F([^&"]+)/)
  const displayDate = match(source, /text-\[#505258\][^>]*>([0-9]{1,2} [A-Za-z]{3} [0-9]{4})</)

  if (!title || !categorySlug || !imageFile || !displayDate) return null

  return {
    slug,
    title,
    description,
    category: categoryName,
    categorySlug,
    displayDate,
    date: toIsoDate(displayDate),
    image: `/images/education/${imageFile}`,
    sourceImage: imageFile,
  }
}

async function copyImage(fileName) {
  const from = path.join(sourceImages, fileName)
  const to = path.join(outputImages, fileName)

  try {
    const existing = await fs.stat(to)
    return { bytes: existing.size, skipped: true }
  } catch {
    // not there yet, fall through and build it
  }

  const pipeline = sharp(from).resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
  const isPng = fileName.toLowerCase().endsWith('.png')
  const isWebp = fileName.toLowerCase().endsWith('.webp')
  if (isPng) await pipeline.png({ compressionLevel: 9 }).toFile(to)
  else if (isWebp) await pipeline.webp({ quality: JPEG_QUALITY }).toFile(to)
  else await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(to)

  const written = await fs.stat(to)
  return { bytes: written.size, skipped: false }
}

async function main() {
  const fileNames = (await fs.readdir(pagesDir))
    .filter((name) => name.startsWith('education_') && name.endsWith('.html'))
    .sort()

  const parsed = await Promise.all(fileNames.map(parseArticle))
  const articles = parsed.filter(Boolean)
  const failed = fileNames.length - articles.length
  if (failed > 0) console.warn(`  ${failed} pages could not be parsed and were dropped`)
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title))

  await fs.mkdir(outputImages, { recursive: true })
  await fs.mkdir(path.dirname(outputData), { recursive: true })

  const uniqueImages = [...new Set(articles.map((a) => a.sourceImage))]
  let sourceBytes = 0
  let outputBytes = 0

  for (const fileName of uniqueImages) {
    const original = await fs.stat(path.join(sourceImages, fileName))
    const result = await copyImage(fileName)
    sourceBytes += original.size
    outputBytes += result.bytes
  }

  const index = articles.map(({ sourceImage, ...rest }) => rest)    // only used for lookup
  await fs.writeFile(outputData, `${JSON.stringify(index, null, 2)}\n`, 'utf8')

  const toMb = (bytes) => (bytes / 1048576).toFixed(1)
  console.log(`  articles   ${index.length}`)
  console.log(`  categories ${new Set(index.map((a) => a.categorySlug)).size}`)
  console.log(`  images     ${uniqueImages.length}, ${toMb(sourceBytes)} MB in, ${toMb(outputBytes)} MB out`)
  console.log(`  wrote      ${path.relative(appRoot, outputData)}`)
}

main()
