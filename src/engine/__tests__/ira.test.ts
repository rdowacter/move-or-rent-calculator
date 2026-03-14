// ---------------------------------------------------------------------------
// ira.test.ts — Unit tests for IRA growth projection calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
//
// Core formulas:
//   Future value of lump sum: PV × (1 + r)^n
//   Future value of annuity:  PMT × [((1 + r)^n - 1) / r]
//   Combined:                 PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { calculateIRAFutureValue, generateIRAProjection } from '../ira'

// ---- calculateIRAFutureValue ------------------------------------------------

describe('calculateIRAFutureValue', () => {
  it('calculates future value for Scenario A: $30k balance, $7k/yr contribution, 7% for 25 years', () => {
    // This is the "keep IRA intact + contribute" scenario.
    //
    // Future value of existing balance:
    //   30000 × (1.07)^25
    //   (1.07)^25 = 5.427433 (verified via calculator)
    //   = 30000 × 5.427433 = 162,822.99
    //
    // Future value of annual contributions (annuity):
    //   7000 × [((1.07)^25 - 1) / 0.07]
    //   = 7000 × [(5.427433 - 1) / 0.07]
    //   = 7000 × [4.427433 / 0.07]
    //   = 7000 × 63.249044
    //   = 442,743.31
    //
    // Total = 162,822.99 + 442,743.31 = 605,566.30
    const result = calculateIRAFutureValue(30_000, 7_000, 0.07, 25)
    expect(result).toBeCloseTo(605_566, 0)
  })

  it('calculates future value for Scenario B worst case: $0 balance, $0 contribution', () => {
    // After full IRA withdrawal with no restart — total retirement = $0
    const result = calculateIRAFutureValue(0, 0, 0.07, 25)
    expect(result).toBe(0)
  })

  it('calculates future value for Scenario B if contributions restart: $0 balance, $7k/yr', () => {
    // Future value of contributions only (no existing balance):
    //   7000 × [((1.07)^25 - 1) / 0.07]
    //   = 7000 × 63.249044
    //   = 442,743.31
    const result = calculateIRAFutureValue(0, 7_000, 0.07, 25)
    expect(result).toBeCloseTo(442_743, 0)
  })

  it('calculates future value with balance only, no contributions', () => {
    // Pure compound growth: 30000 × (1.07)^25 = 162,822.99
    const result = calculateIRAFutureValue(30_000, 0, 0.07, 25)
    expect(result).toBeCloseTo(162_823, 0)
  })

  it('calculates future value for a short time horizon (5 years)', () => {
    // 30000 × (1.07)^5 = 30000 × 1.402552 = 42,076.55
    // 7000 × [((1.07)^5 - 1) / 0.07] = 7000 × [0.402552 / 0.07] = 7000 × 5.750739 = 40,255.17
    // Total = 42,076.55 + 40,255.17 = 82,331.72
    const result = calculateIRAFutureValue(30_000, 7_000, 0.07, 5)
    expect(result).toBeCloseTo(82_332, 0)
  })

  // ---- Edge cases -----------------------------------------------------------

  it('returns current balance when years is 0', () => {
    // No time to grow or contribute — return what you started with
    const result = calculateIRAFutureValue(30_000, 7_000, 0.07, 0)
    expect(result).toBe(30_000)
  })

  it('handles 0% return rate without dividing by zero', () => {
    // At 0% return, the annuity formula divides by zero.
    // Fallback: balance + (contribution × years) — no growth, just accumulation.
    // 30000 + (7000 × 25) = 30000 + 175000 = 205,000
    const result = calculateIRAFutureValue(30_000, 7_000, 0.0, 25)
    expect(result).toBe(205_000)
  })

  it('handles 0% return rate with 0 contribution', () => {
    // 30000 + (0 × 25) = 30000 — balance unchanged with no growth
    const result = calculateIRAFutureValue(30_000, 0, 0.0, 25)
    expect(result).toBe(30_000)
  })

  it('handles negative return rate (market downturn)', () => {
    // 10000 × (1 + (-0.05))^3 = 10000 × (0.95)^3 = 10000 × 0.857375 = 8573.75
    // 1000 × [((0.95)^3 - 1) / (-0.05)] = 1000 × [(-0.142625) / (-0.05)] = 1000 × 2.8525 = 2852.50
    // Total = 8573.75 + 2852.50 = 11,426.25
    const result = calculateIRAFutureValue(10_000, 1_000, -0.05, 3)
    expect(result).toBeCloseTo(11_426.25, 0)
  })

  it('handles very small balance and contribution', () => {
    // 1 × (1.07)^1 = 1.07
    // 1 × [((1.07)^1 - 1) / 0.07] = 1 × [0.07 / 0.07] = 1
    // Total = 1.07 + 1.00 = 2.07
    const result = calculateIRAFutureValue(1, 1, 0.07, 1)
    expect(result).toBeCloseTo(2.07, 2)
  })
})

// ---- generateIRAProjection --------------------------------------------------

