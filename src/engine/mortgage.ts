// ---------------------------------------------------------------------------
// mortgage.ts — Mortgage amortization calculations
//
// Pure financial math functions for mortgage payment, balance, and
// interest/principal breakdowns. These functions have ZERO UI dependencies
// and are fully testable in isolation.
//
// All formulas use the standard amortization model:
//   Payment = P × [r(1+r)^n] / [(1+r)^n - 1]
// where P = principal, r = monthly interest rate, n = total number of payments.
// ---------------------------------------------------------------------------

import { MONTHS_PER_YEAR } from './constants'

/**
 * Calculates the monthly principal & interest payment for a fixed-rate mortgage.
 *
 * Uses the standard amortization formula. Handles the 0% interest edge case
 * (where the formula would divide by zero) by falling back to simple division.
 *
 * @param principal - Loan amount in dollars
 * @param annualRate - Annual interest rate as a decimal (e.g. 0.06 for 6%)
 * @param termYears - Loan term in years
 * @returns Monthly P&I payment in dollars
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal === 0 || termYears <= 0) return 0

  const totalPayments = termYears * MONTHS_PER_YEAR

  // Edge case: 0% interest — the standard formula divides by zero because
  // (1+0)^n - 1 = 0. At 0% interest, the payment is simply principal spread
  // evenly across all months.
  if (annualRate === 0) {
    return principal / totalPayments
  }

  const monthlyRate = annualRate / MONTHS_PER_YEAR

  // Standard amortization formula:
  // Payment = P × [r(1+r)^n] / [(1+r)^n - 1]
  const compoundFactor = Math.pow(1 + monthlyRate, totalPayments)
  const numerator = principal * monthlyRate * compoundFactor
  const denominator = compoundFactor - 1

  return numerator / denominator
}

/**
 * Calculates the remaining mortgage balance after a given number of payments.
 *
 * Uses the balance formula: B = P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 * where p = number of payments already made.
 *
 * @param principal - Original loan amount in dollars
 * @param annualRate - Annual interest rate as a decimal
 * @param termYears - Original loan term in years
 * @param paymentsMade - Number of monthly payments already made
 * @returns Remaining balance in dollars
 */
export function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  paymentsMade: number
): number {
  if (principal === 0) return 0

  const totalPayments = termYears * MONTHS_PER_YEAR

  // Loan is fully paid off
  if (paymentsMade >= totalPayments) return 0

  // Edge case: 0% interest — balance decreases linearly
  if (annualRate === 0) {
    const remainingPayments = totalPayments - paymentsMade
    return principal * (remainingPayments / totalPayments)
  }

  const monthlyRate = annualRate / MONTHS_PER_YEAR

  // Remaining balance formula:
  // B = P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
  const compoundTotal = Math.pow(1 + monthlyRate, totalPayments)
  const compoundPayments = Math.pow(1 + monthlyRate, paymentsMade)
  const numerator = compoundTotal - compoundPayments
  const denominator = compoundTotal - 1

  return principal * (numerator / denominator)
}

/**
 * Back-calculates the original loan amount from the current balance.
 *
 * This is the inverse of calculateRemainingBalance. Needed because a user
 * typically knows their current balance and years into the loan, but the
 * amortization engine needs the original principal to compute interest/principal
 * splits accurately.
 *
 * Formula derivation (inverse of remaining balance):
 *   If B = P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 *   Then P = B × [(1+r)^n - 1] / [(1+r)^n - (1+r)^p]
 *
 * @param currentBalance - Current remaining mortgage balance in dollars
 * @param annualRate - Annual interest rate as a decimal
 * @param originalTermYears - Original loan term in years
 * @param yearsElapsed - Number of years already into the loan
 * @returns Estimated original loan amount in dollars
 */
