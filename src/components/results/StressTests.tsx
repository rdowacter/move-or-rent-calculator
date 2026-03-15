// ---------------------------------------------------------------------------
// StressTests.tsx — What-if stress test cards for Scenario B.
//
// Shows three concrete failure scenarios with plain-language narratives:
//   1. Vacancy + Major Repair — rental sits empty 3 months AND $8k repair
//   2. Income Disruption — 20% income drop for 6 months
//   3. Market Downturn — 10% home value decline
//
// Stress tests are computed inline from the engine's stressTest() function
// using data available in ModelOutput. Only displayed for Scenario B since
// stress tests are most relevant for the dual-mortgage, landlord scenario.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { stressTest } from '@/engine/capital'
import type { StressTestResult } from '@/engine/types'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/lib/utils'

// ---- Severity classification ------------------------------------------------

type Severity = 'survivable' | 'tight' | 'crisis'

const severityStyles: Record<Severity, { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  survivable: {
    bg: 'bg-green-50/60 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-900',
    badgeText: 'text-green-700 dark:text-green-300',
    label: 'Survivable',
  },
  tight: {
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 dark:bg-amber-900',
    badgeText: 'text-amber-700 dark:text-amber-300',
    label: 'Tight',
  },
  crisis: {
    bg: 'bg-red-50/60 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900',
    badgeText: 'text-red-700 dark:text-red-300',
    label: 'Crisis',
  },
}

// ---- Severity classifiers for each stress scenario --------------------------

/**
 * Vacancy + Maintenance: months of reserves remaining after shock.
 * >= 6 months remaining = survivable (meets emergency fund guidance)
 * 1-6 months = tight (one more surprise could tip into crisis)
 * < 1 month or 0 = crisis (shock alone wipes out reserves)
 */
function classifyVacancy(monthsOfReserves: number): Severity {
  if (monthsOfReserves >= 6) return 'survivable'
  if (monthsOfReserves >= 1) return 'tight'
  return 'crisis'
}

/**
 * Income Disruption: months until reserves are exhausted at reduced income.
 * >= 12 months = survivable (enough time to find new work or adjust)
 * 3-12 months = tight (pressure to resolve quickly)
 * < 3 months = crisis (near-immediate financial distress)
 */
function classifyIncome(monthsUntilCrisis: number): Severity {
  if (monthsUntilCrisis >= 12 || monthsUntilCrisis === Infinity) return 'survivable'
  if (monthsUntilCrisis >= 3) return 'tight'
  return 'crisis'
}

/**
 * Market Downturn: whether the property goes underwater.
 * Positive equity after drop = survivable
 * Underwater but forced sale loss < $10k = tight
 * Underwater with significant forced sale loss = crisis
 */
function classifyMarket(underwaterBy: number, forcedSaleLoss: number): Severity {
  if (underwaterBy === 0) return 'survivable'
  if (forcedSaleLoss < 10_000) return 'tight'
  return 'crisis'
}

// ---- Stress test card component ---------------------------------------------

interface StressCardProps {
  title: string
  description: string
  severity: Severity
  children: React.ReactNode
  testId: string
}

function StressCard({ title, description, severity, children, testId }: StressCardProps) {
  const style = severityStyles[severity]

  return (
    <Card
      data-testid={testId}
      data-severity={severity}
      className={cn('border', style.border, style.bg)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{title}</CardTitle>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              style.badge,
              style.badgeText,
            )}
            role="status"
            aria-label={`Severity: ${style.label}`}
          >
            {style.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  )
}

// ---- Metric row helper ------------------------------------------------------

interface MetricRowProps {
  label: string
  value: string
  emphasis?: boolean
}

function MetricRow({ label, value, emphasis }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', emphasis && 'font-semibold')}>{value}</span>
    </div>
  )
}

// ---- Main component ---------------------------------------------------------

/**
 * What-if stress test section for Scenario B.
 *
 * Computes stress test results from the engine's stressTest() function
 * using Scenario B's upfrontCapital, yearlySnapshots, and currentHome data.
 * Returns null when modelOutput is not yet available.
 */
