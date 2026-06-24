import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Product search via SerpApi's Google Shopping engine, using the signed-in
// user's own API key (stored in their profile). This is the cross-device,
// "search by name" lookup mode — it works on mobile where the bookmarklet
// can't run. The key never reaches the browser; it's read here, server-side.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Enter something to search for' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('serpapi_key').eq('id', user.id).maybeSingle()
  const key = profile?.serpapi_key
  if (!key) {
    return NextResponse.json(
      { error: 'No SerpApi key saved yet. Add one on the Quick Add page.' },
      { status: 400 },
    )
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(key)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json) {
      return NextResponse.json({ error: `Search service returned ${res.status}` }, { status: 502 })
    }
    if (json.error) {
      return NextResponse.json({ error: String(json.error) }, { status: 502 })
    }

    const results = (json.shopping_results ?? []).slice(0, 12).map((r: Record<string, unknown>) => ({
      title: (r.title as string) ?? null,
      price: r.extracted_price != null
        ? String(r.extracted_price)
        : (typeof r.price === 'string' ? r.price.replace(/[^0-9.]/g, '') : null),
      currency: 'USD',
      image: (r.thumbnail as string) ?? null,
      link: (r.product_link as string) ?? (r.link as string) ?? null,
      source: (r.source as string) ?? null,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
