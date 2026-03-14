// ---------------------------------------------------------------------------
// ResultsSections.tsx — Wrapper component that renders all results sections
// in a logical order with consistent spacing.
//
// This component is the single entry point for the results panel. Each child
// component renders its own heading internally, so this wrapper only provides
// layout spacing and section grouping.
// ---------------------------------------------------------------------------

import { NetWorthChart } from './NetWorthChart'
import { NetWorthBreakdown } from './NetWorthBreakdown'
import { IRATrajectoryChart } from './IRATrajectoryChart'
import { MonthlyCashFlow } from './MonthlyCashFlow'
import { UpfrontCapital } from './UpfrontCapital'
import { ReserveRunway } from './ReserveRunway'
import { WarningsList } from './WarningsList'

/**
 * Renders all results sections in order with consistent spacing.
 *
 * Must be rendered inside a ScenarioModelProvider so child components
 * can access the model output via useModelOutput().
 */
export function ResultsSections() {
  return (
    <div className="space-y-10" data-testid="results-sections">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Financial Comparison</h2>
        <p className="text-sm text-muted-foreground">Based on your inputs, here's how each scenario plays out</p>
      </div>

      <section>
        <WarningsList />
      </section>

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

      <div className="border-t border-border" />

      <section>
        <NetWorthChart />
      </section>

      <section>
        <NetWorthBreakdown />
      </section>

      <div className="border-t border-border" />

      <section>
        <IRATrajectoryChart />
      </section>

      <div className="border-t border-border" />

      <section>
        <MonthlyCashFlow />
      </section>

      <div className="border-t border-border" />

      <section>
        <UpfrontCapital />
      </section>

      <div className="border-t border-border" />

      <section>
        <ReserveRunway />
      </section>
    </div>
  )
}
