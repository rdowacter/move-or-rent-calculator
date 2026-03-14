// ---------------------------------------------------------------------------
// dti.ts — Debt-to-Income ratio calculations
//
// DTI ratios are the primary gatekeeper for mortgage approval. Lenders use
// two ratios:
//   - Front-end DTI: housing costs only / gross monthly income (target ≤ 28%)
//   - Back-end DTI: all debt obligations / gross monthly income (target ≤ 36%,
//     hard max 43% for Qualified Mortgages)
//
// For borrowers with rental property (Scenario B), lenders offset the rental
// mortgage payment by a percentage of expected rental income (typically 75%,
// per Fannie Mae Selling Guide B3-3.1-08). Excess rental income above the
// mortgage payment is NOT counted as positive income in DTI — the floor is 0.
//
// This module has ZERO UI dependencies and is fully testable in isolation.
// ---------------------------------------------------------------------------

import {
  DTI_HARD_MAX,
  RENTAL_INCOME_DTI_CREDIT_RATE,
} from './constants'
import type { DTIResult } from './types'

/**
 * Calculates the front-end DTI ratio (housing costs only).
 *
 * Front-end DTI = monthlyHousingCost / grossMonthlyIncome
 * where housing cost includes PITI (principal, interest, taxes, insurance)
 * plus PMI and HOA for the primary residence.
 *
 * @param monthlyHousingCost - Total monthly housing cost (PITI + PMI + HOA)
 * @param grossMonthlyIncome - Gross monthly income before taxes
 * @returns Front-end DTI as a decimal (e.g., 0.28 for 28%)
 */
export function frontEndDTI(
  monthlyHousingCost: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome === 0) return Infinity
  return monthlyHousingCost / grossMonthlyIncome
}

/**
 * Input parameters for back-end DTI calculation.
 */
export interface BackEndDTIInputs {
  /** Total monthly primary residence cost (PITI + PMI + HOA). */
  primaryHousingCost: number
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  otherDebtPayments: number
  /** Gross monthly income before taxes. */
  grossMonthlyIncome: number
  /**
   * Full monthly PITI for the rental property (mortgage P&I + property tax
   * + insurance). IMPORTANT: this must be the FULL rental PITI, not just the
   * P&I component, because lenders evaluate the total housing obligation on
   * each property when computing DTI.
   */
  rentalMortgagePayment?: number
  /** Expected gross monthly rent from the rental property. */
  expectedMonthlyRent?: number
  /**
   * Percentage of rental income credited by the lender (defaults to
   * RENTAL_INCOME_DTI_CREDIT_RATE = 0.75). Some lenders use 0% for
   * borrowers with no landlord history.
   */
  rentalIncomeCredit?: number
}

/**
 * Calculates the back-end DTI ratio (all debts).
 *
 * For borrowers without rental property:
 *   back-end DTI = (primaryHousingCost + otherDebtPayments) / grossMonthlyIncome
 *
 * For borrowers with rental property (Scenario B):
 *   effectiveRentalDebt = rentalPITI - (expectedRent × creditRate)
 *   Floored at 0 — lenders do NOT count excess rental income as positive income.
 *   back-end DTI = (primaryHousing + max(0, effectiveRentalDebt) + otherDebts) / income
 *
 * @returns Back-end DTI as a decimal (e.g., 0.36 for 36%)
 */
export function backEndDTI(inputs: BackEndDTIInputs): number {
  const {
    primaryHousingCost,
    otherDebtPayments,
    grossMonthlyIncome,
    rentalMortgagePayment,
    expectedMonthlyRent,
    rentalIncomeCredit,
  } = inputs

  if (grossMonthlyIncome === 0) return Infinity

  let totalDebt = primaryHousingCost + otherDebtPayments

  // If rental property fields are provided, compute the effective rental debt
  // after applying the lender's rental income credit
  if (rentalMortgagePayment !== undefined && expectedMonthlyRent !== undefined) {
    const creditRate = rentalIncomeCredit ?? RENTAL_INCOME_DTI_CREDIT_RATE
    const rentalIncomeOffset = expectedMonthlyRent * creditRate

    // Effective rental debt = rental PITI minus credited rental income.
    // Floored at 0: lenders don't count excess rental income as positive
    // income in the DTI calculation — it can only reduce the rental
    // mortgage obligation, not offset other debts.
    const effectiveRentalDebt = Math.max(0, rentalMortgagePayment - rentalIncomeOffset)
    totalDebt += effectiveRentalDebt
  }

  return totalDebt / grossMonthlyIncome
}

