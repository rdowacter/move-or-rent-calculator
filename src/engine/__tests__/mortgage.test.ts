// ---------------------------------------------------------------------------
// mortgage.test.ts — Unit tests for mortgage amortization calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyPayment,
  calculateRemainingBalance,
  calculateOriginalLoanAmount,
  calculateYearInterestPaid,
  calculateYearPrincipalPaid,
} from '../mortgage'

describe('calculateMonthlyPayment', () => {
  it('calculates monthly P&I on $240,000 at 6% for 30 years', () => {
    // Standard amortization formula:
    // r = 0.06 / 12 = 0.005 (monthly rate)
    // n = 30 × 12 = 360 (total payments)
    // Payment = P × [r(1+r)^n] / [(1+r)^n - 1]
    // (1.005)^360 = 6.022575 (verified via calculator)
    // Numerator = 240000 × 0.005 × 6.022575 = 240000 × 0.030112875 = 7227.09
    // Denominator = 6.022575 - 1 = 5.022575
    // Payment = 7227.09 / 5.022575 = 1438.92
    expect(calculateMonthlyPayment(240_000, 0.06, 30)).toBeCloseTo(1438.92, 0)
  })

  it('calculates monthly P&I on $200,000 at 2% for 30 years', () => {
    // r = 0.02 / 12 = 0.0016667
    // n = 360
    // (1.0016667)^360 = 1.82075 (verified via financial calculator)
    // Numerator = 200000 × 0.0016667 × 1.82075 = 200000 × 0.003034538 = 606.908
    // Denominator = 1.82075 - 1 = 0.82075
    // Payment = 606.908 / 0.82075 = 739.24
    expect(calculateMonthlyPayment(200_000, 0.02, 30)).toBeCloseTo(739.24, 0)
  })

  it('handles 0% interest rate without division by zero', () => {
    // Special case: 0% interest means no interest charges.
    // Monthly payment = principal / total months = 120000 / (10 × 12) = 1000.00
    expect(calculateMonthlyPayment(120_000, 0, 10)).toBeCloseTo(1000.0, 2)
  })

  it('returns 0 when principal is 0', () => {
    expect(calculateMonthlyPayment(0, 0.06, 30)).toBe(0)
  })

  it('returns 0 when principal is 0 and rate is 0', () => {
    expect(calculateMonthlyPayment(0, 0, 30)).toBe(0)
  })

  it('calculates correctly for a 15-year term', () => {
    // $300,000 at 5% for 15 years
    // r = 0.05 / 12 = 0.0041667
    // n = 180
    // (1.0041667)^180 = 2.11383 (verified via calculator)
    // Numerator = 300000 × 0.0041667 × 2.11383 = 300000 × 0.008808 = 2642.26
    // Denominator = 2.11383 - 1 = 1.11383
    // Payment = 2642.26 / 1.11383 = 2372.38
    expect(calculateMonthlyPayment(300_000, 0.05, 15)).toBeCloseTo(2372.38, 0)
  })
})

