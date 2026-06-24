import { NextRequest, NextResponse } from 'next/server'
import dns from 'node:dns/promises'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/* ── SSRF protection ──────────────────────────────────────────────
 * This endpoint fetches an arbitrary user-supplied URL server-side, so we must
 * stop it from being used to reach internal/cloud-internal hosts (e.g.
 * 169.254.169.254 metadata, localhost, private LAN ranges). We allow only
 * http/https and reject any URL whose host — or whose DNS-resolved IPs — fall
 * in a private/loopback/link-local range. Resolving DNS guards against a public
 * hostname that points at an internal address (DNS-rebinding style abuse).
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const o = Number(p)
    if (!Number.isInteger(o) || o < 0 || o > 255) return null
    n = n * 256 + o
  }
  return n >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)!
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (n & mask) === (b & mask)
  }
  return (
    inRange('0.0.0.0', 8) ||        // "this" network
    inRange('10.0.0.0', 8) ||       // private
    inRange('100.64.0.0', 10) ||    // CGNAT
    inRange('127.0.0.0', 8) ||      // loopback
    inRange('169.254.0.0', 16) ||   // link-local (incl. cloud metadata)
    inRange('172.16.0.0', 12) ||    // private
    inRange('192.0.0.0', 24) ||     // IETF protocol assignments
    inRange('192.168.0.0', 16) ||   // private
    inRange('198.18.0.0', 15) ||    // benchmarking
    inRange('224.0.0.0', 4) ||      // multicast
    inRange('240.0.0.0', 4)         // reserved
  )
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0] // strip zone id
  if (addr === '::1' || addr === '::') return true
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4 address.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  if (addr.startsWith('fe8') || addr.startsWith('fe9') || addr.startsWith('fea') || addr.startsWith('feb')) return true // link-local fe80::/10
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // unique local fc00::/7
  return false
}

function isPrivateAddress(ip: string): boolean {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

async function validateUrl(raw: string): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  let url: URL
  try { url = new URL(raw) } catch { return { ok: false, reason: 'Invalid URL' } }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' }
  }

  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, reason: 'That host is not allowed' }
  }

  // If the host is already an IP literal, check it directly.
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isPrivateAddress(host)) return { ok: false, reason: 'That host is not allowed' }
    return { ok: true, url }
  }

  // Otherwise resolve DNS and reject if any resolved address is internal.
  try {
    const records = await dns.lookup(host, { all: true })
    if (records.length === 0) return { ok: false, reason: 'Could not resolve host' }
    if (records.some(r => isPrivateAddress(r.address))) {
      return { ok: false, reason: 'That host is not allowed' }
    }
  } catch {
    return { ok: false, reason: 'Could not resolve host' }
  }

  return { ok: true, url }
}

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

  const check = await validateUrl(url)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 })
  }

  try {
    // Follow redirects manually so every hop is re-checked against the SSRF
    // rules — otherwise a public URL could 30x-redirect to an internal host.
    let target = check.url
    let res: Response
    for (let hop = 0; ; hop++) {
      res = await fetch(target, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(15_000),
      })

      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
      if (!location) break
      if (hop >= 5) {
        return NextResponse.json({ error: 'Too many redirects' }, { status: 502 })
      }
      const next = await validateUrl(new URL(location, target).href)
      if (!next.ok) return NextResponse.json({ error: next.reason }, { status: 400 })
      target = next.url
    }

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
