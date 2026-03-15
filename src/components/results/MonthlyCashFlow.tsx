// ---------------------------------------------------------------------------
// MonthlyCashFlow.tsx — Monthly cash flow comparison cards
//
// Shows year 1 monthly cash flow for all three scenarios side by side.
// Each card includes:
//   - Headline cash flow number (best/worst case for Scenario B)
//   - 5-year sparkline trend
//   - Annual savings translation
//   - Early-years callout (tight months, negative cash flow warnings)
//   - Collapsible itemized breakdown showing where every dollar goes
//
// Consumes ModelOutput via useModelOutput() context — never calculates.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { LineChart, Line } from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import type { ScenarioOutput, CashFlowBreakdown } from '@/engine/types'

// ---- Scenario colors (consistent across the app) ----
const SCENARIO_COLORS = {
  baseline: '#6366f1', // Indigo
  scenarioA: '#10b981', // Emerald
  scenarioB: '#f59e0b', // Amber
} as const

type ScenarioKey = keyof typeof SCENARIO_COLORS

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

// ---- Sparkline ----

/**
 * Tiny line chart showing the 5-year trend of monthly cash flow.
 * No axes, grid, or legend — just the line shape to convey direction.
 * ~120px wide x 40px tall, using the scenario's color.
 */
function CashFlowSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, i) => ({ year: i + 1, value }))
  return (
    <div className="my-2">
      <LineChart width={120} height={40} data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  )
}

// ---- Annual translation ----

function AnnualTranslation({ monthlyCashFlow }: { monthlyCashFlow: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      = {formatCurrency(monthlyCashFlow * 12)}/yr savings capacity
    </p>
  )
}

// ---- Early-years callout ----

/**
 * Checks years 1-3 worst-case cash flow and renders a contextual callout
 * if the early years are tight or negative. This is the "can you survive
 * month-to-month?" signal.
 */
function EarlyYearsCallout({ scenario }: { scenario: ScenarioOutput }) {
  const snapshots = scenario.yearlySnapshots.slice(0, 3)
  if (snapshots.length === 0) return null

  const year1Worst = snapshots[0].monthlyCashFlowWorstCase
  const year3Worst = snapshots.length >= 3
    ? snapshots[2].monthlyCashFlowWorstCase
    : snapshots[snapshots.length - 1].monthlyCashFlowWorstCase

  // Check for negative cash flow in any of years 1-3
  const negativeYears = snapshots
    .filter((s) => s.monthlyCashFlowWorstCase < 0)
    .map((s) => s.year)

  if (negativeYears.length > 0) {
    const yearRange =
      negativeYears.length === 1
        ? `Year ${negativeYears[0]}`
        : `Years ${negativeYears[0]}-${negativeYears[negativeYears.length - 1]}`
    return (
      <p className="text-xs italic text-muted-foreground">
        Negative cash flow in {yearRange}. You&apos;d need to draw from savings.
      </p>
    )
  }

  // Check if year 1 is tight (< $500/mo worst case)
  if (year1Worst < 500) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Year 1 is tight &mdash; improves to {formatCurrency(year3Worst)}/mo by year 3 as salary grows
      </p>
    )
  }

  return null
}

// ---- Collapsible breakdown ----

/**
 * A single line in the breakdown: label on the left, formatted value on the right.
 * Expenses show with a "-" prefix, income with "+".
 */
function BreakdownLine({
  label,
  value,
  type,
}: {
  label: string
  value: number
  type: 'income' | 'expense'
}) {
  const prefix = type === 'income' ? '+' : '-'
  const displayValue = Math.abs(value)
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono tabular-nums">
        {prefix}
        {formatCurrency(displayValue)}
        <span className="text-muted-foreground">/mo</span>
      </span>
    </div>
  )
}

function BreakdownSectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold text-foreground mt-2 mb-0.5">{title}</p>
  )
}

/**
 * Collapsible cash flow breakdown for Baseline and Scenario A.
 * Shows income, housing costs, and other expenses.
 */
