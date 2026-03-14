// ---------------------------------------------------------------------------
// ResultsSections.tsx — Wrapper component that renders all results sections
// in a logical order with consistent spacing and visual grouping.
//
// Three visual groups:
//   1. Risk Signals — warnings with a subtle red-tinted background
//   2. Long-Range Projections — net worth and IRA charts on muted background
//   3. Year-1 Execution — cash flow, capital, and reserves on default background
// ---------------------------------------------------------------------------

import { AlertTriangle, TrendingUp, PiggyBank, DollarSign, Wallet, Shield, Calendar } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { FormField } from '@/components/FormField'
import { ResultSection } from './ResultSection'
import { NetWorthChart } from './NetWorthChart'
import { NetWorthBreakdown } from './NetWorthBreakdown'
import { IRATrajectoryChart } from './IRATrajectoryChart'
import { MonthlyCashFlow } from './MonthlyCashFlow'
import { UpfrontCapital } from './UpfrontCapital'
import { ReserveRunway } from './ReserveRunway'
import { WarningsList } from './WarningsList'

/**
 * Renders all results sections in order with consistent spacing and
 * visual grouping via background colors and accent bars.
 *
 * Must be rendered inside a ScenarioModelProvider so child components
 * can access the model output via useModelOutput().
 */
export function ResultsSections() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-10" data-testid="results-sections">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Financial Comparison</h2>
        <p className="text-sm text-muted-foreground">Based on your inputs, here&apos;s how each scenario plays out</p>
      </div>

      {/* Projection Controls — right at the top of results where they belong */}
      <div className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-1 flex-wrap gap-4">
          <div className="min-w-[140px] flex-1">
            <FormField
              name="projection.timeHorizonYears"
              label="Time Horizon"
              control={control}
              type="number"
              inputMode="numeric"
              description="Years to project"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <FormField
              name="projection.plannedRentalExitYear"
              label="Rental Exit Year"
              control={control}
              type="number"
              inputMode="numeric"
              description="Year to sell rental"
            />
          </div>
        </div>
      </div>

      {/* Group 1: Risk Signals */}
      <div className="rounded-lg bg-red-50/40 p-5 dark:bg-red-950/20">
        <ResultSection icon={AlertTriangle} title="Warnings & Risks" accentColor="border-red-400" iconColor="text-red-500">
          <WarningsList />
        </ResultSection>
      </div>

      {/* Scenario Legend */}
      <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
        <h3 className="text-sm font-semibold">Comparing Three Scenarios</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#6366f1' }} />
            <span><span className="font-medium text-foreground">Baseline:</span> Stay
            in Kyle, keep the IRA, keep commuting</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span><span className="font-medium text-foreground">Scenario A:</span>{' '}
            Sell Kyle, buy Austin, keep IRA intact + contributing</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span><span className="font-medium text-foreground">Scenario B:</span>{' '}
            Keep Kyle as rental, withdraw IRA for down payment, buy Austin</span>
          </li>
        </ul>
      </div>

      {/* Group 2: Long-Range Projections */}
      <div className="space-y-8 rounded-lg bg-muted/30 p-5">
        <ResultSection icon={TrendingUp} title="Net Worth Over Time" description="Projected total net worth across all assets" accentColor="border-violet-400" iconColor="text-violet-500">
          <NetWorthChart />
          <div className="mt-6 border-t pt-6">
            <NetWorthBreakdown />
          </div>
        </ResultSection>

        <ResultSection icon={PiggyBank} title="Retirement Account Trajectory" description="IRA balance comparison — the cost of early withdrawal" accentColor="border-emerald-400" iconColor="text-emerald-500">
          <IRATrajectoryChart />
        </ResultSection>
      </div>

      {/* Group 3: Year-1 Execution */}
      <div className="space-y-8">
        <ResultSection icon={DollarSign} title="Monthly Cash Flow" description="Year 1 income vs. expenses — can you afford this month to month?" accentColor="border-blue-400" iconColor="text-blue-500">
          <MonthlyCashFlow />
        </ResultSection>

        <ResultSection icon={Wallet} title="Upfront Capital Requirements" description="Cash needed on day one and where it comes from" accentColor="border-blue-400" iconColor="text-blue-500">
          <UpfrontCapital />
        </ResultSection>

        <ResultSection icon={Shield} title="Reserve Runway" description="How long your savings last if income stops" accentColor="border-blue-400" iconColor="text-blue-500">
          <ReserveRunway />
        </ResultSection>
      </div>
    </div>
  )
}
