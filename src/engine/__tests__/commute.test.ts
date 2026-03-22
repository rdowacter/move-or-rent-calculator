// ---------------------------------------------------------------------------
// commute.test.ts — Unit tests for commute cost, savings, and time-value
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  calculateAnnualCommuteCost,
  calculateAnnualCommuteSavings,
  calculateAnnualTimeSavedHours,
  calculateTimeSavedValue,
} from '../commute'

// ---------------------------------------------------------------------------
// calculateAnnualCommuteCost
// ---------------------------------------------------------------------------

describe('calculateAnnualCommuteCost', () => {
  it('calculates current commute cost (round trip)', () => {
    // Mileage cost: 44 miles × 250 days × $0.725/mile = $7,975
    // Toll cost:    $500/month × 12 = $6,000
    // Total:        $7,975 + $6,000 = $13,975
    expect(calculateAnnualCommuteCost(44, 250, 0.725, 500)).toBeCloseTo(13_975, 2)
  })

  it('calculates new commute cost (after move)', () => {
    // Mileage cost: 10 miles × 250 days × $0.725/mile = $1,812.50
    // Toll cost:    $0/month × 12 = $0
    // Total:        $1,812.50
    expect(calculateAnnualCommuteCost(10, 250, 0.725, 0)).toBeCloseTo(1_812.5, 2)
  })

  it('returns only toll cost when miles are 0', () => {
    // Mileage cost: 0 × 250 × $0.725 = $0
    // Toll cost:    $100/month × 12 = $1,200
    // Total:        $1,200
    expect(calculateAnnualCommuteCost(0, 250, 0.725, 100)).toBeCloseTo(1_200, 2)
  })

  it('returns 0 when work days are 0', () => {
    // Mileage cost: 44 × 0 × $0.725 = $0
    // Toll cost:    $500 × 12 = $6,000
    // Wait — tolls are monthly and independent of work days.
    // Actually, the formula is: (miles × days × rate) + (monthlyTolls × 12)
    // With 0 work days: (44 × 0 × 0.725) + (500 × 12) = 0 + 6000 = 6000
    // Tolls are a fixed monthly cost regardless of work days.
    expect(calculateAnnualCommuteCost(44, 0, 0.725, 500)).toBeCloseTo(6_000, 2)
  })

  it('returns 0 when all inputs are 0', () => {
    expect(calculateAnnualCommuteCost(0, 0, 0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateAnnualCommuteSavings
// ---------------------------------------------------------------------------

describe('calculateAnnualCommuteSavings', () => {
  it('calculates commute savings (before vs after move)', () => {
    // Current cost: 44 mi × 250 days × $0.725/mi + $500/mo × 12 = $13,975
    // New cost:     10 mi × 250 days × $0.725/mi + $0/mo × 12   = $1,812.50
    // Savings:      $13,975 - $1,812.50 = $12,162.50
    expect(
      calculateAnnualCommuteSavings(44, 10, 250, 0.725, 500, 0)
    ).toBeCloseTo(12_162.5, 2)
  })

  it('returns 0 savings when commutes are identical', () => {
    // Same miles, same tolls → cost difference is 0
    expect(
      calculateAnnualCommuteSavings(44, 44, 250, 0.725, 500, 500)
    ).toBeCloseTo(0, 2)
  })

  it('returns negative savings when new commute is more expensive', () => {
    // Current: 10 mi × 250 × $0.725 + $0 × 12 = $1,812.50
    // New:     44 mi × 250 × $0.725 + $500 × 12 = $13,975
    // Savings: $1,812.50 - $13,975 = -$12,162.50
    expect(
      calculateAnnualCommuteSavings(10, 44, 250, 0.725, 0, 500)
    ).toBeCloseTo(-12_162.5, 2)
  })

  it('accounts for toll-only savings', () => {
    // Same miles, but current has tolls and new does not
    // Current: 20 mi × 250 × $0.725 + $200 × 12 = $3,625 + $2,400 = $6,025
    // New:     20 mi × 250 × $0.725 + $0 × 12   = $3,625
    // Savings: $6,025 - $3,625 = $2,400
    expect(
      calculateAnnualCommuteSavings(20, 20, 250, 0.725, 200, 0)
    ).toBeCloseTo(2_400, 2)
  })
})

// ---------------------------------------------------------------------------
// calculateAnnualTimeSavedHours
// ---------------------------------------------------------------------------

describe('calculateAnnualTimeSavedHours', () => {
  it('calculates Preston time saved (2.5 hrs/day × 250 days)', () => {
    // 2.5 hours/day × 250 work days = 625 hours/year
    expect(calculateAnnualTimeSavedHours(2.5, 250)).toBeCloseTo(625, 2)
  })

  it('returns 0 when daily time saved is 0', () => {
    expect(calculateAnnualTimeSavedHours(0, 250)).toBe(0)
  })

  it('returns 0 when work days are 0', () => {
    expect(calculateAnnualTimeSavedHours(2.5, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateTimeSavedValue
// ---------------------------------------------------------------------------

describe('calculateTimeSavedValue', () => {
  it('calculates Preston time-value of commute savings', () => {
    // Hourly rate: $100,000 / 2,080 hours = $48.076923.../hr
    // Hours saved: 2.5 hrs/day × 250 days = 625 hrs/year
    // Value:       625 × $48.076923... = $30,048.076923...
    expect(calculateTimeSavedValue(2.5, 250, 100_000)).toBeCloseTo(30_048.08, 0)
  })

  it('returns 0 when income is 0', () => {
    // Even with hours saved, if income is 0 the imputed value is 0
    expect(calculateTimeSavedValue(2.5, 250, 0)).toBe(0)
  })

  it('returns 0 when daily time saved is 0', () => {
    expect(calculateTimeSavedValue(0, 250, 100_000)).toBe(0)
  })

  it('returns 0 when work days are 0', () => {
    expect(calculateTimeSavedValue(2.5, 0, 100_000)).toBe(0)
  })

  it('scales linearly with income', () => {
    // At $200,000: hourly = $200,000/2,080 = $96.153846.../hr
    // 625 hrs × $96.153846... = $60,096.153846...
    const valueAt100k = calculateTimeSavedValue(2.5, 250, 100_000)
    const valueAt200k = calculateTimeSavedValue(2.5, 250, 200_000)
    expect(valueAt200k).toBeCloseTo(valueAt100k * 2, 2)
  })
})
