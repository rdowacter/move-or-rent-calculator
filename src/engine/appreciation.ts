// ---------------------------------------------------------------------------
// appreciation.ts — Home value appreciation and equity calculations
//
// Pure functions for projecting home values using compound growth and
// calculating homeowner equity. These are foundational building blocks
// used by the scenario orchestrator to project net worth over time.
//
// All functions are pure with zero side effects and no UI dependencies.
// ---------------------------------------------------------------------------

/**
 * A single entry in a year-by-year appreciation schedule.
 */
export interface AppreciationScheduleEntry {
  /** Projection year (0 = current / starting value). */
  year: number
  /** Projected home value at the end of this year. */
  value: number
}

/**
 * Calculate the future value of a home after compound annual appreciation.
 *
 * Uses the standard compound growth formula: FV = PV × (1 + r)^n
 *
 * @param currentValue - Current market value of the home in dollars
 * @param annualAppreciationRate - Annual appreciation rate as a decimal (e.g. 0.03 for 3%)
 * @param years - Number of years to project forward
 * @returns Projected home value after the given number of years
 */
export function calculateFutureHomeValue(
  currentValue: number,
  annualAppreciationRate: number,
  years: number,
): number {
  return currentValue * Math.pow(1 + annualAppreciationRate, years)
}

/**
 * Calculate home equity (market value minus outstanding mortgage balance).
 *
 * Equity can be negative ("underwater") if the mortgage balance exceeds
 * the current market value of the property.
 *
 * @param homeValue - Current market value of the home
 * @param mortgageBalance - Outstanding mortgage principal balance
 * @returns Home equity in dollars (negative if underwater)
 */
export function calculateHomeEquity(
  homeValue: number,
  mortgageBalance: number,
): number {
  return homeValue - mortgageBalance
}

/**
 * Generate a year-by-year home value appreciation schedule.
 *
 * Returns an array starting at year 0 (current value) through the
 * specified number of years. Each entry contains the projected home
 * value at that point in time using compound annual growth.
 *
 * @param currentValue - Current market value of the home
 * @param annualAppreciationRate - Annual appreciation rate as a decimal
 * @param years - Number of years to project (schedule will have years + 1 entries)
 * @returns Array of { year, value } entries from year 0 to year N
 */
export function generateAppreciationSchedule(
  currentValue: number,
  annualAppreciationRate: number,
  years: number,
): AppreciationScheduleEntry[] {
  const schedule: AppreciationScheduleEntry[] = []

  for (let year = 0; year <= years; year++) {
    schedule.push({
      year,
      value: calculateFutureHomeValue(currentValue, annualAppreciationRate, year),
    })
  }

  return schedule
}
