// ---------------------------------------------------------------------------
// UpfrontCapital.tsx — Upfront capital requirements comparison
//
// Displays a side-by-side breakdown of the cash needed on day one for each
// scenario: down payment, closing costs, moving costs, funding sources,
// and whether the user has a surplus or shortfall.
//
// Consumes ModelOutput from ScenarioModelProvider. The component does NO
// financial calculations — it only formats and renders engine outputs.
// ---------------------------------------------------------------------------

import { useModelOutput } from '@/components/ScenarioModelProvider'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/utils/formatters'
import type { UpfrontCapital as UpfrontCapitalType, ScenarioOutput } from '@/engine/types'

/**
 * A single line item in the capital breakdown table.
 */
function LineItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex justify-between py-1 ${className ?? ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/**
 * Renders the capital breakdown for a single scenario.
 * Baseline shows a simple "no capital event" message.
 * Scenarios A and B show full line-item breakdowns with surplus/shortfall.
 */
function ScenarioCapitalCard({ scenario }: { scenario: ScenarioOutput }) {
  const capital: UpfrontCapitalType = scenario.upfrontCapital
  const isBaseline = capital.totalCashNeeded === 0
  const hasShortfall = capital.surplus < 0

  if (isBaseline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{scenario.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No capital event needed. Continue with current mortgage and savings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Costs section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Cash Needed</h4>
            <div className="divide-y">
              <LineItem
                label="Down Payment"
                value={formatCurrency(capital.downPayment)}
              />
              <LineItem
                label="Closing Costs"
                value={formatCurrency(capital.closingCosts)}
              />
              <LineItem
                label="Moving Costs"
                value={formatCurrency(capital.movingCosts)}
              />
              <LineItem
                label="Total Needed"
                value={formatCurrency(capital.totalCashNeeded)}
                className="font-semibold border-t-2"
              />
            </div>
          </div>

          {/* Funding sources section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Funding Sources</h4>
            <div className="divide-y">
              {capital.homeSaleNetProceeds !== null && (
                <LineItem
                  label="Home Sale Net Proceeds"
                  value={formatCurrency(capital.homeSaleNetProceeds)}
                />
              )}
              {capital.iraWithdrawalNetProceeds !== null && (
                <LineItem
                  label="IRA Withdrawal (after tax/penalty)"
                  value={formatCurrency(capital.iraWithdrawalNetProceeds)}
                />
              )}
              <LineItem
                label="Total Available"
                value={formatCurrency(capital.cashAvailable)}
                className="font-semibold border-t-2"
              />
            </div>
          </div>

          {/* Surplus or shortfall */}
          <div className="pt-2">
            {hasShortfall ? (
              <Alert variant="destructive">
                <AlertTitle>Shortfall</AlertTitle>
                <AlertDescription>
                  You are {formatCurrency(Math.abs(capital.surplus))} short of
                  the cash needed to execute this plan.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex justify-between py-2 rounded-md bg-muted px-3">
                <span className="font-medium">Surplus</span>
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(capital.surplus)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Upfront Capital Requirements — top-level results component.
 *
 * Renders a responsive grid of cards comparing the upfront cash requirements
 * for each scenario. Handles the null modelOutput state (no inputs yet).
 */
export function UpfrontCapital() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  return (
    <section aria-label="Upfront Capital Requirements">
      <h3 className="text-lg font-semibold mb-4">
        Upfront Capital Requirements
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <ScenarioCapitalCard scenario={modelOutput.baseline} />
        <ScenarioCapitalCard scenario={modelOutput.scenarioA} />
        <ScenarioCapitalCard scenario={modelOutput.scenarioB} />
      </div>
    </section>
  )
}
