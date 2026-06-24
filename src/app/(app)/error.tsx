'use client'

// Catches unexpected errors in the authenticated app (e.g. a Supabase hiccup)
// and shows a friendly retry instead of the raw Next.js error screen.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-24 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl" style={{ background: 'var(--a50)' }}>
        😕
      </div>
      <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
      <p className="text-dim text-sm mb-6">
        We couldn&apos;t load this page. This is sometimes a temporary connection issue.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl font-medium text-sm spring"
        style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
      >
        Try again
      </button>
    </div>
  )
}
