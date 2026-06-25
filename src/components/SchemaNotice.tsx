'use client'

import { useState } from 'react'

// Shown when a page's query had to fall back because the database is missing
// columns/tables the app expects — i.e. supabase/schema.sql hasn't been re-run.
// Prevents the confusing "everything looks empty" failure mode.
export default function SchemaNotice() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold text-ink">Your database needs an update</p>
        <p className="text-dim mt-0.5">
          Some newer features (master lists, statuses, priority, price history) need columns that
          aren&apos;t in your database yet, so parts of this page may look empty. Re-run
          {' '}<code className="text-ink">supabase/schema.sql</code> in the Supabase SQL editor — it&apos;s
          safe to run again and won&apos;t touch your data.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} title="Dismiss" className="shrink-0 p-1 rounded-lg text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 spring">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  )
}
