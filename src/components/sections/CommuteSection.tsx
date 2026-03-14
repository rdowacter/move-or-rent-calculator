import { useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'
import { CurrencyInput } from '@/components/CurrencyInput'
import { FormField } from '@/components/FormField'

/**
 * Commute section — collects current and projected commute costs.
 * Fields cover round-trip distance, time saved, toll costs, work days,
 * IRS mileage rate, new commute distance, new tolls, and landlord time.
 */
function CommuteSection() {
  const { control } = useFormContext<ScenarioInputs>()

  return (
    <div className="space-y-4">
      {/* Current commute */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Commute</p>
        <FormField
          name="commute.currentRoundTripMiles"
          label="Current Round-Trip Miles"
          control={control}
          type="number"
          inputMode="decimal"
          description="Round-trip commute distance from Kyle to Austin"
        />

        <CurrencyInput
          name="commute.currentMonthlyTolls"
          label="Current Monthly Tolls"
          control={control}
          description="Current monthly toll road costs"
        />
      </div>

      {/* New commute */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New Commute</p>
        <FormField
          name="commute.newRoundTripMiles"
          label="New Round-Trip Miles"
          control={control}
          type="number"
          inputMode="decimal"
          description="Expected round-trip commute from Austin home"
        />

        <CurrencyInput
          name="commute.newMonthlyTolls"
          label="New Monthly Tolls"
          control={control}
          description="Expected monthly tolls from new location"
        />

        <FormField
          name="commute.commuteTimeSavedPerDayHours"
          label="Daily Time Saved (Hours)"
          control={control}
          type="number"
          inputMode="decimal"
          description="Hours saved per work day by moving closer"
        />
      </div>

      {/* Other */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Other</p>
        <FormField
          name="commute.workDaysPerYear"
          label="Work Days Per Year"
          control={control}
          type="number"
          inputMode="numeric"
          description="Typical: 250 (5 days/week x 50 weeks)"
        />

        <CurrencyInput
          name="commute.irsMileageRate"
          label="IRS Mileage Rate"
          control={control}
          description="Standard mileage rate per mile (for cost estimation)"
        />

        <FormField
          name="commute.landlordHoursPerMonth"
          label="Landlord Hours Per Month"
          control={control}
          type="number"
          inputMode="decimal"
          description="Time spent on landlord duties in Scenario B"
        />
      </div>
    </div>
  )
}

export { CommuteSection }
