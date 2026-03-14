// ---------------------------------------------------------------------------
// IRATrajectoryChart.tsx — Visualizes IRA balance trajectory over time
// for Scenario A vs Scenario B.
//
// Baseline is omitted because its IRA trajectory is identical to Scenario A
// (both keep the IRA intact and contributing). The key insight this chart
// reveals is the growing retirement gap caused by the early IRA withdrawal
// in Scenario B — even with resumed contributions, the lost compounding
// on the initial balance creates a gap that widens every year.
// ---------------------------------------------------------------------------

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  formatCurrency,
  formatCompactCurrency,
} from '@/utils/formatters'

/** Chart color for Scenario A — IRA kept intact + contributing. */
const SCENARIO_A_COLOR = '#2563eb' // Blue-600
/** Chart color for Scenario B — IRA withdrawn, rebuilding from zero. */
const SCENARIO_B_COLOR = '#dc2626' // Red-600

interface ChartDataPoint {
  year: number
  scenarioA: number
  scenarioB: number
}

/**
 * Custom tooltip that shows formatted currency values for each scenario
 * at the hovered year.
 */
function IRATooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; color: string; name: string }>
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1 text-sm font-medium text-gray-700">Year {label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-sm"
          style={{ color: entry.color }}
        >
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

/**
 * IRA trajectory chart comparing Scenario A and Scenario B IRA balances
 * over the projection period. Includes a text callout below the chart
 * showing the dollar gap at the final year.
 */
export function IRATrajectoryChart() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  const { scenarioA, scenarioB } = modelOutput

  // Guard against empty yearlySnapshots arrays
  if (scenarioA.yearlySnapshots.length === 0 || scenarioB.yearlySnapshots.length === 0) {
    return null
  }

  // Build the chart data by zipping Scenario A and B yearly snapshots
  const chartData: ChartDataPoint[] = scenarioA.yearlySnapshots.map(
    (snapshot, index) => ({
      year: snapshot.year,
      scenarioA: snapshot.iraBalance,
      scenarioB: scenarioB.yearlySnapshots[index]?.iraBalance ?? 0,
    })
  )

  if (chartData.length === 0) {
    return null
  }

  // Calculate the gap at the final year for the callout
  const finalIndex = chartData.length - 1
  const finalYear = chartData[finalIndex].year
  const gap =
    chartData[finalIndex].scenarioA - chartData[finalIndex].scenarioB

  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        IRA Balance Trajectory
      </h3>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              label={{
                value: 'Year',
                position: 'insideBottomRight',
                offset: -5,
              }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value: number) =>
                formatCompactCurrency(value)
              }
              tick={{ fontSize: 12 }}
              width={65}
            />
            <Tooltip content={<IRATooltipContent />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="scenarioA"
              name="Scenario A"
              stroke={SCENARIO_A_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="scenarioB"
              name="Scenario B"
              stroke={SCENARIO_B_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dollar gap callout — highlights the retirement cost of the early withdrawal */}
      <p className="mt-3 text-center text-sm text-gray-600">
        Scenario A IRA is {formatCurrency(Math.abs(gap))} higher at year{' '}
        {finalYear}
      </p>
    </div>
  )
}
