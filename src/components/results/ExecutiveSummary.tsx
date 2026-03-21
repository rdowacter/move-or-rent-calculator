// ---------------------------------------------------------------------------
// ExecutiveSummary.tsx — The top-level scorecard that replaces the old
// "Financial Comparison" heading and scenario legend. Renders a verdict
// headline, side-by-side scorecard table with feasibility badges and risk
// levels, and an optional guardrail callout.
//
// This is the first thing the user sees in the results view. It answers
// "which scenario wins?" and "can I actually afford it?" in a single glance.
//
// Consumes ModelOutput via useModelOutput() and form inputs via useWatch()
// to call generateScorecardVerdict(). The verdict is memoized to avoid
// recomputation on unrelated re-renders.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { generateScorecardVerdict } from '@/engine/verdict'
import type {
  ScenarioInputs,
  ScorecardRow,
  FeasibilityStatus,
  RiskLevel,
} from '@/engine/types'
import { formatCurrency } from '@/utils/formatters'
import { SCENARIO_COLORS } from '@/utils/scenarioColors'
import { useHomeNames } from '@/hooks/useHomeNames'
import { cn } from '@/lib/utils'

/** Build scenario labels from the user's home names. */
function buildScenarioLabels(currentHomeName: string, newHomeName: string) {
  return {
    baseline: { short: 'Baseline', full: `Stay in ${currentHomeName}, keep the IRA, keep commuting` },
    scenarioA: { short: 'Scenario A', full: `Sell ${currentHomeName}, buy ${newHomeName}, keep IRA intact + contributing` },
    scenarioB: { short: 'Scenario B', full: `Keep ${currentHomeName} as rental, withdraw IRA for down payment, buy ${newHomeName}` },
  }
}

// ---------------------------------------------------------------------------
// Badge styling maps
// ---------------------------------------------------------------------------

