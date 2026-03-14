// ---------------------------------------------------------------------------
// NetWorthChart.tsx — Net worth projection chart comparing all three scenarios
//
// Renders a Recharts LineChart with three lines (Baseline, Scenario A,
// Scenario B) showing projected net worth over the time horizon.
// Consumes ModelOutput from ScenarioModelProvider context.
// ---------------------------------------------------------------------------

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  formatCurrency,
  formatCompactCurrency,
} from '@/utils/formatters'

/**
 * Recharts renders colors as SVG stroke/fill attributes, not CSS properties,
 * so CSS custom properties (var(--chart-N)) don't resolve. We must use
 * concrete color values here. These match the --chart-N tokens in index.css.
 */
const CHART_COLORS = {
  baseline: '#6366f1',   // indigo — the "status quo" line
  scenarioA: '#10b981',  // emerald green — the "sell and simplify" option
  scenarioB: '#f59e0b',  // amber — the "risky rental" option, caution connotation
}

/** Shape of each data point fed to the chart. */
interface ChartDataPoint {
  year: number
  baseline: number
  scenarioA: number
  scenarioB: number
}

/**
 * Custom tooltip formatter that shows all three scenario values as full
 * currency strings (e.g. "$247,832") for precise reading on hover/tap.
 */
function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">Year {label}</p>
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
 * Net worth projection chart — shows how each scenario's total net worth
 * evolves year-by-year over the projection horizon.
 *
 * Renders nothing if modelOutput is not yet available (before first computation).
 */
export function NetWorthChart() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  const { baseline, scenarioA, scenarioB } = modelOutput

  // Transform yearly snapshots into the flat data structure Recharts expects.
  // All three scenarios have the same number of yearly snapshots.
  const data: ChartDataPoint[] = baseline.yearlySnapshots.map(
    (snapshot, index) => ({
      year: snapshot.year,
      baseline: snapshot.netWorth,
      scenarioA: scenarioA.yearlySnapshots[index]?.netWorth ?? 0,
      scenarioB: scenarioB.yearlySnapshots[index]?.netWorth ?? 0,
    })
  )

  return (
    <div className="w-full" role="img" aria-label="Net worth projection chart comparing Baseline, Scenario A, and Scenario B over time">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="year"
            label={{
              value: 'Year',
              position: 'insideBottomRight',
              offset: -5,
            }}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactCurrency(value)}
            width={70}
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke={CHART_COLORS.baseline}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="scenarioA"
            name="Scenario A"
            stroke={CHART_COLORS.scenarioA}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="scenarioB"
            name="Scenario B"
            stroke={CHART_COLORS.scenarioB}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
