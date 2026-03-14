// ---------------------------------------------------------------------------
// ReserveRunway.tsx — Displays emergency reserve runway for each scenario.
//
// Shows how many months of expenses the user's liquid reserves can cover
// if income stopped entirely. This is one of the most important safety
// metrics — financial advisors typically recommend 3-6 months minimum,
// and anyone with two mortgages on a single income should aim for 6+.
//
// Color coding communicates urgency at a glance:
//   < 3 months  = critical (destructive red) — one emergency away from crisis
//   3-6 months  = warning (amber) — below recommended minimum
//   >= 6 months = normal (green) — meets standard financial advice
//   Infinity    = unlimited — positive monthly cash flow, reserves grow over time
// ---------------------------------------------------------------------------

import { useModelOutput } from '@/components/ScenarioModelProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/utils/formatters'
import { cn } from '@/lib/utils'

/** Thresholds for reserve runway severity classification. */
const CRITICAL_THRESHOLD_MONTHS = 3
const WARNING_THRESHOLD_MONTHS = 6

type Severity = 'critical' | 'warning' | 'normal'

/**
 * Classify reserve runway into a severity level.
 * These thresholds align with standard financial planning guidance:
 * - Under 3 months: one unexpected expense (HVAC, medical, job loss) could
 *   force missed mortgage payments or debt accumulation.
 * - 3-6 months: survivable but risky, especially with two mortgages.
 * - 6+ months: meets the standard emergency fund recommendation.
 */
function classifyRunway(months: number): Severity {
  if (months < CRITICAL_THRESHOLD_MONTHS) return 'critical'
  if (months < WARNING_THRESHOLD_MONTHS) return 'warning'
  return 'normal'
}

/** Tailwind classes for the reserve value display based on severity. */
const severityStyles: Record<Severity, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  normal: 'text-green-600 dark:text-green-400',
}

/** Human-readable severity label for screen readers. */
const severityLabels: Record<Severity, string> = {
  critical: 'Critical — below 3 months',
  warning: 'Warning — below 6 months',
  normal: 'Adequate reserves',
}

interface ScenarioRunwayProps {
  label: string
  months: number
  testId: string
}

/**
 * A single scenario's reserve runway metric card.
 * Displays the months value with color-coded severity and accessible labels.
 */
function ScenarioRunwayCard({ label, months, testId }: ScenarioRunwayProps) {
  const isUnlimited = months === Infinity
  const severity = isUnlimited ? 'normal' : classifyRunway(months)
  const displayValue = isUnlimited ? 'Unlimited' : formatNumber(Math.round(months))

  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          data-severity={severity}
          className={cn('text-2xl font-bold tabular-nums', severityStyles[severity])}
          role="status"
          aria-label={`${label}: ${isUnlimited ? 'unlimited' : `${Math.round(months)} months`} of reserves. ${severityLabels[severity]}`}
        >
          {displayValue}
        </span>
        {!isUnlimited && (
          <span className="text-sm text-muted-foreground">months</span>
        )}
      </div>
    </div>
  )
}

/**
 * Reserve Runway results component.
 *
 * Renders a card showing how many months of emergency reserves each
 * scenario provides. Consumes ModelOutput from the ScenarioModelProvider
 * context — renders nothing when modelOutput is null (pre-computation).
 */
export function ReserveRunway() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) return null

  const { baseline, scenarioA, scenarioB } = modelOutput

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserve Runway</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ScenarioRunwayCard
            label="Baseline"
            months={baseline.monthlyReserveRunwayMonths}
            testId="reserve-runway-baseline"
          />
          <ScenarioRunwayCard
            label="Scenario A"
            months={scenarioA.monthlyReserveRunwayMonths}
            testId="reserve-runway-scenarioA"
          />
          <ScenarioRunwayCard
            label="Scenario B"
            months={scenarioB.monthlyReserveRunwayMonths}
            testId="reserve-runway-scenarioB"
          />
        </div>
      </CardContent>
    </Card>
  )
}