describe('generateIRAProjection', () => {
  it('generates correct year 1 projection for $30k at 7% with $7k contribution', () => {
    // Year 1:
    //   Balance = 30000 × 1.07 + 7000 = 32100 + 7000 = 39,100
    //   Total contributions = 7,000
    //   Total growth = 39100 - 30000 - 7000 = 2,100 (the 7% gain on original balance)
    const projection = generateIRAProjection(30_000, 7_000, 0.07, 1)

    expect(projection).toHaveLength(1)
    expect(projection[0].year).toBe(1)
    expect(projection[0].balance).toBeCloseTo(39_100, 0)
    expect(projection[0].totalContributions).toBe(7_000)
    expect(projection[0].totalGrowth).toBeCloseTo(2_100, 0)
  })

  it('generates correct multi-year projection', () => {
    // Year 1:
    //   Balance = 30000 × 1.07 + 7000 = 39,100.00
    //   Total contributions = 7,000
    //   Total growth = 39100 - 30000 - 7000 = 2,100.00
    //
    // Year 2:
    //   Balance = 39100 × 1.07 + 7000 = 41837 + 7000 = 48,837.00
    //   Total contributions = 14,000
    //   Total growth = 48837 - 30000 - 14000 = 4,837.00
    //
    // Year 3:
    //   Balance = 48837 × 1.07 + 7000 = 52255.59 + 7000 = 59,255.59
    //   Total contributions = 21,000
    //   Total growth = 59255.59 - 30000 - 21000 = 8,255.59
    const projection = generateIRAProjection(30_000, 7_000, 0.07, 3)

    expect(projection).toHaveLength(3)

    expect(projection[0].year).toBe(1)
    expect(projection[0].balance).toBeCloseTo(39_100, 0)
    expect(projection[0].totalContributions).toBe(7_000)
    expect(projection[0].totalGrowth).toBeCloseTo(2_100, 0)

    expect(projection[1].year).toBe(2)
    expect(projection[1].balance).toBeCloseTo(48_837, 0)
    expect(projection[1].totalContributions).toBe(14_000)
    expect(projection[1].totalGrowth).toBeCloseTo(4_837, 0)

    expect(projection[2].year).toBe(3)
    expect(projection[2].balance).toBeCloseTo(59_255.59, 0)
    expect(projection[2].totalContributions).toBe(21_000)
    expect(projection[2].totalGrowth).toBeCloseTo(8_255.59, 0)
  })

  it('returns empty array when years is 0', () => {
    const projection = generateIRAProjection(30_000, 7_000, 0.07, 0)
    expect(projection).toEqual([])
  })

  it('handles $0 balance with $0 contribution (Scenario B worst case)', () => {
    const projection = generateIRAProjection(0, 0, 0.07, 3)

    expect(projection).toHaveLength(3)
    expect(projection[0].balance).toBe(0)
    expect(projection[0].totalContributions).toBe(0)
    expect(projection[0].totalGrowth).toBe(0)
    expect(projection[2].balance).toBe(0)
  })

  it('handles 0% return rate without dividing by zero', () => {
    // At 0% return, balance just accumulates contributions with no growth.
    // Year 1: 10000 + 1000 = 11,000. Growth = 0.
    // Year 2: 11000 + 1000 = 12,000. Growth = 0.
    const projection = generateIRAProjection(10_000, 1_000, 0.0, 2)

    expect(projection[0].balance).toBe(11_000)
    expect(projection[0].totalContributions).toBe(1_000)
    expect(projection[0].totalGrowth).toBe(0)

    expect(projection[1].balance).toBe(12_000)
    expect(projection[1].totalContributions).toBe(2_000)
    expect(projection[1].totalGrowth).toBe(0)
  })

  it('handles contributions only (no starting balance)', () => {
    // Year 1: 0 × 1.07 + 5000 = 5,000
    // Growth = 5000 - 0 - 5000 = 0 (no balance to earn on in year 1)
    //
    // Year 2: 5000 × 1.07 + 5000 = 5350 + 5000 = 10,350
    // Growth = 10350 - 0 - 10000 = 350 (7% on the $5k from year 1)
    const projection = generateIRAProjection(0, 5_000, 0.07, 2)

    expect(projection[0].balance).toBeCloseTo(5_000, 0)
    expect(projection[0].totalContributions).toBe(5_000)
    expect(projection[0].totalGrowth).toBeCloseTo(0, 0)

    expect(projection[1].balance).toBeCloseTo(10_350, 0)
    expect(projection[1].totalContributions).toBe(10_000)
    expect(projection[1].totalGrowth).toBeCloseTo(350, 0)
  })

  it('final year balance matches calculateIRAFutureValue', () => {
    // Cross-check: the last year's balance from generateIRAProjection should
    // match the result from calculateIRAFutureValue for the same inputs.
    const futureValue = calculateIRAFutureValue(30_000, 7_000, 0.07, 25)
    const projection = generateIRAProjection(30_000, 7_000, 0.07, 25)

    expect(projection).toHaveLength(25)
    // The iterative approach and the closed-form formula may diverge slightly
    // due to floating-point accumulation, but should be very close.
    expect(projection[24].balance).toBeCloseTo(futureValue, 0)
  })

  it('handles negative return rate', () => {
    // Year 1: 10000 × 0.95 + 0 = 9,500
    // Growth = 9500 - 10000 - 0 = -500
    const projection = generateIRAProjection(10_000, 0, -0.05, 1)

    expect(projection[0].balance).toBeCloseTo(9_500, 0)
    expect(projection[0].totalContributions).toBe(0)
    expect(projection[0].totalGrowth).toBeCloseTo(-500, 0)
  })
})
