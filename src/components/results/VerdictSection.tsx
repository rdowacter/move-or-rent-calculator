// ---------------------------------------------------------------------------
// VerdictSection.tsx — The first and most important thing the user sees in
// the results view. Renders the verdict engine's recommendation with a
// prominent headline, reasoning paragraphs, dealbreaker callouts, and a
// compact key metrics comparison table.
//
// This component answers the user's core question: "What should I do?"
// Every claim is backed by a specific dollar amount from the model output.
//
// Consumes ModelOutput via useModelOutput() and form inputs via useWatch()
// to call generateVerdict(). The verdict is memoized to avoid recomputation
// on unrelated re-renders.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { generateVerdict } from '@/engine/verdict'
import type { ScenarioInputs, VerdictResult } from '@/engine/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Recommendation → visual treatment mapping
// ---------------------------------------------------------------------------

/**
 * Maps recommendation type to headline styling.
 * 'none' gets destructive treatment (red) because all scenarios failed.
 * Named scenarios get a positive treatment (green/default).
 */
function getHeadlineStyle(recommendation: VerdictResult['recommendation']): string {
  if (recommendation === 'none') {
    return 'text-destructive'
  }
  return 'text-foreground'
}

function getHeadlineIcon(recommendation: VerdictResult['recommendation']) {
  if (recommendation === 'none') {
    return XCircle
  }
  return CheckCircle
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Renders the list of dealbreakers — scenarios that were eliminated by
 * critical financial risks. Uses destructive/amber styling to communicate
 * severity visually and via ARIA.
 */
function Dealbreakers({
  dealbreakers,
}: {
  dealbreakers: VerdictResult['dealbreakers']
}) {
  if (dealbreakers.length === 0) {
    return null
  }

  return (
    <div className="space-y-3" data-testid="verdict-dealbreakers">
      {dealbreakers.map((db) => (
        <Alert
          key={db.scenario}
          variant="destructive"
          className="border-destructive/50"
        >
          <AlertTriangle className="size-4" />
          <AlertTitle>{db.scenario} -- Eliminated</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              {db.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm">
                  {reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

/**
 * Renders the key metrics comparison table — 3 columns (Baseline / A / B)
 * with rows for net worth, IRA, cash flow, upfront capital, and reserve runway.
 *
 * Responsive: on mobile (<375px), the table scrolls horizontally rather
 * than overflowing. Column headers are abbreviated on small screens.
 */
function KeyMetricsTable({
  keyMetrics,
}: {
  keyMetrics: VerdictResult['keyMetrics']
}) {
  return (
    <div className="overflow-x-auto -mx-1" data-testid="verdict-key-metrics">
      <table className="w-full text-sm min-w-[340px]">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-2 font-medium text-muted-foreground">
              Metric
            </th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">
              Baseline
            </th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">
              Scenario A
            </th>
            <th className="text-right py-2 pl-2 font-medium text-muted-foreground">
              Scenario B
            </th>
          </tr>
        </thead>
        <tbody>
          {keyMetrics.map((metric) => (
            <tr key={metric.label} className="border-b last:border-b-0">
              <td className="py-2 pr-2 text-muted-foreground">
                {metric.label}
              </td>
              <td className="py-2 px-2 text-right font-medium whitespace-nowrap">
                {metric.baseline}
              </td>
              <td className="py-2 px-2 text-right font-medium whitespace-nowrap">
                {metric.scenarioA}
              </td>
              <td className="py-2 pl-2 text-right font-medium whitespace-nowrap">
                {metric.scenarioB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * VerdictSection — the headline recommendation rendered at the top of the
 * results view, above all charts and tables.
 *
 * Calls generateVerdict() with the model output and current form inputs,
 * memoized so it only recomputes when the model output changes.
 *
 * Must be rendered inside both a ScenarioModelProvider and a
 * react-hook-form FormProvider.
 */
export function VerdictSection() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()

  const verdict = useMemo(() => {
    if (!modelOutput) return null
    return generateVerdict(modelOutput, formValues as ScenarioInputs)
  }, [modelOutput, formValues])

  if (!verdict) {
    return null
  }

  const HeadlineIcon = getHeadlineIcon(verdict.recommendation)
  const isNoneRecommendation = verdict.recommendation === 'none'

  return (
    <div
      className={cn(
        'space-y-4',
        isNoneRecommendation && 'rounded-lg border-2 border-destructive/50 p-4 bg-destructive/5'
      )}
      role="region"
      aria-label="Verdict"
      data-testid="verdict-section"
    >
      {/* Headline */}
      <div className="flex items-start gap-3">
        <HeadlineIcon
          className={cn(
            'size-7 mt-0.5 shrink-0',
            isNoneRecommendation ? 'text-destructive' : 'text-green-600 dark:text-green-400'
          )}
          aria-hidden="true"
        />
        <h2
          className={cn(
            'text-2xl font-bold leading-tight',
            getHeadlineStyle(verdict.recommendation)
          )}
          data-testid="verdict-headline"
        >
          {verdict.headline}
        </h2>
      </div>

      {/* Reasoning paragraphs */}
      <div className="space-y-2 pl-10" data-testid="verdict-reasoning">
        {verdict.reasoning.map((paragraph, idx) => (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Dealbreakers */}
      {verdict.dealbreakers.length > 0 && (
        <div className="pl-10">
          <Dealbreakers dealbreakers={verdict.dealbreakers} />
        </div>
      )}

      {/* Key Metrics Table */}
      <Card className="ml-10">
        <CardContent className="pt-4 pb-3 px-3">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Key Metrics Comparison
          </h3>
          <KeyMetricsTable keyMetrics={verdict.keyMetrics} />
        </CardContent>
      </Card>
    </div>
  )
}
