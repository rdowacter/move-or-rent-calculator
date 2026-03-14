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
    <div className="space-y-8" data-testid="results-sections">
      <section>
        <WarningsList />
      </section>

      <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
        <h3 className="text-sm font-semibold">Comparing Three Scenarios</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Baseline:</span> Stay
            in Kyle, keep the IRA, keep commuting
          </li>
          <li>
            <span className="font-medium text-foreground">Scenario A:</span>{' '}
            Sell Kyle, buy Austin, keep IRA intact + contributing
          </li>
          <li>
            <span className="font-medium text-foreground">Scenario B:</span>{' '}
            Keep Kyle as rental, withdraw IRA for down payment, buy Austin
          </li>
        </ul>
      </div>

      <section>
        <NetWorthChart />
      </section>

      <section>
        <NetWorthBreakdown />
      </section>

      <section>
        <IRATrajectoryChart />
      </section>

      <section>
        <MonthlyCashFlow />
      </section>

      <section>
        <UpfrontCapital />
      </section>

      <section>
        <ReserveRunway />
      </section>
    </div>
  )
}
