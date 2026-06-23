// iOS Share Sheet lands here with ?url=...&title=...
// We immediately redirect into the app with the URL pre-filled.
import { redirect } from 'next/navigation'

export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string; text?: string }>
}) {
  const { url, title, text } = await searchParams
  // Prefer url param; fall back to text (which can contain a URL when shared from Safari)
  const sharedUrl = url ?? text ?? ''
  const sharedTitle = title ?? ''
  const dest = `/wishlists?share=${encodeURIComponent(sharedUrl)}&shareTitle=${encodeURIComponent(sharedTitle)}`
  redirect(dest)
}
