/**
 * Route for /dual-eligible-snp.
 * Thin on purpose. The content lives in lib/content/products.js and the
 * structure in components/products/ProductPage.js, so all 4 product pages
 * stay identical in shape and only differ in copy.
 */

import ProductPage from '@/components/products/ProductPage'
import { getProduct } from '@/lib/content/products'

const SLUG = 'dual-eligible-snp'

/**
 * Page metadata, read from the product data so the title and description
 * cannot drift away from the copy on the page.
 */
export function generateMetadata() {
  const product = getProduct(SLUG)
  return { title: product.title, description: product.metaDescription }
}

export default function Page() {
  return <ProductPage slug={SLUG} />
}
