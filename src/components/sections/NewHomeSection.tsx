import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/**
 * New Home section — collects inputs about the prospective purchase.
 * Simple fields (purchase price, interest rate, down payments) are visible
 * by default. Advanced fields (loan term, PMI, taxes, insurance, closing
 * costs, appreciation) are behind a collapsible toggle.
 */
function NewHomeSection() {
  const { control } = useFormContext<ScenarioInputs>()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Simple fields — always visible */}
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

      {/* Advanced fields — behind collapsible toggle */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span>Advanced</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              advancedOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 pt-2">
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
              description="Expected annual home value appreciation"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { NewHomeSection }