function SimpleBreakdown({ breakdown, cashFlow }: { breakdown: CashFlowBreakdown; cashFlow: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {open ? 'Hide breakdown' : 'See breakdown'}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-0">
          <BreakdownSectionHeader title="Income" />
          <BreakdownLine label="Take-home pay" value={breakdown.takeHomePay} type="income" />

          <BreakdownSectionHeader title="Housing" />
          <BreakdownLine label="Mortgage P&I" value={breakdown.mortgagePI} type="expense" />
          <BreakdownLine label="Property Tax" value={breakdown.propertyTax} type="expense" />
          <BreakdownLine label="Insurance" value={breakdown.insurance} type="expense" />
          {breakdown.pmi > 0 && (
            <BreakdownLine label="PMI" value={breakdown.pmi} type="expense" />
          )}
          {breakdown.hoa > 0 && (
            <BreakdownLine label="HOA" value={breakdown.hoa} type="expense" />
          )}

          <BreakdownSectionHeader title="Other" />
          <BreakdownLine label="Living Expenses" value={breakdown.livingExpenses} type="expense" />
          {breakdown.debtPayments > 0 && (
            <BreakdownLine label="Debt Payments" value={breakdown.debtPayments} type="expense" />
          )}
          <BreakdownLine label="Commute" value={breakdown.commuteCost} type="expense" />

          <div className="border-t border-border mt-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Net Cash Flow</span>
              <span
                className={`text-xs font-semibold font-mono tabular-nums ${
                  cashFlow < 0 ? 'text-destructive' : ''
                }`}
              >
                {formatCurrency(cashFlow)}/mo
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Collapsible cash flow breakdown for Scenario B.
 * Includes an additional "Rental Property" section between Housing and Other.
 */
function RentalBreakdown({ breakdown, cashFlow }: { breakdown: CashFlowBreakdown; cashFlow: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {open ? 'Hide breakdown' : 'See breakdown'}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-0">
          <BreakdownSectionHeader title="Income" />
          <BreakdownLine label="Take-home pay" value={breakdown.takeHomePay} type="income" />

          <BreakdownSectionHeader title="Housing (Austin)" />
          <BreakdownLine label="Mortgage P&I" value={breakdown.mortgagePI} type="expense" />
          <BreakdownLine label="Property Tax" value={breakdown.propertyTax} type="expense" />
          <BreakdownLine label="Insurance" value={breakdown.insurance} type="expense" />
          {breakdown.pmi > 0 && (
            <BreakdownLine label="PMI" value={breakdown.pmi} type="expense" />
          )}

          <BreakdownSectionHeader title="Rental Property (Kyle)" />
          <BreakdownLine label="Rental Income" value={breakdown.rentalIncome} type="income" />
          <BreakdownLine label="Kyle Mortgage" value={breakdown.rentalMortgagePI} type="expense" />
          <BreakdownLine label="Kyle Property Tax" value={breakdown.rentalPropertyTax} type="expense" />
          <BreakdownLine label="Kyle Insurance" value={breakdown.rentalInsurance} type="expense" />
          <BreakdownLine label="Maintenance" value={breakdown.rentalMaintenance} type="expense" />
          {breakdown.rentalManagementFee > 0 && (
            <BreakdownLine label="Management Fee" value={breakdown.rentalManagementFee} type="expense" />
          )}
          {breakdown.rentalLandlordCosts > 0 && (
            <BreakdownLine label="Landlord Costs" value={breakdown.rentalLandlordCosts} type="expense" />
          )}

          <BreakdownSectionHeader title="Other" />
          <BreakdownLine label="Living Expenses" value={breakdown.livingExpenses} type="expense" />
          {breakdown.debtPayments > 0 && (
            <BreakdownLine label="Debt Payments" value={breakdown.debtPayments} type="expense" />
          )}
          <BreakdownLine label="Commute" value={breakdown.commuteCost} type="expense" />

          <div className="border-t border-border mt-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Net Cash Flow</span>
              <span
                className={`text-xs font-semibold font-mono tabular-nums ${
                  cashFlow < 0 ? 'text-destructive' : ''
                }`}
              >
                {formatCurrency(cashFlow)}/mo
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ---- Card components ----

/**
 * Card for Baseline and Scenario A — shows best-case monthly cash flow,
 * sparkline trend, annual translation, early-years callout, and
 * collapsible itemized breakdown.
 */
function SimpleScenarioCard({
  scenario,
  colorKey,
}: {
  scenario: ScenarioOutput
  colorKey: ScenarioKey
}) {
  const snapshot = scenario.yearlySnapshots[0]
  if (!snapshot) return null

  // Sparkline: first 5 years of best-case monthly cash flow
  const sparklineData = scenario.yearlySnapshots
    .slice(0, 5)
    .map((s) => s.monthlyCashFlowBestCase)

  const color = SCENARIO_COLORS[colorKey]

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

        <AnnualTranslation monthlyCashFlow={snapshot.monthlyCashFlowBestCase} />

        <CashFlowSparkline data={sparklineData} color={color} />

        <EarlyYearsCallout scenario={scenario} />

        <SimpleBreakdown
          breakdown={snapshot.cashFlowBreakdown}
          cashFlow={snapshot.monthlyCashFlowBestCase}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Card for Scenario B — shows both best-case and worst-case monthly
 * cash flow, sparkline, annual translation, early-years callout,
 * and collapsible rental breakdown.
 */
function RentalScenarioCard({ scenario }: { scenario: ScenarioOutput }) {
  const snapshot = scenario.yearlySnapshots[0]
  if (!snapshot) return null

  // Sparkline: first 5 years of best-case monthly cash flow
  const sparklineData = scenario.yearlySnapshots
    .slice(0, 5)
    .map((s) => s.monthlyCashFlowBestCase)

  const color = SCENARIO_COLORS.scenarioB

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

        <AnnualTranslation monthlyCashFlow={snapshot.monthlyCashFlowBestCase} />

        <CashFlowSparkline data={sparklineData} color={color} />

        <EarlyYearsCallout scenario={scenario} />

        <RentalBreakdown
          breakdown={snapshot.cashFlowBreakdown}
          cashFlow={snapshot.monthlyCashFlowBestCase}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Monthly Cash Flow Comparison — renders one card per scenario showing
 * year 1 monthly cash flow reality with sparklines, annual translations,
 * early-years callouts, and collapsible itemized breakdowns.
 *
 * This is the "can you actually afford this month-to-month?" view.
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
      <SimpleScenarioCard
        scenario={modelOutput.baseline}
        colorKey="baseline"
      />
      <SimpleScenarioCard
        scenario={modelOutput.scenarioA}
        colorKey="scenarioA"
      />
      <RentalScenarioCard scenario={modelOutput.scenarioB} />
    </div>
  )
}
