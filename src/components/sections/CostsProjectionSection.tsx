import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'

/**
 * Costs section — collects moving costs, escalation rates, tax prep costs,
 * and umbrella insurance. Projection timeline controls (time horizon, rental
 * exit year) are displayed in the results panel where they belong.
 */
function CostsProjectionSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      {/* One-time costs */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">One-Time Costs</p>
        <CurrencyInput
          name="costs.movingCosts"
          label="Moving Costs"
          control={control}
          description="Total cost of moving to the new home"
        />
      </div>

      {/* Escalation rates */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escalation Rates</p>
        <PercentInput
          name="costs.insuranceEscalationRate"
          label="Insurance Escalation Rate"
          control={control}
          description="Annual rate of increase for insurance premiums"
        />

        <PercentInput
          name="costs.propertyTaxEscalationRate"
          label="Property Tax Escalation Rate"
          control={control}
          description="Annual rate of increase for property taxes"
        />

        <PercentInput
          name="costs.generalInflationRate"
          label="General Inflation Rate"
          control={control}
          description="Annual general inflation rate for cost adjustments"
        />

        <CurrencyInput
          name="costs.additionalTaxPrepCost"
          label="Additional Tax Prep Cost"
          control={control}
          description="Extra annual tax preparation cost for rental property (Schedule E)"
        />

        <CurrencyInput
          name="costs.umbrellaInsuranceAnnualCost"
          label="Umbrella Insurance Annual Cost"
          control={control}
          description="Annual umbrella insurance premium for landlord liability"
        />
      </div>
    </div>
  )
}

export { CostsProjectionSection }
