// ---------------------------------------------------------------------------
// commute.ts — Commute cost, savings, and time-value calculations
//
// Pure financial math with ZERO React/UI dependencies. These functions
// quantify the financial impact of commute changes — both the direct
// vehicle/toll costs and the imputed economic value of time saved.
//
// All dollar amounts are annual unless otherwise noted.
// ---------------------------------------------------------------------------

import { MONTHS_PER_YEAR, WORK_HOURS_PER_YEAR } from './constants'

/**
 * Calculates the total annual cost of a commute, combining mileage-based
 * vehicle costs and fixed monthly toll expenses.
 *
 * Mileage cost uses the IRS standard mileage rate, which accounts for gas,
 * depreciation, insurance, and maintenance. Tolls are treated as a fixed
 * monthly expense independent of work days.
 *
 * @param roundTripMiles - Daily round-trip commute distance in miles
 * @param workDaysPerYear - Number of days commuting per year (typically 250)
 * @param irsMileageRate - IRS standard mileage rate (e.g., 0.725 for $0.725/mile in 2024)
 * @param monthlyTolls - Fixed monthly toll expenses
 * @returns Annual commute cost in dollars
 */
export function calculateAnnualCommuteCost(
  roundTripMiles: number,
  workDaysPerYear: number,
  irsMileageRate: number,
  monthlyTolls: number
): number {
  const annualMileageCost = roundTripMiles * workDaysPerYear * irsMileageRate
  const annualTollCost = monthlyTolls * MONTHS_PER_YEAR
  return annualMileageCost + annualTollCost
}

/**
 * Calculates the annual savings from switching to a shorter/cheaper commute.
 * A positive result means the new commute is cheaper (savings). A negative
 * result means the new commute is more expensive (additional cost).
 *
 * @param currentRoundTripMiles - Current daily round-trip miles
 * @param newRoundTripMiles - New daily round-trip miles after moving
 * @param workDaysPerYear - Number of commute days per year
 * @param irsMileageRate - IRS standard mileage rate
 * @param currentMonthlyTolls - Current monthly toll expenses
 * @param newMonthlyTolls - New monthly toll expenses after moving
 * @returns Annual commute savings in dollars (positive = saving money)
 */
export function calculateAnnualCommuteSavings(
  currentRoundTripMiles: number,
  newRoundTripMiles: number,
  workDaysPerYear: number,
  irsMileageRate: number,
  currentMonthlyTolls: number,
  newMonthlyTolls: number
): number {
  const currentCost = calculateAnnualCommuteCost(
    currentRoundTripMiles,
    workDaysPerYear,
    irsMileageRate,
    currentMonthlyTolls
  )
  const newCost = calculateAnnualCommuteCost(
    newRoundTripMiles,
    workDaysPerYear,
    irsMileageRate,
    newMonthlyTolls
  )
  return currentCost - newCost
}

/**
 * Calculates the total hours saved per year by reducing commute time.
 *
 * @param dailyTimeSavedHours - Hours saved per day (e.g., 2.5 for going
 *   from a 3-hour commute to a 30-minute commute)
 * @param workDaysPerYear - Number of commute days per year
 * @returns Total hours saved per year
 */
export function calculateAnnualTimeSavedHours(
  dailyTimeSavedHours: number,
  workDaysPerYear: number
): number {
  return dailyTimeSavedHours * workDaysPerYear
}

/**
 * Calculates the imputed economic value of commute time saved, using the
 * individual's hourly wage rate as a proxy for the value of their time.
 *
 * Hourly rate is derived from annual gross income divided by standard
 * full-time work hours (2,080 = 40 hrs/week × 52 weeks). This is an
 * approximation — the actual value of leisure time may differ from wage
 * rate, but it provides a reasonable benchmark for comparison.
 *
 * @param dailyTimeSavedHours - Hours saved per commute day
 * @param workDaysPerYear - Number of commute days per year
 * @param annualGrossIncome - Annual gross income (used to derive hourly rate)
 * @returns Imputed annual dollar value of time saved
 */
export function calculateTimeSavedValue(
  dailyTimeSavedHours: number,
  workDaysPerYear: number,
  annualGrossIncome: number
): number {
  const hourlyRate = annualGrossIncome / WORK_HOURS_PER_YEAR
  const annualHoursSaved = calculateAnnualTimeSavedHours(
    dailyTimeSavedHours,
    workDaysPerYear
  )
  return annualHoursSaved * hourlyRate
}
