import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'

/**
 * New Home section — collects inputs about the prospective purchase.
 * Fields cover purchase price, interest rate, down payment percentages,
 * loan term, PMI, property tax, insurance, closing costs, and appreciation.
 */
function NewHomeSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      {/* Purchase details */}
      <div className="space-y-3">
        <CurrencyInput
          name="newHome.purchasePrice"
          label="Purchase Price"
          control={control}
          description="Target purchase price for the new home"
        />

        <PercentInput
          name="newHome.interestRate"
          label="Interest Rate"
          control={control}
          description="Expected mortgage interest rate for the new loan"
        />

        <FormField
          name="newHome.loanTermYears"
          label="Loan Term (Years)"
          control={control}
          type="number"
          inputMode="numeric"
          description="Mortgage term length (typically 30 or 15 years)"
        />
      </div>

      {/* Down payments */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Down Payments</p>
        <PercentInput
          name="newHome.downPaymentPercentScenarioA"
          label="Down Payment % — Scenario A"
          control={control}
          description="Down payment if selling current home (larger, from sale proceeds)"
        />

        <PercentInput
          name="newHome.downPaymentPercentScenarioB"
          label="Down Payment % — Scenario B"
          control={control}
          description="Down payment if keeping current home as rental (smaller, from savings + IRA)"
        />
      </div>

      {/* Costs */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Costs</p>
        <PercentInput
          name="newHome.annualPMIRate"
          label="Annual PMI Rate"
          control={control}
          description="Private mortgage insurance rate on loan amount (required if LTV > 80%)"
        />

        <PercentInput
          name="newHome.annualPropertyTaxRate"
          label="Annual Property Tax Rate"
          control={control}
          description="As a percentage of assessed value"
        />

        <CurrencyInput
          name="newHome.annualInsurance"
          label="Annual Insurance"
          control={control}
          description="Homeowners insurance premium per year"
        />

        <PercentInput
          name="newHome.closingCostsRate"
          label="Closing Costs Rate"
          control={control}
          description="Buyer closing costs as % of purchase price (typically 2-3%)"
        />

        <PercentInput
          name="newHome.annualAppreciationRate"
          label="Annual Appreciation Rate"
          control={control}
          description="Expected annual home value appreciation"
        />
      </div>
    </div>
  )
}

export { NewHomeSection }
