// ---------------------------------------------------------------------------
// capital.ts — Upfront capital requirements, monthly burn rate, reserve runway,
// and stress test calculations.
//
// This module answers the question: "Can you actually afford to execute this
// plan?" It calculates how much cash is needed on day one, whether the user
// has it, how long their reserves will last month-to-month, and what happens
// when things go wrong (vacancy, income loss, market downturn).
//
// Pure functions only. ZERO React/UI/DOM dependencies.
// ---------------------------------------------------------------------------

import type { UpfrontCapital, StressTestResult } from './types'

// ---- Stress Test Constants --------------------------------------------------
// These define the severity of each stress scenario. They are intentionally
// conservative — the goal is to show the user how quickly things can go wrong,
// not to provide an optimistic picture.

/**
 * Number of months of vacancy assumed in the vacancy + maintenance shock.
 * 3 months represents a reasonable worst-case: one month to find a tenant,
 * one month of eviction/turnover, one month of repairs.
 */
const VACANCY_SHOCK_MONTHS = 3

/**
 * Major unexpected repair cost assumed in the vacancy + maintenance shock.
 * $8,000 covers an HVAC replacement, a roof repair, or a significant
 * plumbing issue — the kind of single event that can wipe out a new
 * landlord's reserves.
 */
export const MAJOR_REPAIR_COST = 8_000

/**
 * Income reduction factor for the income disruption stress test.
 * 80% of normal income represents a layoff with severance/unemployment,
 * reduced hours, or a forced job change at lower pay.
 */
const INCOME_DISRUPTION_FACTOR = 0.80

/**
 * Market value decline factor for the market downturn stress test.
 * A 10% drop is a moderate correction — not a 2008-level crash, but enough
 * to put high-LTV borrowers underwater and eliminate exit options.
 */
const MARKET_DOWNTURN_FACTOR = 0.90

// ---- Input Types ------------------------------------------------------------

/** Inputs for calculating upfront capital requirements. */
export interface UpfrontCapitalInputs {
  /** Which scenario is being evaluated. */
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  /** Purchase price of the new home. */
  homePrice: number
  /** Down payment as a fraction of home price (e.g. 0.20 for 20%). */
  downPaymentPercent: number
  /** Buyer closing costs as a fraction of home price (e.g. 0.025 for 2.5%). */
  closingCostsRate: number
  /** One-time moving costs in dollars. */
  movingCosts: number
  /** Current liquid savings / cash on hand. */
  liquidSavings: number
  /**
   * Net proceeds from selling the current home (Scenario A only).
   * This is the sale price minus selling costs minus mortgage payoff.
   */
  homeSaleNetProceeds?: number
  /**
   * Net proceeds from IRA withdrawal (Scenario B only).
   * This is the withdrawal amount minus federal tax minus early withdrawal
   * penalty — the actual cash received.
   */
  iraWithdrawalNetProceeds?: number
}

/** Inputs for calculating monthly burn rate (net cash position). */
export interface MonthlyBurnRateInputs {
  /** Gross monthly income before taxes. */
  monthlyGrossIncome: number
  /** Monthly federal income tax withholding. */
  monthlyFederalTax: number
  /** Monthly mortgage principal & interest on the primary (new) home. */
  primaryMortgagePI: number
  /** Monthly property tax on the primary home. */
  primaryPropertyTaxMonthly: number
  /** Monthly homeowners insurance on the primary home. */
  primaryInsuranceMonthly: number
  /** Monthly PMI on the primary home (0 if LTV ≤ 80%). */
  primaryPMIMonthly: number
  /** Monthly non-housing living expenses (food, utilities, transport, etc.). */
  monthlyLivingExpenses: number
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  monthlyDebtPayments: number
  /**
   * Net monthly cash flow from the rental property (Scenario B).
   * Positive = rental income exceeds rental expenses (helps cash position).
   * Negative = rental expenses exceed rental income (drains cash position).
   * Omit or set to 0 for scenarios without a rental property.
   */
  rentalNetCashFlow?: number
}