/**
 * Input parameters for the full DTI calculation.
 */
export interface CalculateDTIInputs {
  /** Which scenario is being evaluated. */
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  /** Gross monthly income before taxes. */
  grossMonthlyIncome: number
  /** Total monthly primary residence cost (PITI + PMI + HOA). */
  primaryHousingCost: number
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  otherDebtPayments: number
  /**
   * Full monthly PITI for the rental property. IMPORTANT: this must include
   * mortgage P&I + property tax + insurance — not just P&I — because lenders
   * evaluate the total housing obligation when computing DTI.
   */
  rentalMortgagePayment?: number
  /** Expected gross monthly rent from the rental property. */
  expectedMonthlyRent?: number
  /**
   * Lender's rental income credit rate (defaults to RENTAL_INCOME_DTI_CREDIT_RATE).
   * Per Fannie Mae Selling Guide B3-3.1-08, lenders typically credit 75% of
   * expected rental income. Some lenders use 0% for new landlords.
   */
  rentalIncomeCreditRate?: number
}

/**
 * Calculates the complete DTI result for a given scenario.
 *
 * Computes front-end DTI (housing only), back-end DTI (all debts with
 * rental income offset for Scenario B), and determines whether the
 * borrower passes the lender's hard maximum threshold.
 *
 * @returns DTIResult with frontEndDTI, backEndDTI, passesLenderThreshold,
 *          and rentalIncomeCredit
 */
export function calculateDTI(inputs: CalculateDTIInputs): DTIResult {
  const {
    scenario,
    grossMonthlyIncome,
    primaryHousingCost,
    otherDebtPayments,
    rentalMortgagePayment,
    expectedMonthlyRent,
    rentalIncomeCreditRate,
  } = inputs

  const creditRate = rentalIncomeCreditRate ?? RENTAL_INCOME_DTI_CREDIT_RATE

  // Only Scenario B involves a rental property with income offset
  const isRentalScenario = scenario === 'scenarioB'

  const frontEnd = frontEndDTI(primaryHousingCost, grossMonthlyIncome)

  // Rental income credit is only applied in Scenario B when BOTH rental mortgage
  // payment and expected rent are defined — matching the condition used in
  // backEndDTI to actually apply the offset. Without both values, the credit
  // is meaningless and would be inconsistent with the DTI calculation.
  const rentalIncomeCredit =
    isRentalScenario &&
    rentalMortgagePayment !== undefined &&
    expectedMonthlyRent !== undefined
      ? expectedMonthlyRent * creditRate
      : 0

  const backEnd = backEndDTI({
    primaryHousingCost,
    otherDebtPayments,
    grossMonthlyIncome,
    // Only pass rental fields for Scenario B
    rentalMortgagePayment: isRentalScenario ? rentalMortgagePayment : undefined,
    expectedMonthlyRent: isRentalScenario ? expectedMonthlyRent : undefined,
    rentalIncomeCredit: isRentalScenario ? creditRate : undefined,
  })

  // Qualified Mortgage threshold: back-end DTI must not exceed 43%
  // per CFPB Qualified Mortgage Rule (12 CFR §1026.43(e)(2))
  const passesLenderThreshold = backEnd <= DTI_HARD_MAX

  return {
    frontEndDTI: frontEnd,
    backEndDTI: backEnd,
    passesLenderThreshold,
    rentalIncomeCredit,
  }
}
