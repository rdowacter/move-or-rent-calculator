import { useState } from 'react'
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
] as const

/**
 * About You section — collects personal financial profile inputs.
 *
 * Fields are split into simple (always visible) and advanced (behind a
 * collapsible toggle) to reduce initial cognitive load. The five required
 * financial inputs are shown by default; less commonly changed assumptions
 * (age, salary growth, state tax) are tucked into "Advanced."
 */
function AboutYouSection() {
  const { control } = useFormContext<ScenarioInputs>()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Home names */}
      <div className="space-y-3 pb-4 border-b">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Homes</p>
        <FormField
          name="homeNames.currentHomeName"
          label="Current Home Name"
          control={control}
          type="text"
          description="Give your current home a name"
          placeholder="e.g., Denver Condo, Our Ranch House"
        />
        <FormField
          name="homeNames.newHomeName"
          label="New Home Name"
          control={control}
          type="text"
          description="Give the home you're buying a name"
          placeholder="e.g., Lake House, The New Place"
        />
      </div>

      {/* Simple fields — the 5 required inputs visible by default */}
      <div className="space-y-3">
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
          name="personal.liquidSavings"
          label="Liquid Savings"
          control={control}
          description="Cash on hand available for down payment and closing costs"
        />

        <CurrencyInput
          name="personal.monthlyLivingExpenses"
          label="Monthly Living Expenses"
          control={control}
          description="Non-housing costs: food, utilities, transportation, etc."
        />

        <CurrencyInput
          name="personal.monthlyDebtPayments"
          label="Monthly Debt Payments"
          control={control}
          description="Car loans, student loans, credit cards — affects DTI ratio"
        />
      </div>

      {/* Advanced fields — less commonly changed assumptions */}
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
              name="personal.age"
              label="Age"
              control={control}
              type="number"
              inputMode="numeric"
              description="Used to determine early withdrawal penalty eligibility (under 59.5)"
            />

            <PercentInput
              name="personal.annualSalaryGrowthRate"
              label="Salary Growth Rate"
              control={control}
              description="Expected annual salary increase (e.g. 3%)"
            />

            <PercentInput
              name="personal.stateIncomeTaxRate"
              label="State Income Tax Rate"
              control={control}
              description="Your state's income tax rate (0% if no state income tax)"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { AboutYouSection }
