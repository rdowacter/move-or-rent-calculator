// ---------------------------------------------------------------------------
// MonthlyCashFlow.tsx — Monthly cash flow comparison cards
//
// Shows year 1 monthly cash flow for all three scenarios side by side.
// Scenario B displays both best-case and worst-case because rental income
// introduces variability (vacancy, maintenance, turnover costs).
//
// Consumes ModelOutput via useModelOutput() context — never calculates.
// ---------------------------------------------------------------------------

import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { formatCurrency } from '@/utils/formatters'
import type { ScenarioOutput } from '@/engine/types'

/**
 * Renders a single metric row with a label and a formatted currency value.
 * Negative values receive the `text-destructive` class to visually flag
 * cash flow shortfalls — the most critical information in this view.
 */
function CashFlowMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-lg font-semibold ${value < 0 ? 'text-destructive' : ''}`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  )
}

/**
 * Card for Baseline and Scenario A — shows only the best-case monthly
 * cash flow since these scenarios have no rental income variability.
 */
function SimpleScenarioCard({ scenario }: { scenario: ScenarioOutput }) {
  const snapshot = scenario.yearlySnapshots[0]
  if (!snapshot) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CashFlowMetric
          label="Monthly cash flow"
          value={snapshot.monthlyCashFlowBestCase}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Annual income</span>
          <span className="text-sm">{formatCurrency(snapshot.annualGrossIncome)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Card for Scenario B — shows both best-case and worst-case monthly
 * cash flow because rental property income is subject to vacancy,
 * maintenance events, and turnover costs.
 */
function RentalScenarioCard({ scenario }: { scenario: ScenarioOutput }) {
  const snapshot = scenario.yearlySnapshots[0]
  if (!snapshot) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CashFlowMetric
          label="Best case"
          value={snapshot.monthlyCashFlowBestCase}
        />
        <CashFlowMetric
          label="Worst case"
          value={snapshot.monthlyCashFlowWorstCase}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Annual income</span>
          <span className="text-sm">{formatCurrency(snapshot.annualGrossIncome)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Monthly Cash Flow Comparison — renders one card per scenario showing
 * year 1 monthly cash flow reality. This is the "can you actually afford
 * this month-to-month?" view.
 *
 * Cards stack horizontally on desktop (3-column grid) and vertically on mobile.
 */
export function MonthlyCashFlow() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SimpleScenarioCard scenario={modelOutput.baseline} />
      <SimpleScenarioCard scenario={modelOutput.scenarioA} />
      <RentalScenarioCard scenario={modelOutput.scenarioB} />
    </div>
  )
}
