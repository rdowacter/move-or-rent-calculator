import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

/**
 * Current Home section — collects inputs about the existing property.
 *
 * Simple fields (visible by default): Home Value, Mortgage Balance,
 * Interest Rate, Expected Monthly Rent — the 4 inputs most users need.
 *
 * Advanced fields (behind collapsible toggle): loan position, property
 * taxes, insurance, maintenance, vacancy, management fees, appreciation,
 * tenant turnover, selling costs, and depreciation assumptions.
 */
function CurrentHomeSection() {
  const { control } = useFormContext<ScenarioInputs>()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Simple fields — the 4 required inputs most users need */}
      <div className="space-y-3">
        <CurrencyInput
          name="currentHome.homeValue"
          label="Home Value"
          control={control}
          description="Current market value — used as the sale price in Scenario A and the starting value for rental appreciation in Scenario B"
        />

        <CurrencyInput
          name="currentHome.mortgageBalance"
          label="Mortgage Balance"
          control={control}
          description="Remaining principal on current mortgage"
        />

        <PercentInput
          name="currentHome.interestRate"
          label="Interest Rate"
          control={control}
          description="Current mortgage interest rate"
        />

        <CurrencyInput
          name="currentHome.expectedMonthlyRent"
          label="Expected Monthly Rent"
          control={control}
          description="What you expect to charge tenants per month"
        />
      </div>

      {/* Advanced fields — loan details, rental assumptions, costs, sale assumptions */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
          />
          {advancedOpen ? 'Hide advanced' : 'Advanced'}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-4">
            {/* Loan position */}
            <div className="space-y-3">
              <FormField
                name="currentHome.originalLoanTermYears"
                label="Original Loan Term"
                control={control}
                type="number"
                inputMode="numeric"
                description="Original mortgage term in years (e.g., 30)"
              />

              <FormField
                name="currentHome.yearsIntoLoan"
                label="Years Into Loan"
                control={control}
                type="number"
                inputMode="numeric"
                description="How many years since loan origination"
              />
            </div>

            {/* Rental assumptions */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rental Assumptions</p>

              <PercentInput
                name="currentHome.annualRentGrowthRate"
                label="Annual Rent Growth Rate"
                control={control}
                description="Expected annual increase in rental income"
              />

              <PercentInput
                name="currentHome.vacancyRate"
                label="Vacancy Rate"
                control={control}
                description="Expected vacancy as % of year (8% = ~1 month/year)"
                info="Time between tenants when the property earns no rent. Accounts for move-out, cleaning, repairs, and finding a new tenant."
              />

              <PercentInput
                name="currentHome.propertyManagementFeeRate"
                label="Management Fee Rate"
                control={control}
                description="Property management fee as % of collected rent"
              />

              <FormField
                name="currentHome.tenantTurnoverFrequencyYears"
                label="Turnover Frequency (Years)"
                control={control}
                type="number"
                inputMode="numeric"
                description="Average years between tenant turnovers"
              />

              <CurrencyInput
                name="currentHome.costPerTurnover"
                label="Cost Per Turnover"
                control={control}
                description="Cleaning, minor repairs, and re-listing costs per turnover"
              />

              <PercentInput
                name="currentHome.rentalIncomeDTICreditRate"
                label="Lender Rental Income Credit"
                control={control}
                description="How much rental income lenders count toward DTI. 75% standard, 0% if no landlord history."
                info="When qualifying for the new home mortgage, lenders discount rental income to account for risk. 75% is standard (Fannie Mae). Some lenders use 0% for first-time landlords."
              />
            </div>

            {/* Costs & taxes */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Costs & Taxes</p>
              <PercentInput
                name="currentHome.annualPropertyTaxRate"
                label="Annual Property Tax Rate"
                control={control}
                description="As a percentage of assessed value"
              />

              <CurrencyInput
                name="currentHome.annualInsurance"
                label="Annual Insurance"
                control={control}
                description="Current homeowners insurance premium per year"
              />

              <PercentInput
                name="currentHome.landlordInsurancePremiumIncrease"
                label="Landlord Insurance Premium Increase"
                control={control}
                description="Extra cost when converting to landlord policy (typically 15-25%)"
              />

              <PercentInput
                name="currentHome.maintenanceReserveRate"
                label="Maintenance Reserve Rate"
                control={control}
                description="Annual maintenance as % of home value (rule of thumb: 1%)"
                info="Set aside this percentage of the home's value each year for repairs and upkeep. 0.75% is optimistic, 1% is conservative. Covers things like appliance replacement, painting, plumbing fixes."
              />

              <CurrencyInput
                name="currentHome.monthlyHOA"
                label="Monthly HOA"
                control={control}
                description="Homeowners association dues per month"
              />

              <PercentInput
                name="currentHome.landValuePercentage"
                label="Land Value Percentage"
                control={control}
                description="Percentage of home value that is land (not depreciable). Check your county tax assessor."
                info="The IRS only allows depreciation on the structure, not the land. This split determines your annual tax deduction. Your county tax assessment usually shows this breakdown."
              />
            </div>

            {/* Sale assumptions */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale Assumptions</p>
              <PercentInput
                name="currentHome.sellingCostsRate"
                label="Selling Costs Rate"
                control={control}
                description="Agent commissions + closing costs (typically 6-8%)"
              />

              <PercentInput
                name="currentHome.annualAppreciationRate"
                label="Annual Appreciation Rate"
                control={control}
                description="Expected annual home value appreciation"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { CurrentHomeSection }