/** Inputs for the three-scenario stress test. */
export interface StressTestInputs {
  /** Cash remaining after closing on the new home. */
  postClosingReserves: number
  /** Monthly net cash position (positive = surplus, negative = deficit). */
  monthlyNetPosition: number
  /** Monthly rent collected on the rental property. */
  monthlyRent: number
  /** Gross monthly income before taxes. */
  monthlyGrossIncome: number
  /** Total monthly obligations (housing + debt + living expenses). */
  monthlyObligations: number
  /** Current market value of the rental property. */
  homeValue: number
  /** Remaining mortgage balance on the rental property. */
  mortgageBalance: number
  /** Selling cost rate as a fraction of sale price (e.g. 0.06 for 6%). */
  sellingCostRate: number
}

// ---- Functions --------------------------------------------------------------

/**
 * Calculate upfront capital requirements for a given scenario.
 *
 * For Baseline: no capital event — the user stays put. Returns zeros for all
 * cost fields and liquid savings as the available cash.
 *
 * For Scenario A (sell current home, buy new): down payment + closing costs +
 * moving costs are needed. Cash available = liquid savings + home sale proceeds.
 *
 * For Scenario B (keep current as rental, buy new with IRA withdrawal):
 * same cost structure but typically smaller down payment. Cash available =
 * liquid savings + IRA withdrawal net proceeds.
 */
export function calculateUpfrontCapital(
  inputs: UpfrontCapitalInputs
): UpfrontCapital {
  if (inputs.scenario === 'baseline') {
    return {
      totalCashNeeded: 0,
      cashAvailable: inputs.liquidSavings,
      surplus: inputs.liquidSavings,
      downPayment: 0,
      closingCosts: 0,
      movingCosts: 0,
      iraWithdrawalNetProceeds: null,
      homeSaleNetProceeds: null,
    }
  }

  const downPayment = inputs.homePrice * inputs.downPaymentPercent
  const closingCosts = inputs.homePrice * inputs.closingCostsRate
  const totalCashNeeded = downPayment + closingCosts + inputs.movingCosts

  // Scenario A uses home sale proceeds; Scenario B uses IRA withdrawal proceeds
  const homeSaleNetProceeds =
    inputs.scenario === 'scenarioA' ? (inputs.homeSaleNetProceeds ?? 0) : null
  const iraWithdrawalNetProceeds =
    inputs.scenario === 'scenarioB'
      ? (inputs.iraWithdrawalNetProceeds ?? 0)
      : null

  const additionalProceeds =
    (homeSaleNetProceeds ?? 0) + (iraWithdrawalNetProceeds ?? 0)
  const cashAvailable = inputs.liquidSavings + additionalProceeds
  const surplus = cashAvailable - totalCashNeeded

  return {
    totalCashNeeded,
    cashAvailable,
    surplus,
    downPayment,
    closingCosts,
    movingCosts: inputs.movingCosts,
    iraWithdrawalNetProceeds,
    homeSaleNetProceeds,
  }
}

/**
 * Calculate monthly net cash position (burn rate).
 *
 * This is the single most important number for "can you afford this month
 * to month?" — it shows whether the user is building reserves or bleeding
 * them every month.
 *
 * Net position = (gross income - federal tax) - all obligations + rental cash flow
 *
 * Positive = monthly surplus (building reserves)
 * Negative = monthly deficit (depleting reserves)
 */
export function monthlyBurnRate(inputs: MonthlyBurnRateInputs): number {
  const monthlyNetIncome = inputs.monthlyGrossIncome - inputs.monthlyFederalTax

  const totalMonthlyObligations =
    inputs.primaryMortgagePI +
    inputs.primaryPropertyTaxMonthly +
    inputs.primaryInsuranceMonthly +
    inputs.primaryPMIMonthly +
    inputs.monthlyLivingExpenses +
    inputs.monthlyDebtPayments

  const rentalCashFlow = inputs.rentalNetCashFlow ?? 0

  return monthlyNetIncome - totalMonthlyObligations + rentalCashFlow
}

