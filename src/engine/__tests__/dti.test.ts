// ---------------------------------------------------------------------------
// dti.test.ts — Unit tests for debt-to-income ratio calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
//
// DTI ratios are the primary gatekeeper for mortgage approval. Lenders use
// front-end DTI (housing only) and back-end DTI (all debts) to determine
// whether a borrower can afford their obligations.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { frontEndDTI, backEndDTI, calculateDTI } from '../dti'
import { calculateMonthlyPayment, calculateOriginalLoanAmount } from '../mortgage'
import {
  DTI_HARD_MAX,
  RENTAL_INCOME_DTI_CREDIT_RATE,
} from '../constants'

// ---------------------------------------------------------------------------
// Helper: Compute Preston's mortgage payments for use in DTI tests
// ---------------------------------------------------------------------------

// new home home: $300,000 purchase price
// Scenario A: 20% down → $240,000 loan at 6% for 30 years
const austinLoanScenarioA = 300_000 * (1 - 0.20) // $240,000
const austinPIScenarioA = calculateMonthlyPayment(austinLoanScenarioA, 0.06, 30)
// Verified: ~$1,438.92 (from mortgage tests)

// Scenario B: 10% down → $270,000 loan at 6% for 30 years
const austinLoanScenarioB = 300_000 * (1 - 0.10) // $270,000
const austinPIScenarioB = calculateMonthlyPayment(austinLoanScenarioB, 0.06, 30)
// Verified: ~$1,618.79

// new home PITI components (same for both scenarios except PI and PMI):
const austinMonthlyPropertyTax = 300_000 * 0.02 / 12 // $500/month
const austinMonthlyInsurance = 2_400 / 12              // $200/month

// Scenario A new home PITI (no PMI at 20% down):
// PI (~$1,438.92) + tax ($500) + insurance ($200) = ~$2,138.92
const austinPITIScenarioA = austinPIScenarioA + austinMonthlyPropertyTax + austinMonthlyInsurance

// Scenario B new home PITI + PMI (10% down, LTV = 90% > 80%):
// PMI = $270,000 × 0.007 / 12 = $157.50/month
const austinMonthlyPMI = austinLoanScenarioB * 0.007 / 12 // $157.50
// PI (~$1,618.79) + tax ($500) + insurance ($200) + PMI ($157.50) = ~$2,476.29
const austinPITIScenarioB = austinPIScenarioB + austinMonthlyPropertyTax + austinMonthlyInsurance + austinMonthlyPMI

// current home rental property: $270,000 home, $199,000 balance, 2% rate, 30yr, 5yrs in
// Back-calculate original loan to get correct P&I
const kyleOriginalLoan = calculateOriginalLoanAmount(199_000, 0.02, 30, 5)
const kyleMortgagePI = calculateMonthlyPayment(kyleOriginalLoan, 0.02, 30)
// Verified: ~$843 (from mortgage tests)

// current home rental PITI (full rate, no homestead exemption on rental property):
// Property tax: $270,000 × 0.0215 / 12 = $483.75/month
// Insurance: $2,400 × 1.20 / 12 = $240/month (landlord premium increase)
// Note: rentalMortgagePayment in DTI should be the FULL PITI, not just P&I
const kyleMonthlyPropertyTax = 270_000 * 0.0215 / 12  // $483.75
const kyleMonthlyInsurance = (2_400 * 1.20) / 12       // $240.00
const kyleRentalPITI = kyleMortgagePI + kyleMonthlyPropertyTax + kyleMonthlyInsurance
// ~$843 + $483.75 + $240 = ~$1,566.75

// Gross monthly income: $100,000 / 12 = $8,333.33
const grossMonthlyIncome = 100_000 / 12

// ---------------------------------------------------------------------------
// frontEndDTI tests
// ---------------------------------------------------------------------------

