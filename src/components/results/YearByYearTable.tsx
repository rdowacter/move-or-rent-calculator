// ---------------------------------------------------------------------------
// YearByYearTable.tsx — Tabbed year-by-year financial detail table
//
// Renders a tabbed interface (Baseline / Scenario A / Scenario B) with a
// scrollable table showing detailed yearly numbers for each scenario.
// Provides the granular view that power users and financial advisors need.
// ---------------------------------------------------------------------------

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { formatCurrency } from '@/utils/formatters'
import type { YearlySnapshot } from '@/engine/types'
import { cn } from '@/lib/utils'

/**
 * Derive liquid savings from the snapshot.
 * Liquid savings = netWorth - iraBalance - currentHomeEquity - newHomeEquity
 * This captures cash, savings accounts, and any other non-retirement, non-real-estate wealth.
 */
function deriveLiquidSavings(snapshot: YearlySnapshot): number {
  return (
    snapshot.netWorth -
    snapshot.iraBalance -
    snapshot.currentHomeEquity -
    snapshot.newHomeEquity
  )
}

/** Format a currency value, applying destructive styling for negatives. */
function CurrencyCell({
  value,
  bold = false,
}: {
  value: number
  bold?: boolean
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-1.5 text-right text-sm',
        value < 0 && 'text-destructive',
        bold && 'font-bold'
      )}
    >
      {formatCurrency(value)}
    </td>
  )
}

/**
 * Format a value as currency, or show an em dash if the value is zero
 * (indicating the component doesn't apply to this scenario).
 */
function CurrencyOrDashCell({ value }: { value: number }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-1.5 text-right text-sm',
        value < 0 && 'text-destructive'
      )}
    >
      {value === 0 ? '\u2014' : formatCurrency(value)}
    </td>
  )
}

/** Column header definitions for the year-by-year table. */
const COLUMNS = [
  { key: 'year', label: 'Year', align: 'left' as const },
  { key: 'income', label: 'Income', align: 'right' as const },
  { key: 'cashFlow', label: 'Monthly Cash Flow', align: 'right' as const },
  { key: 'liquid', label: 'Liquid Savings', align: 'right' as const },
  { key: 'ira', label: 'IRA Balance', align: 'right' as const },
  { key: 'currentHome', label: 'Current Home Equity', align: 'right' as const },
  { key: 'newHome', label: 'New Home Equity', align: 'right' as const },
  { key: 'netWorth', label: 'Net Worth', align: 'right' as const },
] as const

/** Render the table for a single scenario's yearly snapshots. */
function ScenarioTable({
  snapshots,
  scenarioKey,
}: {
  snapshots: YearlySnapshot[]
  scenarioKey: 'baseline' | 'scenarioA' | 'scenarioB'
}) {
  /**
   * Determine which equity columns show dashes vs values:
   * - Baseline: no new home equity (stays in current home only)
   * - Scenario A: no current home equity (sells current home)
   * - Scenario B: both equities present
   */
  const showCurrentHomeEquityAsDash = scenarioKey === 'scenarioA'
  const showNewHomeEquityAsDash = scenarioKey === 'baseline'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" data-testid={`year-by-year-${scenarioKey}`}>
        <thead>
          <tr className="bg-muted/50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.key === 'year' && 'sticky left-0 z-10 bg-muted/50'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr
              key={snapshot.year}
              className="border-b border-border/40 even:bg-muted/20"
            >
              {/* Year — sticky first column */}
              <td className="sticky left-0 z-10 whitespace-nowrap bg-background px-3 py-1.5 text-sm font-medium even:bg-muted/20">
                {snapshot.year}
              </td>
              <CurrencyCell value={snapshot.annualGrossIncome} />
              <CurrencyCell value={snapshot.monthlyCashFlowBestCase} />
              <CurrencyCell value={deriveLiquidSavings(snapshot)} />
              <CurrencyCell value={snapshot.iraBalance} />
              {showCurrentHomeEquityAsDash ? (
                <CurrencyOrDashCell value={snapshot.currentHomeEquity} />
              ) : (
                <CurrencyCell value={snapshot.currentHomeEquity} />
              )}
              {showNewHomeEquityAsDash ? (
                <CurrencyOrDashCell value={snapshot.newHomeEquity} />
              ) : (
                <CurrencyCell value={snapshot.newHomeEquity} />
              )}
              <CurrencyCell value={snapshot.netWorth} bold />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Year-by-year detail table — tabbed interface showing detailed yearly
 * financial numbers for each scenario.
 *
 * Renders nothing if modelOutput is not yet available.
 */
export function YearByYearTable() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  const { baseline, scenarioA, scenarioB } = modelOutput

  return (
    <div className="w-full">
      <Tabs defaultValue="baseline">
        <TabsList className="mb-4">
          <TabsTrigger value="baseline">Baseline</TabsTrigger>
          <TabsTrigger value="scenarioA">Scenario A</TabsTrigger>
          <TabsTrigger value="scenarioB">Scenario B</TabsTrigger>
        </TabsList>
        <TabsContent value="baseline">
          <ScenarioTable
            snapshots={baseline.yearlySnapshots}
            scenarioKey="baseline"
          />
        </TabsContent>
        <TabsContent value="scenarioA">
          <ScenarioTable
            snapshots={scenarioA.yearlySnapshots}
            scenarioKey="scenarioA"
          />
        </TabsContent>
        <TabsContent value="scenarioB">
          <ScenarioTable
            snapshots={scenarioB.yearlySnapshots}
            scenarioKey="scenarioB"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
