// ---------------------------------------------------------------------------
// appreciation.test.ts — Unit tests for home appreciation and equity calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  calculateFutureHomeValue,
  calculateHomeEquity,
  generateAppreciationSchedule,
} from '../appreciation'

describe('calculateFutureHomeValue', () => {
  it('calculates current home at 3% for 20 years', () => {
    // Compound growth: value × (1 + rate)^years
    // 270000 × (1.03)^20
    // (1.03)^20 = 1.80611 (verified via calculator)
    // 270000 × 1.80611 = 487,649.70
    expect(calculateFutureHomeValue(270_000, 0.03, 20)).toBeCloseTo(487_650, 0)
  })

  it('calculates new home at 3.5% for 20 years', () => {
    // 300000 × (1.035)^20
    // (1.035)^20 = 1.98979 (verified via calculator)
    // 300000 × 1.98979 = 596,937
    expect(calculateFutureHomeValue(300_000, 0.035, 20)).toBeCloseTo(596_937, 0)
  })

  it('returns unchanged value at 0% appreciation', () => {
    // 270000 × (1.00)^20 = 270000
    expect(calculateFutureHomeValue(270_000, 0, 20)).toBe(270_000)
  })

  it('handles negative appreciation (-2%) correctly', () => {
    // 300000 × (0.98)^10
    // (0.98)^10 = 0.81707280688 (verified via calculator)
    // 300000 × 0.81707280688 = 245,121.84
    expect(calculateFutureHomeValue(300_000, -0.02, 10)).toBeCloseTo(245_122, 0)
  })

  it('returns current value when years is 0', () => {
    expect(calculateFutureHomeValue(270_000, 0.03, 0)).toBe(270_000)
  })

  it('returns 0 when current value is 0', () => {
    expect(calculateFutureHomeValue(0, 0.03, 20)).toBe(0)
  })
})

describe('calculateHomeEquity', () => {
  it('calculates positive equity', () => {
    // Equity = home value - mortgage balance
    // 270000 - 199000 = 71000
    expect(calculateHomeEquity(270_000, 199_000)).toBe(71_000)
  })

  it('calculates underwater (negative) equity', () => {
    // 200000 - 250000 = -50000
    expect(calculateHomeEquity(200_000, 250_000)).toBe(-50_000)
  })

  it('calculates zero equity when value equals balance', () => {
    expect(calculateHomeEquity(200_000, 200_000)).toBe(0)
  })

  it('returns full value when mortgage is fully paid off', () => {
    expect(calculateHomeEquity(300_000, 0)).toBe(300_000)
  })
})

describe('generateAppreciationSchedule', () => {
  it('generates correct year-by-year values for 3 years at 3%', () => {
    // Year 0: 270000 (starting value)
    // Year 1: 270000 × 1.03 = 278,100
    // Year 2: 270000 × (1.03)^2 = 270000 × 1.0609 = 286,443
    // Year 3: 270000 × (1.03)^3 = 270000 × 1.092727 = 295,036.29
    const schedule = generateAppreciationSchedule(270_000, 0.03, 3)

    expect(schedule).toHaveLength(4) // year 0 through year 3
    expect(schedule[0]).toEqual({ year: 0, value: 270_000 })
    expect(schedule[1].year).toBe(1)
    expect(schedule[1].value).toBeCloseTo(278_100, 0)
    expect(schedule[2].year).toBe(2)
    expect(schedule[2].value).toBeCloseTo(286_443, 0)
    expect(schedule[3].year).toBe(3)
    expect(schedule[3].value).toBeCloseTo(295_036, 0)
  })

  it('returns flat schedule at 0% appreciation', () => {
    const schedule = generateAppreciationSchedule(200_000, 0, 3)
    expect(schedule).toHaveLength(4)
    for (const entry of schedule) {
      expect(entry.value).toBe(200_000)
    }
  })

  it('returns only year 0 when years is 0', () => {
    const schedule = generateAppreciationSchedule(270_000, 0.03, 0)
    expect(schedule).toHaveLength(1)
    expect(schedule[0]).toEqual({ year: 0, value: 270_000 })
  })

  it('returns all zeros when value is 0', () => {
    const schedule = generateAppreciationSchedule(0, 0.03, 5)
    expect(schedule).toHaveLength(6)
    for (const entry of schedule) {
      expect(entry.value).toBe(0)
    }
  })

  it('handles negative appreciation in schedule', () => {
    // Year 1: 100000 × 0.98 = 98000
    // Year 2: 100000 × (0.98)^2 = 96040
    const schedule = generateAppreciationSchedule(100_000, -0.02, 2)
    expect(schedule).toHaveLength(3)
    expect(schedule[0].value).toBe(100_000)
    expect(schedule[1].value).toBeCloseTo(98_000, 0)
    expect(schedule[2].value).toBeCloseTo(96_040, 0)
  })
})
