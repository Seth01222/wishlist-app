// Shared metadata for item status and priority — labels, colors, ordering — so
// every view (cards, rows, filters, bulk bar, search) renders them consistently.

export type ItemStatus = 'want' | 'saved' | 'got'

export const STATUS_ORDER: ItemStatus[] = ['want', 'saved', 'got']

export const STATUS_META: Record<ItemStatus, { label: string; short: string; emoji: string; cls: string; dot: string }> = {
  want:  { label: 'Want',     short: 'Want',  emoji: '♡', cls: 'bg-raised text-dim',                 dot: '#9898b0' },
  saved: { label: 'Saved up', short: 'Saved', emoji: '💰', cls: 'bg-amber-500/15 text-amber-500',     dot: '#f59e0b' },
  got:   { label: 'Got it',   short: 'Got',   emoji: '✓', cls: 'bg-emerald-500/15 text-emerald-500', dot: '#10b981' },
}

export function statusOf(item: { status?: string | null; purchased?: boolean | null }): ItemStatus {
  if (item.status === 'saved' || item.status === 'got' || item.status === 'want') return item.status
  return item.purchased ? 'got' : 'want' // fall back for rows without an explicit status
}

export type Priority = 0 | 1 | 2 | 3

export const PRIORITY_META: Record<number, { label: string; short: string; cls: string; color: string }> = {
  0: { label: 'No priority', short: '—',    cls: 'text-ghost',                    color: '#9898b0' },
  1: { label: 'Low',         short: 'Low',  cls: 'bg-sky-500/15 text-sky-500',    color: '#0ea5e9' },
  2: { label: 'Medium',      short: 'Med',  cls: 'bg-amber-500/15 text-amber-500', color: '#f59e0b' },
  3: { label: 'High',        short: 'High', cls: 'bg-rose-500/15 text-rose-500',  color: '#f43f5e' },
}