const FEASIBILITY_STYLES: Record<FeasibilityStatus, string> = {
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  tight: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  not_feasible: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a small inline badge with colored background. */
function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

/**
 * Formats cash flow for display. For Scenario B (index 2), shows the
 * worst-to-best range since rental income creates a meaningful spread.
 */
function formatCashFlowCell(row: ScorecardRow, index: number): string {
  if (index === 2 && row.monthlyCashFlow !== row.monthlyCashFlowBest) {
    return `${formatCurrency(row.monthlyCashFlow)}–${formatCurrency(row.monthlyCashFlowBest)}/mo`
  }
  return `${formatCurrency(row.monthlyCashFlowBest)}/mo`
}

// ---------------------------------------------------------------------------
// Desktop scorecard table (>=768px)
// ---------------------------------------------------------------------------

function ScorecardTable({
  rows,
  timeHorizon,
  scenarioLabels,
}: {
  rows: [ScorecardRow, ScorecardRow, ScorecardRow]
  timeHorizon: number
  scenarioLabels: ReturnType<typeof buildScenarioLabels>
}) {
  return (
    <div className="hidden md:block overflow-x-auto" data-testid="scorecard-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Metric</th>
            {rows.map((_, i) => (
              <th key={i} className="text-right py-2 px-2 font-medium text-muted-foreground">
                <span className="flex items-center justify-end gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: Object.values(SCENARIO_COLORS)[i] }}
                  />
                  {Object.values(scenarioLabels)[i].short}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Feasibility */}
          <tr className="border-b">
            <td className="py-2 pr-2 text-muted-foreground">Feasibility</td>
            {rows.map((row, i) => (
              <td key={i} className="py-2 px-2 text-right">
                <Badge className={FEASIBILITY_STYLES[row.feasibility.status]}>
                  {row.feasibility.label}
                </Badge>
              </td>
            ))}
          </tr>

          {/* Monthly Cash Flow */}
          <tr className="border-b">
            <td className="py-2 pr-2 text-muted-foreground">Monthly Cash Flow</td>
            {rows.map((row, i) => (
              <td key={i} className="py-2 px-2 text-right font-medium whitespace-nowrap">
                {formatCashFlowCell(row, i)}
              </td>
            ))}
          </tr>

          {/* Net Worth */}
          <tr className="border-b">
            <td className="py-2 pr-2 text-muted-foreground">Net Worth ({timeHorizon}yr)</td>
            {rows.map((row, i) => (
              <td key={i} className="py-2 px-2 text-right font-medium whitespace-nowrap">
                {formatCurrency(row.finalNetWorth)}
                {row.isWinner && <span className="ml-1 text-amber-500" aria-label="Winner">&#9733;</span>}
              </td>
            ))}
          </tr>

          {/* Risk */}
          <tr className="border-b">
            <td className="py-2 pr-2 text-muted-foreground">Risk</td>
            {rows.map((row, i) => (
              <td key={i} className="py-2 px-2 text-right">
                <Badge className={RISK_STYLES[row.riskLevel]}>
                  {RISK_LABELS[row.riskLevel]}
                </Badge>
              </td>
            ))}
          </tr>

          {/* IRA */}
          <tr>
            <td className="py-2 pr-2 text-muted-foreground">IRA at {timeHorizon}yr</td>
            {rows.map((row, i) => (
              <td key={i} className="py-2 px-2 text-right font-medium whitespace-nowrap">
                {formatCurrency(row.finalIRABalance)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile scorecard cards (<768px)
// ---------------------------------------------------------------------------

function ScorecardCards({
  rows,
  timeHorizon,
  scenarioLabels,
}: {
  rows: [ScorecardRow, ScorecardRow, ScorecardRow]
  timeHorizon: number
  scenarioLabels: ReturnType<typeof buildScenarioLabels>
}) {
  const scenarioKeys = ['baseline', 'scenarioA', 'scenarioB'] as const

  return (
    <div className="md:hidden space-y-3" data-testid="scorecard-cards">
      {rows.map((row, i) => {
        const key = scenarioKeys[i]
        const color = SCENARIO_COLORS[key]

        return (
          <div
            key={key}
            className="rounded-lg border bg-card p-3 space-y-2"
            style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                {scenarioLabels[key].short}
                {row.isWinner && <span className="text-amber-500" aria-label="Winner">&#9733;</span>}
              </span>
              <Badge className={FEASIBILITY_STYLES[row.feasibility.status]}>
                {row.feasibility.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-muted-foreground">Cash Flow</div>
              <div className="text-right font-medium">{formatCashFlowCell(row, i)}</div>

              <div className="text-muted-foreground">Net Worth ({timeHorizon}yr)</div>
              <div className="text-right font-medium">{formatCurrency(row.finalNetWorth)}</div>

              <div className="text-muted-foreground">Risk</div>
              <div className="text-right">
                <Badge className={RISK_STYLES[row.riskLevel]}>
                  {RISK_LABELS[row.riskLevel]}
                </Badge>
              </div>

              <div className="text-muted-foreground">IRA at {timeHorizon}yr</div>
              <div className="text-right font-medium">{formatCurrency(row.finalIRABalance)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scenario Legend
// ---------------------------------------------------------------------------

function ScenarioLegend({ scenarioLabels }: { scenarioLabels: ReturnType<typeof buildScenarioLabels> }) {
  const scenarioKeys = ['baseline', 'scenarioA', 'scenarioB'] as const

  return (
    <div className="space-y-1 pt-3 border-t" data-testid="scenario-legend">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        Comparing Three Scenarios
      </h4>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {scenarioKeys.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: SCENARIO_COLORS[key] }}
            />
            <span>
              <span className="font-medium text-foreground">{scenarioLabels[key].short}:</span>{' '}
              {scenarioLabels[key].full}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * ExecutiveSummary — the scorecard overview rendered at the very top of the
 * results view. Replaces the old "Financial Comparison" heading and scenario
 * legend with a verdict headline, structured comparison table, and optional
 * guardrail callout.
 *
 * Must be rendered inside both a ScenarioModelProvider and a
 * react-hook-form FormProvider.
 */
export function ExecutiveSummary() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()

  const verdict = useMemo(() => {
    if (!modelOutput) return null
    try {
      return generateScorecardVerdict(modelOutput, formValues as ScenarioInputs)
    } catch {
      // formValues may be incomplete during initial hydration from localStorage.
      // Gracefully return null — the component renders nothing until inputs stabilize.
      return null
    }
  }, [modelOutput, formValues])

  if (!verdict) {
    return null
  }

  const timeHorizon = (formValues as ScenarioInputs)?.projection?.timeHorizonYears ?? 10
  const { currentHomeName, newHomeName } = useHomeNames()
  const scenarioLabels = buildScenarioLabels(currentHomeName, newHomeName)

  return (
    <div
      className="rounded-lg bg-blue-50/30 dark:bg-blue-950/20 p-5 space-y-4"
      role="region"
      aria-label="Executive Summary"
      data-testid="executive-summary"
    >
      {/* Verdict headline */}
      <p className="text-base md:text-lg font-medium leading-relaxed text-foreground">
        {verdict.verdictText}
      </p>

      {/* Scorecard — table on desktop, stacked cards on mobile */}
      <ScorecardTable rows={verdict.scorecard} timeHorizon={timeHorizon} scenarioLabels={scenarioLabels} />
      <ScorecardCards rows={verdict.scorecard} timeHorizon={timeHorizon} scenarioLabels={scenarioLabels} />

      {/* Guardrail callout */}
      {verdict.guardrailCallout && (
        <Alert
          className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          data-testid="guardrail-callout"
        >
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {verdict.guardrailCallout}
          </AlertDescription>
        </Alert>
      )}

      {/* Scenario Legend */}
      <ScenarioLegend scenarioLabels={scenarioLabels} />
    </div>
  )
}
