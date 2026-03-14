import { useFormContext, Controller } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { FormField } from '@/components/FormField'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
] as const

/**
 * About You section — collects personal financial profile inputs.
 * Fields cover age, income, filing status, expenses, savings,
 * salary growth, debt, and state tax rate.
 */
function AboutYouSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      <FormField
        name="personal.age"
        label="Age"
        control={control}
        type="number"
        inputMode="numeric"
        description="Used to determine early withdrawal penalty eligibility (under 59.5)"
      />

      <CurrencyInput
        name="personal.annualGrossIncome"
        label="Annual Gross Income"
        control={control}
        description="Before taxes — used for tax bracket and DTI calculations"
      />

      <div className="space-y-1.5">
        <Label htmlFor="personal.filingStatus">Filing Status</Label>
        <Controller
          name="personal.filingStatus"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="personal.filingStatus"
                className="w-full"
                aria-describedby="personal.filingStatus-desc"
              >
                <SelectValue placeholder="Select filing status" />
              </SelectTrigger>
              <SelectContent>
                {FILING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p id="personal.filingStatus-desc" className="text-xs text-muted-foreground">
          Determines which IRS tax brackets apply
        </p>
      </div>

      <CurrencyInput
        name="personal.monthlyLivingExpenses"
        label="Monthly Living Expenses"
        control={control}
        description="Non-housing costs: food, utilities, transportation, etc."
      />

      <CurrencyInput
        name="personal.liquidSavings"
        label="Liquid Savings"
        control={control}
        description="Cash on hand available for down payment and closing costs"
      />

      <PercentInput
        name="personal.annualSalaryGrowthRate"
        label="Salary Growth Rate"
        control={control}
        description="Expected annual salary increase (e.g. 3%)"
      />

      <CurrencyInput
        name="personal.monthlyDebtPayments"
        label="Monthly Debt Payments"
        control={control}
        description="Car loans, student loans, credit cards — affects DTI ratio"
      />

      <PercentInput
        name="personal.stateIncomeTaxRate"
        label="State Income Tax Rate"
        control={control}
        description="0% for Texas residents"
      />
    </div>
  )
}

export { AboutYouSection }
