// ---------------------------------------------------------------------------
// NetWorthBreakdown.tsx — Table showing net worth composition by scenario
//
// Renders a breakdown table showing where each scenario's final-year net worth
// comes from: IRA balance, current home equity, and new home equity.
// Displayed below the Net Worth Projection chart for detailed comparison.
// ---------------------------------------------------------------------------

import { useModelOutput } from '@/components/ScenarioModelProvider'
import { formatCurrency } from '@/utils/formatters'
import type { YearlySnapshot } from '@/engine/types'

/**
 * Returns the last element of a YearlySnapshot array, representing the
 * final year of the projection. Returns null if the array is empty.
 */
function getFinalSnapshot(
  snapshots: YearlySnapshot[]
): YearlySnapshot | null {
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
}

/**
 * Formats a dollar value for display, or returns "—" if the value is
 * zero or effectively zero (component doesn't apply to this scenario).
 */
function formatOrDash(value: number): string {
  return value > 0 ? formatCurrency(value) : '\u2014'
}

/**
 * Net worth breakdown table — shows the composition of each scenario's
 * net worth at the final year of the projection horizon.
 *
 * Renders nothing if modelOutput is not yet available.
 */
export function NetWorthBreakdown() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  const { baseline, scenarioA, scenarioB } = modelOutput

  const baselineFinal = getFinalSnapshot(baseline.yearlySnapshots)
  const scenarioAFinal = getFinalSnapshot(scenarioA.yearlySnapshots)
  const scenarioBFinal = getFinalSnapshot(scenarioB.yearlySnapshots)

  // Guard against empty snapshot arrays (shouldn't happen in practice)
  if (!baselineFinal || !scenarioAFinal || !scenarioBFinal) {
    return null
  }

  const rows = [
    {
      label: 'IRA Balance',
      baseline: formatCurrency(baselineFinal.iraBalance),
      scenarioA: formatCurrency(scenarioAFinal.iraBalance),
      scenarioB: formatCurrency(scenarioBFinal.iraBalance),
      isBold: false,
    },
    {
      label: 'Current Home Equity',
      // Baseline keeps current home; Scenario A sells it (no equity); Scenario B keeps as rental
      baseline: formatCurrency(baselineFinal.currentHomeEquity),
      scenarioA: formatOrDash(scenarioAFinal.currentHomeEquity),
      scenarioB: formatCurrency(scenarioBFinal.currentHomeEquity),
      isBold: false,
    },
    {
      label: 'New Home Equity',
      // Baseline has no new home; Scenario A and B both buy new home
      baseline: formatOrDash(baselineFinal.newHomeEquity),
      scenarioA: formatCurrency(scenarioAFinal.newHomeEquity),
      scenarioB: formatCurrency(scenarioBFinal.newHomeEquity),
      isBold: false,
    },
    {
      label: 'Total Net Worth',
      baseline: formatCurrency(baselineFinal.netWorth),
      scenarioA: formatCurrency(scenarioAFinal.netWorth),
      scenarioB: formatCurrency(scenarioBFinal.netWorth),
      isBold: true,
    },
  ]

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="net-worth-breakdown">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">
                Component
              </th>
              <th className="pb-2 px-4 text-right font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                  Baseline
                </span>
              </th>
              <th className="pb-2 px-4 text-right font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                  Scenario A
                </span>
              </th>
              <th className="pb-2 pl-4 text-right font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                  Scenario B
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={
                  row.isBold ? 'border-t font-semibold' : 'border-b hover:bg-muted/50 transition-colors'
                }
              >
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 px-4 text-right">{row.baseline}</td>
                <td className="py-2 px-4 text-right">{row.scenarioA}</td>
                <td className="py-2 pl-4 text-right">{row.scenarioB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
