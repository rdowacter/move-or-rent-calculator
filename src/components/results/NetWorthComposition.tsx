// ---------------------------------------------------------------------------
// NetWorthComposition.tsx — Stacked area charts showing net worth composition
//
// Renders three side-by-side stacked area charts (one per scenario) showing
// how net worth is composed over time: liquid savings, IRA balance,
// current home equity, and new home equity.
// ---------------------------------------------------------------------------

import { useWatch } from 'react-hook-form'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  formatCurrency,
  formatCompactCurrency,
} from '@/utils/formatters'
import type { ScenarioInputs, YearlySnapshot } from '@/engine/types'

/**
 * Color palette for the stacked layers — consistent across all three charts
 * so the user can visually compare composition at a glance.
 */
const LAYER_COLORS = {
  liquidSavings: '#3b82f6',  // blue — cash and liquid savings
  ira: '#8b5cf6',            // violet — retirement accounts
  currentHomeEquity: '#f59e0b',  // amber — current home
  newHomeEquity: '#10b981',     // emerald — new home
} as const

/** Shape of each data point fed to the stacked area chart. */
interface CompositionDataPoint {
  year: number
  liquidSavings: number
  ira: number
  currentHomeEquity: number
  newHomeEquity: number
}

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

/** Transform yearly snapshots into the flat data structure Recharts expects. */
function toCompositionData(
  snapshots: YearlySnapshot[]
): CompositionDataPoint[] {
  return snapshots.map((s) => ({
    year: s.year,
    liquidSavings: Math.max(0, deriveLiquidSavings(s)),
    ira: Math.max(0, s.iraBalance),
    currentHomeEquity: Math.max(0, s.currentHomeEquity),
    newHomeEquity: Math.max(0, s.newHomeEquity),
  }))
}

/**
 * Custom tooltip showing all four layer values as full currency strings.
 */
function CompositionTooltipContent({
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

/** A single stacked area chart for one scenario. */
function ScenarioCompositionChart({
  title,
  data,
  currentHomeName,
  newHomeName,
}: {
  title: string
  data: CompositionDataPoint[]
  currentHomeName: string
  newHomeName: string
}) {
  return (
    <div>
      <h4 className="mb-2 text-center text-sm font-semibold">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(value: number) => formatCompactCurrency(value)}
            width={60}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CompositionTooltipContent />} />
          <Area
            type="monotone"
            dataKey="liquidSavings"
            name="Liquid Savings"
            stackId="1"
            stroke={LAYER_COLORS.liquidSavings}
            fill={LAYER_COLORS.liquidSavings}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="ira"
            name="IRA Balance"
            stackId="1"
            stroke={LAYER_COLORS.ira}
            fill={LAYER_COLORS.ira}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="currentHomeEquity"
            name={`${currentHomeName} Equity`}
            stackId="1"
            stroke={LAYER_COLORS.currentHomeEquity}
            fill={LAYER_COLORS.currentHomeEquity}
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="newHomeEquity"
            name={`${newHomeName} Equity`}
            stackId="1"
            stroke={LAYER_COLORS.newHomeEquity}
            fill={LAYER_COLORS.newHomeEquity}
            fillOpacity={0.7}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Net worth composition — three stacked area charts showing where wealth
 * lives (cash, retirement, real estate) for each scenario over time.
 *
 * Renders nothing if modelOutput is not yet available.
 */
export function NetWorthComposition() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()
  const currentHomeName = (formValues as ScenarioInputs)?.homeNames?.currentHomeName || 'Current Home'
  const newHomeName = (formValues as ScenarioInputs)?.homeNames?.newHomeName || 'New Home'

  if (!modelOutput) {
    return null
  }

  const { baseline, scenarioA, scenarioB } = modelOutput

  const baselineData = toCompositionData(baseline.yearlySnapshots)
  const scenarioAData = toCompositionData(scenarioA.yearlySnapshots)
  const scenarioBData = toCompositionData(scenarioB.yearlySnapshots)

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ScenarioCompositionChart title="Baseline" data={baselineData} currentHomeName={currentHomeName} newHomeName={newHomeName} />
        <ScenarioCompositionChart title="Scenario A" data={scenarioAData} currentHomeName={currentHomeName} newHomeName={newHomeName} />
        <ScenarioCompositionChart title="Scenario B" data={scenarioBData} currentHomeName={currentHomeName} newHomeName={newHomeName} />
      </div>

      {/* Shared legend rendered once below all three charts */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm text-muted-foreground">
        {[
          { label: 'Liquid Savings', color: LAYER_COLORS.liquidSavings },
          { label: 'IRA Balance', color: LAYER_COLORS.ira },
          { label: `${currentHomeName} Equity`, color: LAYER_COLORS.currentHomeEquity },
          { label: `${newHomeName} Equity`, color: LAYER_COLORS.newHomeEquity },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
