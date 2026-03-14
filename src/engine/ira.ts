// ---------------------------------------------------------------------------
// ira.ts — IRA growth projection calculations
//
// Pure functions for projecting IRA (Individual Retirement Account) balance
// growth over time, accounting for compound returns and annual contributions.
// These projections power the "jaw drop" comparison chart showing the true
// cost of early IRA withdrawal: the gap between keeping the IRA intact with
// contributions vs. withdrawing it and starting from zero.
//
// Core financial math:
//   Future value (closed-form) = PV × (1+r)^n + PMT × [((1+r)^n - 1) / r]
//   where PV = present value (current balance), r = annual return rate,
//   n = number of years, PMT = annual contribution.
//
// This module has ZERO dependencies on React, the DOM, or any browser API.
// ---------------------------------------------------------------------------

/**
 * A single year's snapshot in an IRA growth projection.
 */
export interface IRAProjectionYear {
  /** Projection year number (1-indexed). */
  year: number
  /** IRA balance at the end of this year. */
  balance: number
  /** Cumulative contributions made through this year (excludes initial balance). */
  totalContributions: number
  /** Cumulative investment growth = balance - initialBalance - totalContributions. */
  totalGrowth: number
}

/**
 * Calculates the future value of an IRA given an initial balance, annual
 * contributions, expected annual return rate, and time horizon.
 *
 * Uses the closed-form compound interest formula combining a lump sum
 * (existing balance) with an ordinary annuity (annual contributions made
 * at end of each year).
 *
 * @param currentBalance  - Current IRA balance (present value)
 * @param annualContribution - Amount contributed at the end of each year
 * @param annualReturnRate - Expected annual return (e.g., 0.07 for 7%)
 * @param years - Number of years to project forward
 * @returns The projected IRA balance at the end of the time horizon
 */
export function calculateIRAFutureValue(
  currentBalance: number,
  annualContribution: number,
  annualReturnRate: number,
  years: number
): number {
  // Edge case: no time passes — return the starting balance as-is
  if (years === 0) {
    return currentBalance
  }

  // Edge case: 0% return rate — the standard annuity formula divides by zero
  // because the denominator is r. At 0% return there is no compounding;
  // the balance simply accumulates contributions linearly.
  if (annualReturnRate === 0) {
    return currentBalance + annualContribution * years
  }

  // Standard compound interest formula:
  //   FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
  //
  // First term: future value of the existing lump sum
  // Second term: future value of an ordinary annuity (contributions at end of year)
  const compoundFactor = Math.pow(1 + annualReturnRate, years)
  const futureValueOfBalance = currentBalance * compoundFactor
  const futureValueOfContributions =
    annualContribution * ((compoundFactor - 1) / annualReturnRate)

  return futureValueOfBalance + futureValueOfContributions
}

/**
 * Generates a year-by-year IRA growth projection showing balance,
 * cumulative contributions, and cumulative investment growth for each year.
 *
 * Unlike calculateIRAFutureValue (which uses a closed-form formula),
 * this function iterates year by year so each year's snapshot is available
 * for charting. The iterative approach applies:
 *   newBalance = previousBalance × (1 + r) + annualContribution
 *
 * @param currentBalance - Current IRA balance at year 0
 * @param annualContribution - Amount contributed at the end of each year
 * @param annualReturnRate - Expected annual return (e.g., 0.07 for 7%)
 * @param years - Number of years to project forward
 * @returns Array of yearly snapshots (empty if years is 0)
 */
export function generateIRAProjection(
  currentBalance: number,
  annualContribution: number,
  annualReturnRate: number,
  years: number
): IRAProjectionYear[] {
  // Edge case: no years to project — return empty array
  if (years === 0) {
    return []
  }

  const projection: IRAProjectionYear[] = []
  let balance = currentBalance
  let totalContributions = 0

  for (let year = 1; year <= years; year++) {
    // Apply one year of investment returns on the existing balance,
    // then add the annual contribution (end-of-year contribution model)
    balance = balance * (1 + annualReturnRate) + annualContribution
    totalContributions += annualContribution

    // Total growth is everything that isn't the original balance or contributions.
    // This isolates the compounding gains — the "money your money earned."
    const totalGrowth = balance - currentBalance - totalContributions

    projection.push({
      year,
      balance,
      totalContributions,
      totalGrowth,
    })
  }

  return projection
}
