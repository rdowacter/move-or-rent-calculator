// ---------------------------------------------------------------------------
// SensitivitySection.tsx — Breakeven sensitivity analysis rendered after
// the verdict section. Shows how robust the recommendation is by displaying
// the value each key variable would need to reach before the recommendation
// flips.
//
// Because the analysis runs the full model ~50-100 times (binary search
// across 5 variables × 20 iterations each), computation is deferred behind
// a "Show Analysis" button to avoid blocking the UI on every input change.
//
// Consumes ModelOutput via useModelOutput() and form inputs via useWatch()
// to call analyzeSensitivity(). The analysis is NOT memoized on input
// changes — it only runs when the user explicitly requests it.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { useWatch } from 'react-hook-form'
import { ShieldCheck, ShieldAlert, TriangleAlert, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { generateVerdict } from '@/engine/verdict'
import { analyzeSensitivity } from '@/engine/sensitivity'
import type { ScenarioInputs, SensitivityResult, BreakevenResult } from '@/engine/types'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Value Formatting
// ---------------------------------------------------------------------------

/**
 * Formats a breakeven variable's value appropriately based on its name.
 * Rate variables (appreciation, vacancy, interest) display as percentages.
 * Dollar variables (rent, income) display as currency.
 */
function formatVariableValue(inputName: string, value: number): string {
  const rateVariables = ['Home appreciation rate', 'New home interest rate', 'Vacancy rate']
  if (rateVariables.includes(inputName)) {
    return formatPercent(value)
  }
  return formatCurrency(value)
}

// ---------------------------------------------------------------------------
// Margin Visual Treatment
// ---------------------------------------------------------------------------

const MARGIN_CONFIG: Record<
  BreakevenResult['margin'],
  { label: string; className: string; icon: typeof ShieldCheck }
> = {
  comfortable: {
    label: 'Comfortable buffer',
    className: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800',
    icon: ShieldCheck,
  },
  thin: {
    label: 'Thin margin',
    className: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800',
    icon: ShieldAlert,
  },
  at_risk: {
    label: 'At risk',
    className: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800',
    icon: TriangleAlert,
  },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Renders a single breakeven row — the variable name, current vs breakeven
 * value, consequence, and margin indicator badge.
 */
function BreakevenRow({ result }: { result: BreakevenResult }) {
  const marginConfig = MARGIN_CONFIG[result.margin]
  const MarginIcon = marginConfig.icon

  // Determine if this is a "holds regardless" result — when the consequence
  // says "Recommendation holds across all tested values"
  const holdsRegardless = result.consequence.startsWith('Recommendation holds')

  return (
    <div
      className="flex flex-col gap-2 py-3 border-b last:border-b-0"
      data-testid="breakeven-row"
    >
      {/* Variable name + margin badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-medium text-sm text-foreground">
          {result.inputName}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            marginConfig.className
          )}
          data-testid="margin-indicator"
          data-margin={result.margin}
        >
          <MarginIcon className="size-3" aria-hidden="true" />
          {marginConfig.label}
        </span>
      </div>

      {/* Current value → breakeven value, or "holds regardless" message */}
      {holdsRegardless ? (
        <p className="text-sm text-muted-foreground">
          Holds regardless of {result.inputName.toLowerCase()}
        </p>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <span>
            Currently {formatVariableValue(result.inputName, result.currentValue)}
          </span>
          <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
          <span>
            flips at {formatVariableValue(result.inputName, result.breakevenValue)}
          </span>
        </div>
      )}

      {/* Consequence */}
      {!holdsRegardless && (
        <p className="text-xs text-muted-foreground/80">
          {result.consequence}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * SensitivitySection — shows how robust the verdict recommendation is
 * by displaying breakeven thresholds for 5 key input variables.
 *
 * Computation is deferred behind a "Show Analysis" button because the
 * analysis runs the full model ~50-100 times. Once computed, results
 * are displayed until the user navigates away or inputs change enough
 * to produce a different verdict.
 *
 * Must be rendered inside both a ScenarioModelProvider and a
 * react-hook-form FormProvider.
 */
export function SensitivitySection() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()

  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleRunAnalysis = useCallback(() => {
    if (!modelOutput) return

    setIsAnalyzing(true)

    // Use requestAnimationFrame to allow the loading state to render
    // before the synchronous (but expensive) computation blocks the thread.
    requestAnimationFrame(() => {
      const verdict = generateVerdict(modelOutput, formValues as ScenarioInputs)
      const result = analyzeSensitivity(formValues as ScenarioInputs, verdict)
      setSensitivityResult(result)
      setIsAnalyzing(false)
    })
  }, [modelOutput, formValues])

  // Don't render if there's no model output yet
  if (!modelOutput) {
    return null
  }

  // Check if the verdict is 'none' — if so, nothing to analyze
  const verdict = generateVerdict(modelOutput, formValues as ScenarioInputs)
  if (verdict.recommendation === 'none') {
    return null
  }

  // If analysis hasn't been run yet, show the trigger button
  if (!sensitivityResult) {
    return (
      <div
        role="region"
        aria-label="Sensitivity analysis"
        data-testid="sensitivity-section"
      >
        <Card>
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              How Robust Is This Recommendation?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test how sensitive the recommendation is to changes in key assumptions like
              appreciation rates, rent, interest rates, and income.
            </p>
            <Button
              variant="outline"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              data-testid="run-sensitivity-button"
            >
              {isAnalyzing ? 'Analyzing...' : 'Show Sensitivity Analysis'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Analysis has been computed — render the results
  return (
    <div
      role="region"
      aria-label="Sensitivity analysis"
      data-testid="sensitivity-section"
    >
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <h3 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
            How Robust Is This Recommendation?
          </h3>

          {/* Summary line */}
          <p
            className="text-sm text-muted-foreground mb-3"
            data-testid="sensitivity-summary"
          >
            {sensitivityResult.summary}
          </p>

          {/* Breakeven rows */}
          {sensitivityResult.breakevens.length > 0 ? (
            <div data-testid="breakeven-list">
              {sensitivityResult.breakevens.map((breakeven) => (
                <BreakevenRow key={breakeven.inputName} result={breakeven} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No variables to analyze.
            </p>
          )}

          {/* Re-run button */}
          <div className="mt-3 pt-3 border-t text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              data-testid="rerun-sensitivity-button"
            >
              {isAnalyzing ? 'Analyzing...' : 'Re-run Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
