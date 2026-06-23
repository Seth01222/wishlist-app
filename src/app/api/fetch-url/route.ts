import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getTag(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1].trim())
  }
  return null
}

function getOg(html: string, prop: string) {
  return getTag(html, [
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'),
  ])
}

function getTwitter(html: string, name: string) {
  return getTag(html, [
    new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${name}["']`, 'i'),
  ])
}

function getMeta(html: string, name: string) {
  return getTag(html, [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ])
}

function getItemprop(html: string, prop: string) {
  return getTag(html, [
    new RegExp(`<[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${prop}["']`, 'i'),
  ])
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractPrice(html: string): { price: string | null; currency: string } {
  // 1. JSON-LD
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const s of scripts) {
    try {
      const json = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
      const data = JSON.parse(json)
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data]
      for (const node of nodes) {
        const offers = node.offers
        if (!offers) continue
        const offer = Array.isArray(offers) ? offers[0] : offers
        const price = offer?.price ?? offer?.lowPrice ?? null
        if (price !== null && price !== undefined && price !== '') {
          return { price: String(price), currency: offer?.priceCurrency ?? 'USD' }
        }
      }
    } catch { /* malformed JSON-LD */ }
  }

  // 2. itemprop="price"
  const ipPrice = getItemprop(html, 'price')
  if (ipPrice) return { price: ipPrice, currency: getItemprop(html, 'priceCurrency') ?? 'USD' }

  // 3. meta[property="product:price:amount"]
  const metaPrice = getOg(html, 'price:amount') ?? getTag(html, [
    /data-price=["']([0-9]+\.?[0-9]*)["']/i,
    /class=["'][^"']*price[^"']*["'][^>]*>\$([0-9,]+\.?[0-9]*)/i,
  ])
  if (metaPrice) {
    const cleaned = metaPrice.replace(/,/g, '')
    if (!isNaN(parseFloat(cleaned))) return { price: cleaned, currency: 'USD' }
  }

  return { price: null, currency: 'USD' }
}

function extractImage(html: string): string | null {
  // Priority order: og:image → twitter:image → itemprop=image → largest product img
  const og = getOg(html, 'image')
  if (og && og.startsWith('http')) return og

  const tw = getTwitter(html, 'image')
  if (tw && tw.startsWith('http')) return tw

  const ip = getItemprop(html, 'image')
  if (ip && ip.startsWith('http')) return ip

  // Amazon-specific: look for the main product image element
  const amazonImg = html.match(/id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i)
    ?? html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)
  if (amazonImg?.[1] && amazonImg[1].startsWith('http')) return amazonImg[1]

  return null
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 })

  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Site returned ${res.status}` }, { status: 502 })
    }

    // Stream up to 300KB, stopping early once we've passed </head>
    let html = ''
    const reader = res.body?.getReader()
    if (reader) {
      const dec = new TextDecoder()
      let bytes = 0
      while (bytes < 300_000) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          html += dec.decode(value, { stream: true })
          bytes += value.length
          if (html.includes('</head>') && bytes > 20_000) break
        }
      }
      reader.cancel().catch(() => {})
    }

    const title = getOg(html, 'title')
      ?? getTwitter(html, 'title')
      ?? getMeta(html, 'title')
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
      ?? null

    const image = extractImage(html)
    const { price, currency } = extractPrice(html)
    const siteName = getOg(html, 'site_name') ?? null

    return NextResponse.json({
      title: title ? decodeEntities(title) : null,
      image,
      description: getOg(html, 'description') ?? getTwitter(html, 'description') ?? getMeta(html, 'description') ?? null,
      siteName,
      price,
      currency,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