export function calculateOriginalLoanAmount(
  currentBalance: number,
  annualRate: number,
  originalTermYears: number,
  yearsElapsed: number
): number {
  if (currentBalance === 0) return 0

  const totalPayments = originalTermYears * MONTHS_PER_YEAR
  const paymentsMade = yearsElapsed * MONTHS_PER_YEAR

  // Edge case: 0 years elapsed — original loan equals current balance
  if (yearsElapsed === 0) return currentBalance

  // Cannot back-calculate when loan is fully paid — any original amount
  // could produce a zero balance. Return 0 as a safe fallback.
  if (paymentsMade >= totalPayments) return 0

  // Edge case: 0% interest — balance decreases linearly
  // B = P × (n - p) / n → P = B × n / (n - p)
  if (annualRate === 0) {
    const remainingPayments = totalPayments - paymentsMade
    return currentBalance * (totalPayments / remainingPayments)
  }

  const monthlyRate = annualRate / MONTHS_PER_YEAR

  // Inverse of the remaining balance formula:
  // P = B × [(1+r)^n - 1] / [(1+r)^n - (1+r)^p]
  const compoundTotal = Math.pow(1 + monthlyRate, totalPayments)
  const compoundPayments = Math.pow(1 + monthlyRate, paymentsMade)
  const numerator = compoundTotal - 1
  const denominator = compoundTotal - compoundPayments

  return currentBalance * (numerator / denominator)
}

/**
 * Calculates the total interest portion of payments in a given year.
 *
 * Iterates through each of the 12 monthly payments in the specified year,
 * computing the interest portion of each payment based on the outstanding
 * balance at that point. This is critical for Schedule E rental deductions
 * where mortgage interest is a deductible expense.
 *
 * @param principal - Original loan amount in dollars
 * @param annualRate - Annual interest rate as a decimal
 * @param termYears - Original loan term in years
 * @param year - Year number (1-indexed: year 1 = months 1-12)
 * @returns Total interest paid during that year in dollars
 */
export function calculateYearInterestPaid(
  principal: number,
  annualRate: number,
  termYears: number,
  year: number
): number {
  if (principal === 0 || annualRate === 0) return 0

  const totalPayments = termYears * MONTHS_PER_YEAR
  const paymentsBeforeThisYear = (year - 1) * MONTHS_PER_YEAR

  // Loan is fully paid off — no interest accrues after the final payment
  if (paymentsBeforeThisYear >= totalPayments) return 0

  const monthlyRate = annualRate / MONTHS_PER_YEAR
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears)

  // Start from the balance at the beginning of this year
  // (i.e., after all payments in previous years)
  let balance = calculateRemainingBalance(
    principal,
    annualRate,
    termYears,
    paymentsBeforeThisYear
  )

  // In the final year, fewer than 12 payments may remain
  const paymentsInThisYear = Math.min(
    MONTHS_PER_YEAR,
    totalPayments - paymentsBeforeThisYear
  )

  let totalInterest = 0
  for (let month = 0; month < paymentsInThisYear; month++) {
    // Interest portion = outstanding balance × monthly rate
    const interestPayment = balance * monthlyRate
    totalInterest += interestPayment

    // Principal portion reduces the balance
    const principalPayment = monthlyPayment - interestPayment
    balance -= principalPayment
  }

  return totalInterest
}

/**
 * Calculates the total principal portion of payments in a given year.
 *
 * This is the complement of calculateYearInterestPaid: for any year,
 * interest + principal = 12 × monthly payment.
 *
 * @param principal - Original loan amount in dollars
 * @param annualRate - Annual interest rate as a decimal
 * @param termYears - Original loan term in years
 * @param year - Year number (1-indexed: year 1 = months 1-12)
 * @returns Total principal paid during that year in dollars
 */
export function calculateYearPrincipalPaid(
  principal: number,
  annualRate: number,
  termYears: number,
  year: number
): number {
  if (principal === 0) return 0

  const totalPayments = termYears * MONTHS_PER_YEAR
  const paymentsBeforeThisYear = (year - 1) * MONTHS_PER_YEAR

  // Loan is fully paid off — no principal payments after the final payment
  if (paymentsBeforeThisYear >= totalPayments) return 0

  // In the final year, fewer than 12 payments may remain
  const paymentsInThisYear = Math.min(
    MONTHS_PER_YEAR,
    totalPayments - paymentsBeforeThisYear
  )

  // At 0% interest, every payment is pure principal
  // Monthly payment = principal / total months
  if (annualRate === 0) {
    const monthlyPayment = principal / totalPayments
    return monthlyPayment * paymentsInThisYear
  }

  // Principal = total payments in the year minus interest portion
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears)
  const yearInterest = calculateYearInterestPaid(principal, annualRate, termYears, year)

  return monthlyPayment * paymentsInThisYear - yearInterest
}