describe('frontEndDTI', () => {
  it('calculates front-end DTI for Scenario A (new home, 20% down)', () => {
    // Front-end DTI = housing cost / gross monthly income
    // = $2,138.92 / $8,333.33
    // = 0.2567 (25.67%)
    const result = frontEndDTI(austinPITIScenarioA, grossMonthlyIncome)
    expect(result).toBeCloseTo(0.2567, 3)
  })

  it('calculates front-end DTI for Scenario B (new home, 10% down + PMI)', () => {
    // Front-end DTI = $2,476.29 / $8,333.33 = 0.2972 (29.72%)
    const result = frontEndDTI(austinPITIScenarioB, grossMonthlyIncome)
    expect(result).toBeCloseTo(0.2972, 3)
  })

  it('returns Infinity when gross monthly income is zero', () => {
    // Edge case: division by zero should return Infinity, not NaN or error
    expect(frontEndDTI(2000, 0)).toBe(Infinity)
  })

  it('returns 0 when housing cost is zero', () => {
    // Baseline scenario — no housing payment (fully owned or rent-free)
    expect(frontEndDTI(0, grossMonthlyIncome)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// backEndDTI tests
// ---------------------------------------------------------------------------

describe('backEndDTI', () => {
  it('calculates back-end DTI for Scenario A (no rental, no other debts)', () => {
    // Back-end DTI = (primary housing + other debts) / gross monthly income
    // = ($2,138.92 + $0) / $8,333.33
    // = 0.2567 (same as front-end when there are no other debts)
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioA,
      otherDebtPayments: 0,
      grossMonthlyIncome,
    })
    expect(result).toBeCloseTo(0.2567, 3)
  })

  it('calculates back-end DTI for Scenario A with other debts', () => {
    // Adding $500/month car payment
    // Back-end = ($2,138.92 + $500) / $8,333.33
    // = $2,638.92 / $8,333.33
    // = 0.3167 (31.67%)
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioA,
      otherDebtPayments: 500,
      grossMonthlyIncome,
    })
    expect(result).toBeCloseTo(0.3167, 3)
  })

  it('calculates back-end DTI for Scenario B (two mortgages, rental income credit)', () => {
    // Effective rental debt = rentalPITI - (rent × credit rate)
    // = $1,566.75 - ($2,000 × 0.75)
    // = $1,566.75 - $1,500
    // = $66.75 (floored at 0, but positive here)
    //
    // Total debt = new home PITI + effective rental debt + other debts
    // = $2,476.29 + $66.75 + $0
    // = $2,543.04
    //
    // Back-end DTI = $2,543.04 / $8,333.33 = 0.3052 (30.52%)
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      grossMonthlyIncome,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
      rentalIncomeCredit: RENTAL_INCOME_DTI_CREDIT_RATE,
    })
    expect(result).toBeCloseTo(0.3052, 3)
  })

  it('uses default RENTAL_INCOME_DTI_CREDIT_RATE (0.75) when rentalIncomeCredit is not provided', () => {
    // Same calculation as above, relying on the default credit rate
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      grossMonthlyIncome,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
    })
    expect(result).toBeCloseTo(0.3052, 3)
  })

  it('floors effective rental debt at 0 when rental income exceeds PITI', () => {
    // If rent is very high relative to PITI, lenders do NOT count
    // excess rental income as positive income in DTI calculations.
    // Rent = $3,000, credit = $3,000 × 0.75 = $2,250
    // Effective rental debt = max(0, $1,566.75 - $2,250) = max(0, -$683.25) = $0
    // Back-end DTI = ($2,476.29 + $0 + $0) / $8,333.33 = 0.2972
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      grossMonthlyIncome,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 3_000,
      rentalIncomeCredit: RENTAL_INCOME_DTI_CREDIT_RATE,
    })
    expect(result).toBeCloseTo(0.2972, 3)
  })

  it('handles low rent scenario where rental debt significantly increases DTI', () => {
    // Low rent = $800, credit = $800 × 0.75 = $600
    // Effective rental debt = max(0, $1,566.75 - $600) = $966.75
    // Total debt = $2,476.29 + $966.75 + $0 = $3,443.04
    // Back-end DTI = $3,443.04 / $8,333.33 = 0.4132 (41.32%)
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      grossMonthlyIncome,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 800,
      rentalIncomeCredit: RENTAL_INCOME_DTI_CREDIT_RATE,
    })
    expect(result).toBeCloseTo(0.4132, 3)
  })

  it('returns Infinity when gross monthly income is zero', () => {
    expect(
      backEndDTI({
        primaryHousingCost: 2000,
        otherDebtPayments: 500,
        grossMonthlyIncome: 0,
      })
    ).toBe(Infinity)
  })

  it('returns 0 when all debts are zero', () => {
    expect(
      backEndDTI({
        primaryHousingCost: 0,
        otherDebtPayments: 0,
        grossMonthlyIncome,
      })
    ).toBe(0)
  })

  it('supports custom rental income credit rate (e.g., 0% for new landlords)', () => {
    // Some lenders credit 0% rental income for borrowers with no landlord history
    // Effective rental debt = max(0, $1,566.75 - ($2,000 × 0)) = $1,566.75
    // Total debt = $2,476.29 + $1,566.75 + $0 = $4,043.04
    // Back-end DTI = $4,043.04 / $8,333.33 = 0.4852 (48.52%)
    const result = backEndDTI({
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      grossMonthlyIncome,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
      rentalIncomeCredit: 0,
    })
    expect(result).toBeCloseTo(0.4852, 3)
  })
})

