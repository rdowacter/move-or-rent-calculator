import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'

/**
 * Costs & Projection section — collects time horizon, rental exit timing,
 * moving costs, escalation rates, tax prep costs, and umbrella insurance.
 */
function CostsProjectionSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      <FormField
        name="projection.timeHorizonYears"
        label="Time Horizon (Years)"
        control={control}
        type="number"
        inputMode="numeric"
        description="Number of years to project forward"
      />

      <FormField
        name="projection.plannedRentalExitYear"
        label="Planned Rental Exit Year"
        control={control}
        type="number"
        inputMode="numeric"
        description="Year to sell the rental property"
      />

      <CurrencyInput
        name="costs.movingCosts"
        label="Moving Costs"
        control={control}
        description="Total cost of moving to the new home"
      />

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
  )
}

export { CostsProjectionSection }
