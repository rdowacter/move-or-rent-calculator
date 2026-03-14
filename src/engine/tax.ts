// ---------------------------------------------------------------------------
// tax.ts — Federal income tax and IRA withdrawal tax calculations
//
// This module implements marginal (progressive) tax bracket math, standard
// deduction lookups, and the critical IRA early withdrawal tax/penalty
// calculation. All functions are pure — no side effects, no UI dependencies.
//
// Tax data source: 2024 IRS Rev. Proc. 2023-34
// Early withdrawal penalty: IRC §72(t)
// ---------------------------------------------------------------------------

import type { FilingStatus, IRAType } from './types'
import {
  FEDERAL_TAX_BRACKETS,
  STANDARD_DEDUCTION,
  EARLY_WITHDRAWAL_PENALTY_RATE,
  EARLY_WITHDRAWAL_AGE_THRESHOLD,
} from './constants'

/** Result of calculating the tax impact of an IRA withdrawal. */
export interface IRAWithdrawalTaxResult {
  /** Federal income tax attributable to the withdrawal (incremental method). */
  federalTax: number
  /** 10% early withdrawal penalty if age < 59.5 (IRC §72(t)). */
  earlyWithdrawalPenalty: number
  /** Total tax burden = federalTax + earlyWithdrawalPenalty. */
  totalTax: number
  /** Cash the withdrawer actually receives = withdrawal - totalTax. */
  netProceeds: number
  /** Effective tax rate on the withdrawal = totalTax / withdrawalAmount. */
  effectiveWithdrawalTaxRate: number
}

/**
 * Calculate federal income tax using marginal (progressive) brackets.
 *
 * Walks through each bracket, taxing only the portion of income that falls
 * within that bracket's range. This is how the IRS actually computes tax —
 * NOT by applying a single flat rate to all income.
 *
 * @param taxableIncome - Income after deductions (must be >= 0 for meaningful result)
 * @param filingStatus - IRS filing status determining which bracket schedule to use
 * @returns Total federal income tax owed
 */
export function calculateFederalIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) {
    return 0
  }

  const brackets = FEDERAL_TAX_BRACKETS[filingStatus]
  let totalTax = 0

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) {
      // Income doesn't reach this bracket — stop
      break
    }

    // The taxable amount in this bracket is the lesser of:
    //   - the income above this bracket's floor, or
    //   - the width of this bracket
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    totalTax += taxableInBracket * bracket.rate
  }

  return totalTax
}

/**
 * Returns the marginal tax rate — the rate applied to the taxpayer's last
 * dollar of income. This is the rate that matters for evaluating whether
 * an additional dollar of income (e.g., from an IRA withdrawal) gets taxed.
 *
 * @param taxableIncome - Income after deductions
 * @param filingStatus - IRS filing status
 * @returns Marginal rate as a decimal (e.g., 0.22 for 22%)
 */
export function calculateMarginalTaxRate(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) {
    return 0
  }

  const brackets = FEDERAL_TAX_BRACKETS[filingStatus]

  // Find the bracket that contains the last dollar of income.
  // Brackets are defined as [min, max) — income exactly at a bracket's max
  // value means the last dollar is still in that bracket, because the next
  // bracket's min equals this bracket's max, and the income doesn't exceed it.
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
      return bracket.rate
    }
  }

  // Fallback: income exceeds all brackets (shouldn't happen with Infinity max)
  return brackets[brackets.length - 1].rate
}

/**
 * Returns the effective tax rate — total tax divided by taxable income.
 * This represents the average rate paid across all dollars, as opposed to
 * the marginal rate which is only the rate on the last dollar.
 *
 * @param taxableIncome - Income after deductions
 * @param filingStatus - IRS filing status
 * @returns Effective rate as a decimal (e.g., 0.1621 for 16.21%)
 */
export function calculateEffectiveTaxRate(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) {
    return 0
  }

  const totalTax = calculateFederalIncomeTax(taxableIncome, filingStatus)
  return totalTax / taxableIncome
}

/**
 * Returns the standard deduction for the given filing status.
 * Simple lookup — extracted as a function for consistency with the engine API.
 *
 * @param filingStatus - IRS filing status
 * @returns Standard deduction amount in dollars
 */
