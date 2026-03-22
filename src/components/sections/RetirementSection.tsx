import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { PercentInput } from '@/components/PercentInput'

/**
 * Retirement section — collects total retirement balance, annual contribution,
 * and expected return. Simplified to a single combined balance across all
 * account types (401k, IRA, brokerage) since the sell-vs-rent decision only
 * needs the total for net worth comparison.
 *
 * Account type and withdrawal fields are hidden — they only matter for
 * modeling retirement withdrawals for down payment funding, which is a
 * future feature (first-time buyer tool).
 */
function RetirementSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <CurrencyInput
          name="retirement.iraBalance"
          label="Total Retirement Balance"
          control={control}
          description="Combined balance across all retirement accounts (401k, IRA, brokerage, etc.)"
        />

        <CurrencyInput
          name="retirement.annualIRAContributionScenarioA"
          label="Annual Contribution"
          control={control}
          description="How much you contribute to retirement accounts per year"
        />

        <PercentInput
          name="retirement.iraExpectedAnnualReturn"
          label="Expected Annual Return"
          control={control}
          description="Average annual return on retirement investments (e.g. 7%)"
        />
      </div>
    </div>
  )
}

export { RetirementSection }