// ---------------------------------------------------------------------------
// calculateDTI tests
// ---------------------------------------------------------------------------

describe('calculateDTI', () => {
  it('calculates DTI for Scenario A (single mortgage, no rental)', () => {
    // Front-end = $2,138.92 / $8,333.33 = 0.2567
    // Back-end = ($2,138.92 + $0) / $8,333.33 = 0.2567
    // passesLenderThreshold = 0.2567 ≤ 0.43 = true
    // rentalIncomeCredit = 0 (not scenario B)
    const result = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome,
      primaryHousingCost: austinPITIScenarioA,
      otherDebtPayments: 0,
    })
    expect(result.frontEndDTI).toBeCloseTo(0.2567, 3)
    expect(result.backEndDTI).toBeCloseTo(0.2567, 3)
    expect(result.passesLenderThreshold).toBe(true)
    expect(result.rentalIncomeCredit).toBe(0)
  })

  it('calculates DTI for Scenario B (two mortgages, rental income offset)', () => {
    // Front-end = $2,476.29 / $8,333.33 = 0.2972
    // Back-end = ($2,476.29 + max(0, $1,566.75 - $1,500) + $0) / $8,333.33
    //          = $2,543.04 / $8,333.33 = 0.3052
    // passesLenderThreshold = 0.3052 ≤ 0.43 = true
    // rentalIncomeCredit = $2,000 × 0.75 = $1,500
    const result = calculateDTI({
      scenario: 'scenarioB',
      grossMonthlyIncome,
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
      rentalIncomeCreditRate: RENTAL_INCOME_DTI_CREDIT_RATE,
    })
    expect(result.frontEndDTI).toBeCloseTo(0.2972, 3)
    expect(result.backEndDTI).toBeCloseTo(0.3052, 3)
    expect(result.passesLenderThreshold).toBe(true)
    expect(result.rentalIncomeCredit).toBeCloseTo(1_500, 0)
  })

  it('calculates DTI for baseline scenario', () => {
    // Baseline: stay in current home, existing mortgage only
    // current home PITI as primary residence (with homestead exemption — different rate)
    // For this test, just use a simple housing cost
    const baselineHousingCost = 1_200
    const result = calculateDTI({
      scenario: 'baseline',
      grossMonthlyIncome,
      primaryHousingCost: baselineHousingCost,
      otherDebtPayments: 0,
    })
    // Front-end = $1,200 / $8,333.33 = 0.1440
    expect(result.frontEndDTI).toBeCloseTo(0.1440, 3)
    expect(result.backEndDTI).toBeCloseTo(0.1440, 3)
    expect(result.passesLenderThreshold).toBe(true)
    expect(result.rentalIncomeCredit).toBe(0)
  })

  it('uses default RENTAL_INCOME_DTI_CREDIT_RATE when rentalIncomeCreditRate is not provided for Scenario B', () => {
    const result = calculateDTI({
      scenario: 'scenarioB',
      grossMonthlyIncome,
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
    })
    // Should use default 0.75 credit rate
    expect(result.rentalIncomeCredit).toBeCloseTo(1_500, 0)
    expect(result.backEndDTI).toBeCloseTo(0.3052, 3)
  })

  it('fails lender threshold when back-end DTI exceeds DTI_HARD_MAX (0.43)', () => {
    // Construct inputs to push DTI above 0.43
    // Using 0% rental income credit (new landlord) with Scenario B
    // Back-end = ($2,476.29 + $1,566.75 + $0) / $8,333.33
    //          = $4,043.04 / $8,333.33 = 0.4852
    const result = calculateDTI({
      scenario: 'scenarioB',
      grossMonthlyIncome,
      primaryHousingCost: austinPITIScenarioB,
      otherDebtPayments: 0,
      rentalMortgagePayment: kyleRentalPITI,
      expectedMonthlyRent: 2_000,
      rentalIncomeCreditRate: 0, // Lender credits 0% for new landlords
    })
    expect(result.backEndDTI).toBeCloseTo(0.4852, 3)
    expect(result.passesLenderThreshold).toBe(false)
  })

  it('passes lender threshold at exactly DTI_HARD_MAX (0.43)', () => {
    // Construct inputs where back-end DTI = exactly 0.43
    // totalDebt / income = 0.43 → totalDebt = 0.43 × $8,333.33 = $3,583.33
    const totalDebtForThreshold = DTI_HARD_MAX * grossMonthlyIncome
    const result = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome,
      primaryHousingCost: totalDebtForThreshold,
      otherDebtPayments: 0,
    })
    expect(result.backEndDTI).toBeCloseTo(DTI_HARD_MAX, 6)
    expect(result.passesLenderThreshold).toBe(true)
  })

  it('fails lender threshold just above DTI_HARD_MAX', () => {
    // DTI = 0.431 — just above the hard max
    const totalDebt = 0.431 * grossMonthlyIncome
    const result = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome,
      primaryHousingCost: totalDebt,
      otherDebtPayments: 0,
    })
    expect(result.backEndDTI).toBeCloseTo(0.431, 3)
    expect(result.passesLenderThreshold).toBe(false)
  })

  it('handles zero income (Infinity DTI)', () => {
    const result = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome: 0,
      primaryHousingCost: 2_000,
      otherDebtPayments: 0,
    })
    expect(result.frontEndDTI).toBe(Infinity)
    expect(result.backEndDTI).toBe(Infinity)
    expect(result.passesLenderThreshold).toBe(false)
  })

  it('handles zero debt (0 DTI)', () => {
    const result = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome,
      primaryHousingCost: 0,
      otherDebtPayments: 0,
    })
    expect(result.frontEndDTI).toBe(0)
    expect(result.backEndDTI).toBe(0)
    expect(result.passesLenderThreshold).toBe(true)
    expect(result.rentalIncomeCredit).toBe(0)
  })

  it('sets rentalIncomeCredit to 0 for non-Scenario-B scenarios', () => {
    // Even if rental fields are somehow passed, non-B scenarios should not
    // apply rental income credit
    const resultA = calculateDTI({
      scenario: 'scenarioA',
      grossMonthlyIncome,
      primaryHousingCost: 2_000,
      otherDebtPayments: 0,
      rentalMortgagePayment: 1_500,
      expectedMonthlyRent: 2_000,
    })
    expect(resultA.rentalIncomeCredit).toBe(0)

    const resultBaseline = calculateDTI({
      scenario: 'baseline',
      grossMonthlyIncome,
      primaryHousingCost: 1_200,
      otherDebtPayments: 0,
    })
    expect(resultBaseline.rentalIncomeCredit).toBe(0)
  })
})