export function getStandardDeduction(filingStatus: FilingStatus): number {
  return STANDARD_DEDUCTION[filingStatus]
}

/**
 * Calculate the full tax impact of an IRA withdrawal, including the
 * incremental federal income tax and the early withdrawal penalty.
 *
 * THE CRITICAL FUNCTION. The withdrawal amount stacks ON TOP of the
 * taxpayer's existing salary income. We compute the incremental tax as:
 *   tax(income + withdrawal) − tax(income alone)
 * This correctly captures the marginal bracket impact — the first dollars
 * of the withdrawal fill the remaining space in the current bracket, then
 * overflow into higher brackets.
 *
 * Roth IRA simplification: We assume the entire Roth balance is comprised
 * of contributions (not earnings). Under IRS ordering rules, Roth
 * contributions come out first, tax-free and penalty-free at any age.
 * Earnings withdrawn before age 59.5 from a non-qualified distribution
 * would be taxed and penalized, but modeling the contribution/earnings
 * split requires data we don't collect. This simplification is noted in
 * the UI.
 *
 * @param withdrawalAmount - Total amount being withdrawn from the IRA
 * @param annualGrossIncome - Taxpayer's annual gross income (before deductions)
 * @param filingStatus - IRS filing status
 * @param age - Taxpayer's current age (for early withdrawal penalty check)
 * @param iraType - 'traditional' or 'roth'
 * @returns Detailed breakdown of taxes, penalties, and net proceeds
 */
export function calculateIRAWithdrawalTax(
  withdrawalAmount: number,
  annualGrossIncome: number,
  filingStatus: FilingStatus,
  age: number,
  iraType: IRAType
): IRAWithdrawalTaxResult {
  // Handle zero withdrawal — no tax event
  if (withdrawalAmount <= 0) {
    return {
      federalTax: 0,
      earlyWithdrawalPenalty: 0,
      totalTax: 0,
      netProceeds: 0,
      effectiveWithdrawalTaxRate: 0,
    }
  }

  // Roth IRA: contributions come out tax-free and penalty-free.
  // See function JSDoc for the simplification assumption.
  if (iraType === 'roth') {
    return {
      federalTax: 0,
      earlyWithdrawalPenalty: 0,
      totalTax: 0,
      netProceeds: withdrawalAmount,
      effectiveWithdrawalTaxRate: 0,
    }
  }

  // Traditional IRA: the entire withdrawal is taxable as ordinary income.
  const standardDeduction = getStandardDeduction(filingStatus)

  // Taxable income WITHOUT the withdrawal
  // (floor at 0 — can't have negative taxable income for this calculation)
  const taxableIncomeWithout = Math.max(0, annualGrossIncome - standardDeduction)

  // Taxable income WITH the withdrawal — the withdrawal stacks on top
  const taxableIncomeWith = Math.max(0, annualGrossIncome + withdrawalAmount - standardDeduction)

  // Incremental federal tax: the additional tax caused solely by the withdrawal
  const taxWithout = calculateFederalIncomeTax(taxableIncomeWithout, filingStatus)
  const taxWith = calculateFederalIncomeTax(taxableIncomeWith, filingStatus)
  const federalTax = taxWith - taxWithout

  // Early withdrawal penalty: 10% of the taxable portion if under age 59.5
  // IRC §72(t): "If any taxpayer receives any amount from a [qualified plan]
  // before the taxpayer attains age 59½, the taxpayer's tax shall be
  // increased by an amount equal to 10% of the portion includible in gross income."
  const earlyWithdrawalPenalty =
    age < EARLY_WITHDRAWAL_AGE_THRESHOLD
      ? withdrawalAmount * EARLY_WITHDRAWAL_PENALTY_RATE
      : 0

  const totalTax = federalTax + earlyWithdrawalPenalty
  const netProceeds = withdrawalAmount - totalTax
  const effectiveWithdrawalTaxRate = totalTax / withdrawalAmount

  return {
    federalTax,
    earlyWithdrawalPenalty,
    totalTax,
    netProceeds,
    effectiveWithdrawalTaxRate,
  }
}