describe('calculateRemainingBalance', () => {
  it('calculates remaining balance on $240,000 at 6% after 60 payments (5 years)', () => {
    // Remaining balance formula:
    // B = P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    // P = 240000, r = 0.005, n = 360, p = 60
    // (1.005)^360 = 6.022575
    // (1.005)^60 = 1.348850
    // B = 240000 × (6.022575 - 1.348850) / (6.022575 - 1)
    // B = 240000 × 4.673725 / 5.022575
    // B = 240000 × (6.022575 - 1.34885) / (6.022575 - 1)
    // B = 240000 × 4.673725 / 5.022575
    // B ≈ 223,330.46 (precise calculation via formula)
    expect(calculateRemainingBalance(240_000, 0.06, 30, 60)).toBeCloseTo(223_330, 0)
  })

  it('returns approximately 0 after all payments are made', () => {
    // After 360 payments on a 30-year loan, balance should be 0
    // (1+r)^n - (1+r)^n = 0 → numerator = 0 → balance = 0
    expect(calculateRemainingBalance(240_000, 0.06, 30, 360)).toBeCloseTo(0, 0)
  })

  it('returns the full principal when 0 payments have been made', () => {
    // (1+r)^0 = 1
    // B = P × [(1+r)^n - 1] / [(1+r)^n - 1] = P
    expect(calculateRemainingBalance(240_000, 0.06, 30, 0)).toBeCloseTo(240_000, 0)
  })

  it('returns 0 when principal is 0', () => {
    expect(calculateRemainingBalance(0, 0.06, 30, 60)).toBe(0)
  })

  it('handles 0% interest rate', () => {
    // At 0% interest, balance decreases linearly.
    // After 60 of 360 payments: balance = 240000 × (1 - 60/360) = 240000 × 300/360 = 200000
    expect(calculateRemainingBalance(240_000, 0, 30, 60)).toBeCloseTo(200_000, 0)
  })

  it('calculates remaining balance on $200,000 at 2% after 60 payments', () => {
    // P = 200000, r = 0.02/12 = 0.0016667, n = 360, p = 60
    // (1.0016667)^360 = 1.82075
    // (1.0016667)^60 = 1.10512
    // B = 200000 × (1.82075 - 1.10512) / (1.82075 - 1)
    // B = 200000 × 0.71563 / 0.82075
    // B = 200000 × (1.82075 - 1.10512) / (1.82075 - 1)
    // B = 200000 × 0.71563 / 0.82075
    // B ≈ 174,409 (precise calculation via formula)
    expect(calculateRemainingBalance(200_000, 0.02, 30, 60)).toBeCloseTo(174_409, 0)
  })
})

describe('calculateOriginalLoanAmount', () => {
  it('back-calculates original loan from Preston\'s known numbers', () => {
    // Preston: current balance $199,000, rate 2%, original term 30 years, 5 years in.
    // We back-calculate the original loan amount, then verify that
    // calculateRemainingBalance with that original amount at 5 years returns ~$199,000.
    //
    // The inverse formula:
    // If B = P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    // Then P = B × [(1+r)^n - 1] / [(1+r)^n - (1+r)^p]
    //
    // r = 0.02/12 = 0.0016667, n = 360, p = 60, B = 199000
    // (1.0016667)^360 = 1.82075
    // (1.0016667)^60 = 1.10512
    // P = 199000 × (1.82075 - 1) / (1.82075 - 1.10512)
    // P = 199000 × 0.82075 / 0.71563
    // P = 199000 × 1.14695 = 228,243
    const originalLoan = calculateOriginalLoanAmount(199_000, 0.02, 30, 5)

    // Now verify the round-trip: remaining balance at year 5 should be ~$199,000
    const verifiedBalance = calculateRemainingBalance(originalLoan, 0.02, 30, 60)
    expect(verifiedBalance).toBeCloseTo(199_000, 0)
  })

  it('returns 0 when current balance is 0', () => {
    expect(calculateOriginalLoanAmount(0, 0.06, 30, 5)).toBe(0)
  })

  it('handles 0% interest rate', () => {
    // At 0% interest, balance decreases linearly:
    // B = P × (n - p) / n → P = B × n / (n - p)
    // If balance is 200,000 after 5 years (60 payments) of a 30-year (360 payment) loan:
    // P = 200000 × 360 / (360 - 60) = 200000 × 360/300 = 240,000
    expect(calculateOriginalLoanAmount(200_000, 0, 30, 5)).toBeCloseTo(240_000, 0)
  })

  it('returns the current balance when 0 years have elapsed', () => {
    // If no time has passed, the original loan equals the current balance.
    expect(calculateOriginalLoanAmount(240_000, 0.06, 30, 0)).toBeCloseTo(240_000, 0)
  })
})

