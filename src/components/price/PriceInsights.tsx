'use client'

import { computeInsight, type PriceRecord } from '@/lib/price'
import { usePriceSettings } from '@/lib/usePriceInsights'
import Sparkline from './Sparkline'
import PriceProgress from './PriceProgress'
import DealBadges from './DealBadge'

// Assembles the enabled per-item price widgets (badges, target progress,
// sparkline) according to the user's settings. Dropped into both the card and
// compact row views.
export default function PriceInsights({
  current,
  target,
  currency = 'USD',
  history,
  compact = false,
}: {
  current?: number | null
  target?: number | null
  currency?: string
  history: PriceRecord[]
  compact?: boolean
}) {
  const { settings } = usePriceSettings()
  const insight = computeInsight({ current, target, currency, history })

  const showBadges = settings.showBadges
  const showProgress = settings.showProgress && insight.target != null && insight.current != null && !compact
  const showSpark = settings.showSparkline && insight.hasHistory

  if (!showBadges && !showProgress && !showSpark) return null

  return (
    <div className={compact ? 'mt-1' : 'mt-1.5'}>
      {showBadges && <DealBadges insight={insight} />}
      {showProgress && (
        <PriceProgress
          current={insight.current!}
          target={insight.target!}
          currency={insight.currency}
          pct={insight.targetPct ?? 0}
          met={insight.targetMet}
          overTarget={insight.overTarget}
        />
      )}
      {showSpark && (
        <div className={compact ? 'mt-1' : 'mt-2'}>
          <Sparkline
            history={history}
            target={settings.showProgress ? insight.target : null}
            currency={insight.currency}
            rangeDays={settings.sparkRange}
            height={compact ? 26 : 40}
          />
        </div>
      )}
    </div>
  )
}
