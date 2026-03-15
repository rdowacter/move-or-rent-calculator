import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'

/**
 * Current Home (Kyle) section — collects inputs about the existing property.
 * Fields cover value, mortgage, rate, loan position, expected rent,
 * property taxes, insurance, maintenance, vacancy, management fees,
 * appreciation, and tenant turnover assumptions.
 */
function CurrentHomeSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      {/* Property basics */}
      <div className="space-y-3">
        <CurrencyInput
          name="currentHome.homeValue"
          label="Home Value"
          control={control}
          description="Current estimated market value"
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
        <CurrencyInput
          name="currentHome.expectedMonthlyRent"
          label="Expected Monthly Rent"
          control={control}
          description="What you expect to charge tenants per month"
        />

        <PercentInput
          name="currentHome.vacancyRate"
          label="Vacancy Rate"
          control={control}
          description="Expected vacancy as % of year (8% = ~1 month/year)"
        />

        <PercentInput
          name="currentHome.propertyManagementFeeRate"
          label="Management Fee Rate"
          control={control}
          description="Property management fee as % of collected rent"
        />

        <PercentInput
          name="currentHome.annualRentGrowthRate"
          label="Annual Rent Growth Rate"
          control={control}
          description="Expected annual increase in rental income"
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
        />
      </div>

      {/* Costs & taxes */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Costs & Taxes</p>
        <PercentInput
          name="currentHome.annualPropertyTaxRate"
          label="Annual Property Tax Rate"
          control={control}
          description="As a percentage of assessed value (e.g. 2.15% for Kyle, TX)"
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
        />
      </div>

      {/* Sale assumptions */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale Assumptions</p>
        <PercentInput
          name="currentHome.sellingCostsRate"
          label="Selling Costs Rate"
          control={control}
          description="Agent commissions + closing costs (typically 6-8% in Texas)"
        />

        <PercentInput
          name="currentHome.annualAppreciationRate"
          label="Annual Appreciation Rate"
          control={control}
          description="Expected annual home value appreciation"
        />
      </div>
    </div>
  )
}

export { CurrentHomeSection }
