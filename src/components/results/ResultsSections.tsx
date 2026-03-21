// ---------------------------------------------------------------------------
// ResultsSections.tsx — Wrapper component that renders all results sections
// in a logical order with consistent spacing and visual grouping.
//
// Five visual groups ordered by decision flow:
//   1. Executive Summary — verdict scorecard with feasibility badges (accent bg)
//   2. Feasibility — upfront capital and monthly cash flow (default bg)
//   3. Risk Signals — warnings and stress tests (red-tinted bg)
//   4. Long-Range Projections — net worth, IRA, composition, year-by-year (muted bg)
//   5. Assumptions & Sources (default bg)
// ---------------------------------------------------------------------------

import { ExecutiveSummary } from './ExecutiveSummary'
import { AlertTriangle, TrendingUp, PiggyBank, DollarSign, Wallet, Calendar, Layers, Table2, BookOpen } from 'lucide-react'
import { useFormContext, Controller } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { Slider } from '@/components/ui/slider'
import { ResultSection } from './ResultSection'
import { ResultsGate } from './ResultsGate'
import { NetWorthChart } from './NetWorthChart'
import { NetWorthBreakdown } from './NetWorthBreakdown'
import { IRATrajectoryChart } from './IRATrajectoryChart'
import { MonthlyCashFlow } from './MonthlyCashFlow'
import { UpfrontCapital } from './UpfrontCapital'
import { WarningsList } from './WarningsList'
import { NetWorthComposition } from './NetWorthComposition'
import { YearByYearTable } from './YearByYearTable'
import { AssumptionsDisclosure } from './AssumptionsDisclosure'

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
      {/* Projection Controls — first thing in results, drives all calculations below */}
      <div className="rounded-lg border-2 border-primary/20 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Financial Comparison</h2>
            <p className="text-sm text-muted-foreground">All projections below use this time horizon</p>
          </div>
          <div className="ml-auto flex items-center gap-3 min-w-[200px] max-w-[280px]">
            <Controller
              name="projection.timeHorizonYears"
              control={control}
              render={({ field }) => (
                <>
                  <Slider
                    min={5}
                    max={30}
                    step={1}
                    value={field.value}
                    onValueChange={(val) => field.onChange(val)}
                    aria-label="Time horizon in years"
                  />
                  <span className="text-sm font-medium tabular-nums w-10 text-right shrink-0">
                    {field.value} yr
                  </span>
                </>
              )}
            />
          </div>
        </div>
      </div>

      {/* Results — gated behind required fields */}
      <ResultsGate>
        <div className="space-y-10">
          {/* Group 1: Executive Summary — verdict scorecard (accent background) */}
          <ExecutiveSummary />

          {/* Group 2: Feasibility — can you actually afford this? */}
          <div className="space-y-8">
            <ResultSection icon={Wallet} title="Upfront Capital Requirements" description="Cash needed on day one and where it comes from" accentColor="border-blue-400" iconColor="text-blue-500">
              <UpfrontCapital />
            </ResultSection>

            <ResultSection icon={DollarSign} title="Monthly Cash Flow" description="Year 1 income vs. expenses — can you afford this month to month?" accentColor="border-blue-400" iconColor="text-blue-500">
              <MonthlyCashFlow />
            </ResultSection>
          </div>

          {/* Group 3: Risk Signals */}
          <div className="rounded-lg bg-red-50/40 p-5 dark:bg-red-950/20">
            <ResultSection icon={AlertTriangle} title="Warnings & Risks" accentColor="border-red-400" iconColor="text-red-500">
              <WarningsList />
            </ResultSection>
          </div>

          {/* Group 4: Long-Range Projections */}
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

            <ResultSection icon={Layers} title="Net Worth Composition" description="Where your wealth is — cash, retirement, and home equity over time" accentColor="border-violet-400" iconColor="text-violet-500">
              <NetWorthComposition />
            </ResultSection>

            <ResultSection icon={Table2} title="Year-by-Year Detail" description="Complete financial breakdown for each scenario" accentColor="border-violet-400" iconColor="text-violet-500">
              <YearByYearTable />
            </ResultSection>
          </div>

          {/* Group 5: Assumptions & Sources */}
          <ResultSection icon={BookOpen} title="Assumptions & Sources" accentColor="border-slate-400" iconColor="text-slate-500">
            <AssumptionsDisclosure />
          </ResultSection>
        </div>
      </ResultsGate>
    </div>
  )
}