/**
 * Calculate how many months of reserves remain given current liquid savings
 * and monthly burn rate.
 *
 * If the burn rate is non-negative (surplus or break-even), reserves never
 * deplete → returns Infinity.
 *
 * If the burn rate is negative and savings are zero or negative, the user
 * is already in crisis → returns 0.
 *
 * Otherwise, returns the number of months until reserves hit zero:
 * months = postClosingLiquidSavings / |monthlyBurnRate|
 */
export function reserveRunwayMonths(
  postClosingLiquidSavings: number,
  monthlyBurnRateValue: number
): number {
  if (postClosingLiquidSavings <= 0) {
    return 0
  }

  if (monthlyBurnRateValue >= 0) {
    return Infinity
  }

  return postClosingLiquidSavings / Math.abs(monthlyBurnRateValue)
}

/**
 * Run three stress test scenarios to show how resilient the user's financial
 * position is to common shocks:
 *
 * 1. **Vacancy + Maintenance:** 3 months of lost rent plus a major $8,000
 *    repair (HVAC, roof, plumbing). This is the most common shock for new
 *    landlords and the one most likely to force a distressed sale.
 *
 * 2. **Income Disruption:** 20% income reduction (layoff, reduced hours,
 *    forced job change). Shows how many months until reserves are exhausted
 *    if obligations stay the same but income drops.
 *
 * 3. **Market Downturn:** 10% home value decline. Shows whether the rental
 *    property goes underwater and what a forced sale would cost.
 */
export function stressTest(inputs: StressTestInputs): StressTestResult {
  // ---- Scenario 1: Vacancy + Maintenance Shock ----
  // Shock = 3 months of lost rent (vacancy) + major repair cost
  const shockCost =
    VACANCY_SHOCK_MONTHS * inputs.monthlyRent + MAJOR_REPAIR_COST
  const remainingReservesAfterShock = inputs.postClosingReserves - shockCost

  let vacancyMonthsOfReserves: number
  if (remainingReservesAfterShock <= 0) {
    // Reserves wiped out by the shock itself
    vacancyMonthsOfReserves = 0
  } else if (inputs.monthlyNetPosition >= 0) {
    // Positive cash flow means remaining reserves never deplete
    vacancyMonthsOfReserves = Infinity
  } else {
    // Negative cash flow drains remaining reserves over time
    vacancyMonthsOfReserves =
      remainingReservesAfterShock / Math.abs(inputs.monthlyNetPosition)
  }

  // ---- Scenario 2: Income Disruption ----
  // Assume 20% income reduction; obligations stay the same
  const reducedMonthlyIncome =
    inputs.monthlyGrossIncome * INCOME_DISRUPTION_FACTOR
  const rawShortfall = inputs.monthlyObligations - reducedMonthlyIncome
  // If reduced income still covers obligations, there's no shortfall
  const monthlyShortfall = Math.max(0, rawShortfall)

  let monthsUntilCrisis: number
  if (monthlyShortfall <= 0) {
    // Even at 80% income, obligations are covered
    monthsUntilCrisis = Infinity
  } else {
    monthsUntilCrisis = inputs.postClosingReserves / monthlyShortfall
  }

  // ---- Scenario 3: Market Downturn ----
  // 10% home value decline
  const currentEquity = inputs.homeValue - inputs.mortgageBalance
  const newValue = inputs.homeValue * MARKET_DOWNTURN_FACTOR
  const newEquity = newValue - inputs.mortgageBalance
  const underwaterBy = Math.max(0, -newEquity)

  // If underwater, a forced sale means paying selling costs PLUS bringing
  // cash to the table to cover the shortfall between sale proceeds and
  // mortgage payoff
  const forcedSaleLoss =
    underwaterBy > 0 ? newValue * inputs.sellingCostRate + underwaterBy : 0

  return {
    vacancyAndMaintenance: {
      shockCost,
      monthsOfReserves: vacancyMonthsOfReserves,
    },
    incomeDisruption: {
      reducedMonthlyIncome,
      monthlyShortfall,
      monthsUntilCrisis,
    },
    marketDownturn: {
      currentEquity,
      newEquity,
      underwaterBy,
      forcedSaleLoss,
    },
  }
}
