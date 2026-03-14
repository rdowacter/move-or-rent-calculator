// ---------------------------------------------------------------------------
// ResultsSections.tsx — Wrapper component that renders all results sections
// in a logical order with consistent spacing.
//
// This component is the single entry point for the results panel. Each child
// component renders its own heading internally, so this wrapper only provides
// layout spacing and section grouping.
// ---------------------------------------------------------------------------

import { VerdictSection } from './VerdictSection'
import { NetWorthChart } from './NetWorthChart'
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
        <VerdictSection />
      </section>

      <section>
        <WarningsList />
      </section>

      <section>
        <NetWorthChart />
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
