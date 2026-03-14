import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

/**
 * New Home (Austin) section — collects inputs about the prospective purchase.
 * Primary fields cover purchase price, interest rate, and down payment
 * percentages for both scenarios.
 * Advanced fields cover loan term, PMI, property tax, insurance,
 * closing costs, and appreciation assumptions.
 */
function NewHomeSection() {
  const { control } = useFormContext<ScenarioInputs>()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Primary fields */}
      <CurrencyInput
        name="newHome.purchasePrice"
        label="Purchase Price"
        control={control}
        description="Target purchase price for the Austin home"
      />

      <PercentInput
        name="newHome.interestRate"
        label="Interest Rate"
        control={control}
        description="Expected mortgage interest rate for the new loan"
      />

      <PercentInput
        name="newHome.downPaymentPercentScenarioA"
        label="Down Payment % — Scenario A"
        control={control}
        description="Down payment if selling Kyle (larger, from sale proceeds)"
      />

      <PercentInput
        name="newHome.downPaymentPercentScenarioB"
        label="Down Payment % — Scenario B"
        control={control}
        description="Down payment if keeping Kyle as rental (smaller, from savings + IRA)"
      />

      {/* Advanced fields */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="sm" className="w-full" />
          }
        >
          {advancedOpen ? 'Hide Advanced' : 'Show Advanced'}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pt-4">
            <FormField
              name="newHome.loanTermYears"
              label="Loan Term (Years)"
              control={control}
              type="number"
              inputMode="numeric"
              description="Mortgage term length (typically 30 or 15 years)"
            />

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
              description="Expected annual home value appreciation for Austin area"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { NewHomeSection }