describe('calculateYearInterestPaid', () => {
  it('calculates year 1 interest on $240,000 at 6% for 30 years', () => {
    // Year 1: The first 12 monthly payments.
    // Starting balance: $240,000. Monthly rate: 0.005. Monthly payment: $1,438.92.
    //
    // Month 1: interest = 240000 × 0.005 = 1200.00, principal = 1438.92 - 1200 = 238.92
    // Month 2: interest = (240000 - 238.92) × 0.005 = 239761.08 × 0.005 = 1198.81
    // ... and so on for 12 months.
    //
    // Year 1 total interest is approximately $14,275 (verified against amortization schedule).
    // Precise month-by-month calculation yields year 1 interest ≈ $14,320.
    // (Manual approximation of $14,275 was slightly off due to rounding compounding.)
    const yearInterest = calculateYearInterestPaid(240_000, 0.06, 30, 1)
    expect(yearInterest).toBeCloseTo(14_320, -1)
  })

  it('year 1 interest + year 1 principal should equal 12 × monthly payment', () => {
    // This is the fundamental identity of amortization:
    // every payment = interest portion + principal portion
    const principal = 240_000
    const rate = 0.06
    const term = 30
    const year = 1

    const yearInterest = calculateYearInterestPaid(principal, rate, term, year)
    const yearPrincipal = calculateYearPrincipalPaid(principal, rate, term, year)
    const monthlyPayment = calculateMonthlyPayment(principal, rate, term)

    expect(yearInterest + yearPrincipal).toBeCloseTo(monthlyPayment * 12, 2)
  })

  it('returns 0 when principal is 0', () => {
    expect(calculateYearInterestPaid(0, 0.06, 30, 1)).toBe(0)
  })

  it('returns 0 when interest rate is 0', () => {
    // No interest accrues at 0% — all payments are principal
    expect(calculateYearInterestPaid(240_000, 0, 30, 1)).toBe(0)
  })

  it('calculates interest for a later year (year 10)', () => {
    // By year 10, more of each payment goes to principal, less to interest.
    // Year 10 interest should be less than year 1 interest.
    const year1Interest = calculateYearInterestPaid(240_000, 0.06, 30, 1)
    const year10Interest = calculateYearInterestPaid(240_000, 0.06, 30, 10)
    expect(year10Interest).toBeLessThan(year1Interest)
    // Year 10 interest: precise month-by-month calculation yields ≈ $12,216
    expect(year10Interest).toBeCloseTo(12_216, -1)
  })
})

describe('calculateYearPrincipalPaid', () => {
  it('calculates year 1 principal on $240,000 at 6% for 30 years', () => {
    // Total year 1 payments = 12 × 1438.92 = 17,267.06
    // Year 1 interest ≈ 14,320
    // Year 1 principal ≈ 17,267 - 14,320 = 2,947
    const yearPrincipal = calculateYearPrincipalPaid(240_000, 0.06, 30, 1)
    expect(yearPrincipal).toBeCloseTo(2_947, -1)
  })

  it('returns 0 when principal is 0', () => {
    expect(calculateYearPrincipalPaid(0, 0.06, 30, 1)).toBe(0)
  })

  it('at 0% interest, all payments are principal', () => {
    // Monthly payment at 0% = 240000 / 360 = 666.67
    // Year principal = 12 × 666.67 = 8000
    expect(calculateYearPrincipalPaid(240_000, 0, 30, 1)).toBeCloseTo(8_000, 0)
  })

  it('principal paid in later years is greater than earlier years', () => {
    // As the loan ages, the principal portion of each payment increases
    const year1Principal = calculateYearPrincipalPaid(240_000, 0.06, 30, 1)
    const year20Principal = calculateYearPrincipalPaid(240_000, 0.06, 30, 20)
    expect(year20Principal).toBeGreaterThan(year1Principal)
  })

  it('returns 0 for years beyond the loan term', () => {
    // A 30-year loan is fully paid off after year 30.
    // Years 31+ should return 0 interest and 0 principal — not negative values.
    // Bug regression: previously, the loop drove balance negative, producing
    // negative interest and inflated principal for post-term years.
    expect(calculateYearInterestPaid(240_000, 0.06, 30, 31)).toBe(0)
    expect(calculateYearInterestPaid(240_000, 0.06, 30, 35)).toBe(0)
    expect(calculateYearPrincipalPaid(240_000, 0.06, 30, 31)).toBe(0)
    expect(calculateYearPrincipalPaid(240_000, 0.06, 30, 35)).toBe(0)
  })

  it('interest + principal for each year sum correctly across full loan', () => {
    // Sum of all principal paid over 30 years should equal the original principal
    const principal = 200_000
    const rate = 0.02
    const term = 30

    let totalPrincipalPaid = 0
    for (let year = 1; year <= term; year++) {
      totalPrincipalPaid += calculateYearPrincipalPaid(principal, rate, term, year)
    }
    expect(totalPrincipalPaid).toBeCloseTo(principal, 0)
  })
})
