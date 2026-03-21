import { useFormContext, Controller, useWatch } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const IRA_TYPE_OPTIONS = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'roth', label: 'Roth' },
] as const

/**
 * Retirement section — collects IRA balance, type, contribution plans,
 * expected return, employer match, and other retirement savings.
 */
function RetirementSection() {
  const { control } = useFormContext<ScenarioInputs>()

  const hasEmployerMatch = useWatch({ control, name: 'retirement.hasEmployerMatch' })
  const hasOtherRetirementSavings = useWatch({ control, name: 'retirement.hasOtherRetirementSavings' })

  return (
    <div className="space-y-4">
      {/* IRA details */}
      <div className="space-y-3">
        <CurrencyInput
          name="retirement.iraBalance"
          label="Retirement Balance"
          control={control}
          description="Current balance of retirement account (401k/IRA)"
        />

        <div className="space-y-1.5">
          <Label htmlFor="retirement.iraType">Account Type</Label>
          <Controller
            name="retirement.iraType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger id="retirement.iraType" className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {IRA_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Traditional withdrawals are taxed as ordinary income; Roth withdrawals of contributions are tax-free
          </p>
        </div>

        <CurrencyInput
          name="retirement.iraWithdrawalAmountScenarioB"
          label="Withdrawal Amount — Scenario B"
          control={control}
          description="How much to withdraw from retirement account for down payment. Set to full balance for complete withdrawal."
        />
      </div>

      {/* Contributions */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contributions</p>
        <CurrencyInput
          name="retirement.annualIRAContributionScenarioA"
          label="Annual Contribution — Scenario A"
          control={control}
          description="Yearly retirement contribution if you sell current home and keep retirement intact"
        />

        <CurrencyInput
          name="retirement.annualIRAContributionScenarioB"
          label="Annual Contribution — Scenario B"
          control={control}
          description="Yearly retirement contribution if you keep current home as rental and withdraw from retirement"
        />
      </div>

      {/* Other retirement */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Other Retirement</p>
        <PercentInput
          name="retirement.iraExpectedAnnualReturn"
          label="Expected Annual Return"
          control={control}
          description="Average annual return on retirement investments (e.g. 7%)"
        />

        <div className="space-y-1.5">
          <Controller
            name="retirement.hasEmployerMatch"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <span className="text-sm font-medium">Employer 401(k) Match</span>
              </label>
            )}
          />
          {hasEmployerMatch && (
            <PercentInput
              name="retirement.employerMatchPercentage"
              label="Employer Match Percentage"
              control={control}
              description="Percentage of salary your employer matches"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Controller
            name="retirement.hasOtherRetirementSavings"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <span className="text-sm font-medium">Other Retirement Savings</span>
              </label>
            )}
          />
          {hasOtherRetirementSavings && (
            <CurrencyInput
              name="retirement.otherRetirementBalance"
              label="Other Retirement Balance"
              control={control}
              description="Balance of 401(k), pension, or other retirement accounts"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export { RetirementSection }