export function StressTests() {
  const { modelOutput } = useModelOutput()

  // Compute stress test results from available Scenario B data.
  // The engine's stressTest() is a pure function — safe to call in useMemo.
  const stressResult: StressTestResult | null = useMemo(() => {
    if (!modelOutput) return null

    const { scenarioB } = modelOutput
    const year1 = scenarioB.yearlySnapshots[0]
    if (!year1) return null

    // Monthly gross income from year 1 snapshot
    const monthlyGrossIncome = year1.annualGrossIncome / 12

    // Monthly obligations: derive from best-case cash flow.
    // bestCase = (grossIncome/12 - federalTax/12) - obligations + rentalCashFlow
    // We need obligations for the stress test. We can approximate:
    // monthlyNetPosition = monthlyCashFlowBestCase (this is what scenarios.ts uses)
    const monthlyNetPosition = year1.monthlyCashFlowBestCase

    // Monthly rent from rental gross income (year 1)
    const monthlyRent = year1.rentalGrossIncome
      ? year1.rentalGrossIncome / 12 / (1 - 0.08) // Undo vacancy adjustment to get gross rent
      : 0

    // Post-closing reserves = upfront capital surplus (clamped to 0)
    const postClosingReserves = Math.max(0, scenarioB.upfrontCapital.surplus)

    // Monthly obligations: gross income minus net position gives us total outflows
    // monthlyNetPosition = netIncome - obligations + rentalCashFlow
    // For the stress test, we need the raw obligations figure.
    // We approximate: obligations = monthlyGrossIncome - monthlyNetPosition
    // This is conservative because it includes tax withholding in "obligations"
    const monthlyObligations = monthlyGrossIncome - monthlyNetPosition

    // Home value and mortgage for market downturn test
    // Use year 0 (pre-appreciation) values from the snapshot structure
    // currentHomeEquity = homeValue - mortgageBalance, and we have mortgageBalance
    const homeValue = year1.currentHomeEquity + year1.currentHomeMortgageBalance
    const mortgageBalance = year1.currentHomeMortgageBalance

    return stressTest({
      postClosingReserves,
      monthlyNetPosition,
      monthlyRent,
      monthlyGrossIncome,
      monthlyObligations,
      homeValue,
      mortgageBalance,
      sellingCostRate: 0.06, // Standard TX selling cost rate
    })
  }, [modelOutput])

  if (!stressResult) return null

  const { vacancy, majorRepair, incomeDisruption, marketDownturn } = stressResult

  const vacancySeverity = classifyVacancy(vacancy.monthsOfReserves)
  const repairSeverity = classifyVacancy(majorRepair.monthsOfReserves)
  const incomeSeverity = classifyIncome(incomeDisruption.monthsUntilCrisis)
  const marketSeverity = classifyMarket(marketDownturn.underwaterBy, marketDownturn.forcedSaleLoss)

  const formatMonths = (months: number): string => {
    if (months === Infinity) return 'Unlimited'
    if (months === 0) return '0'
    return months.toFixed(1)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="stress-tests">
      {/* Vacancy */}
      <StressCard
        title="3-Month Vacancy"
        description="What if your rental sits empty for 3 months between tenants?"
        severity={vacancySeverity}
        testId="stress-vacancy"
      >
        <MetricRow
          label="Lost rent"
          value={formatCurrency(vacancy.shockCost)}
          emphasis
        />
        <MetricRow
          label="Reserves remaining"
          value={
            vacancy.monthsOfReserves === Infinity
              ? 'Unlimited'
              : `${formatMonths(vacancy.monthsOfReserves)} months`
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {vacancySeverity === 'survivable'
            ? 'You can absorb this vacancy and still have adequate reserves.'
            : vacancySeverity === 'tight'
              ? 'You could absorb this, but your reserves would be thin afterward.'
              : 'This vacancy alone would wipe out your reserves.'}
        </p>
      </StressCard>

      {/* Major Repair */}
      <StressCard
        title="Major Repair"
        description="What if you need an $8,000 repair — HVAC, roof, or plumbing?"
        severity={repairSeverity}
        testId="stress-repair"
      >
        <MetricRow
          label="Repair cost"
          value={formatCurrency(majorRepair.shockCost)}
          emphasis
        />
        <MetricRow
          label="Reserves remaining"
          value={
            majorRepair.monthsOfReserves === Infinity
              ? 'Unlimited'
              : `${formatMonths(majorRepair.monthsOfReserves)} months`
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {repairSeverity === 'survivable'
            ? 'You can cover this repair and still have adequate reserves.'
            : repairSeverity === 'tight'
              ? 'You could cover this, but your reserves would be thin afterward.'
              : 'This repair would wipe out your reserves.'}
        </p>
      </StressCard>

      {/* Income Disruption */}
      <StressCard
        title="Income Disruption"
        description="What if your income drops 20% for 6 months?"
        severity={incomeSeverity}
        testId="stress-income"
      >
        <MetricRow
          label="Reduced monthly income"
          value={formatCurrency(incomeDisruption.reducedMonthlyIncome)}
        />
        <MetricRow
          label="Monthly shortfall"
          value={
            incomeDisruption.monthlyShortfall === 0
              ? 'None'
              : formatCurrency(incomeDisruption.monthlyShortfall)
          }
          emphasis
        />
        <MetricRow
          label="Months until reserves exhausted"
          value={formatMonths(incomeDisruption.monthsUntilCrisis)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {incomeSeverity === 'survivable'
            ? 'Even at reduced income, you have enough runway to recover.'
            : incomeSeverity === 'tight'
              ? 'A prolonged income drop would put serious pressure on your finances.'
              : 'Reserves would run out fast. You would need to sell a property or take on debt.'}
        </p>
      </StressCard>

      {/* Market Downturn */}
      <StressCard
        title="Market Downturn"
        description="What if home values drop 10%?"
        severity={marketSeverity}
        testId="stress-market"
      >
        <MetricRow
          label="Current equity"
          value={formatCurrency(marketDownturn.currentEquity)}
        />
        <MetricRow
          label="Equity after decline"
          value={formatCurrency(marketDownturn.newEquity)}
          emphasis
        />
        {marketDownturn.underwaterBy > 0 && (
          <>
            <MetricRow
              label="Underwater by"
              value={formatCurrency(marketDownturn.underwaterBy)}
            />
            <MetricRow
              label="Forced-sale loss"
              value={formatCurrency(marketDownturn.forcedSaleLoss)}
            />
          </>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {marketSeverity === 'survivable'
            ? 'You retain positive equity even after a 10% decline. No forced-sale risk.'
            : marketSeverity === 'tight'
              ? 'The property would be underwater, but the loss on a forced sale is manageable.'
              : 'A market decline would leave you underwater with a significant loss if forced to sell.'}
        </p>
      </StressCard>
    </div>
  )
}
