// ---------------------------------------------------------------------------
// capital.test.ts — Tests for upfront capital, burn rate, reserve runway,
// and stress test calculations.
//
// All expected values are manually calculated and documented inline.
// TDD: these tests were written BEFORE the implementation.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  calculateUpfrontCapital,
  monthlyBurnRate,
  reserveRunwayMonths,
  stressTest,
} from '../capital'

// ---- calculateUpfrontCapital ------------------------------------------------

describe('calculateUpfrontCapital', () => {
  it('returns all zeros for baseline scenario (no capital event)', () => {
    // Baseline: user stays put. No home purchase, no IRA withdrawal, no sale.
    // Only liquid savings are available as cash on hand.
    const result = calculateUpfrontCapital({
      scenario: 'baseline',
      homePrice: 300_000,
      downPaymentPercent: 0.20,
      closingCostsRate: 0.025,
      movingCosts: 3_000,
      liquidSavings: 10_000,
    })

    expect(result.totalCashNeeded).toBe(0)
    expect(result.cashAvailable).toBe(10_000)
    expect(result.surplus).toBe(10_000)
    expect(result.downPayment).toBe(0)
    expect(result.closingCosts).toBe(0)
    expect(result.movingCosts).toBe(0)
    expect(result.iraWithdrawalNetProceeds).toBeNull()
    expect(result.homeSaleNetProceeds).toBeNull()
  })

  it('calculates Scenario A upfront capital (Preston: sell Kyle, buy Austin)', () => {
    // Preston Scenario A:
    // homePrice = $300,000
    // downPayment = 300,000 × 0.20 = $60,000
    // closingCosts = 300,000 × 0.025 = $7,500
    // movingCosts = $3,000
    // totalCashNeeded = 60,000 + 7,500 + 3,000 = $70,500
    //
    // Home sale proceeds:
    // Sale price $270,000 - selling costs $16,200 (6%) - mortgage $199,000 = $54,800
    // liquidSavings = $0 (Preston has no liquid savings)
    // cashAvailable = 0 + 54,800 = $54,800
    // surplus = 54,800 - 70,500 = -$15,700 (SHORTFALL)
    const result = calculateUpfrontCapital({
      scenario: 'scenarioA',
      homePrice: 300_000,
      downPaymentPercent: 0.20,
      closingCostsRate: 0.025,
      movingCosts: 3_000,
      liquidSavings: 0,
      homeSaleNetProceeds: 54_800,
    })

    expect(result.downPayment).toBeCloseTo(60_000, 0)
    expect(result.closingCosts).toBeCloseTo(7_500, 0)
    expect(result.movingCosts).toBe(3_000)
    expect(result.totalCashNeeded).toBeCloseTo(70_500, 0)
    expect(result.cashAvailable).toBeCloseTo(54_800, 0)
    expect(result.surplus).toBeCloseTo(-15_700, 0)
    expect(result.homeSaleNetProceeds).toBeCloseTo(54_800, 0)
    expect(result.iraWithdrawalNetProceeds).toBeNull()
  })

  it('calculates Scenario B upfront capital (Preston: keep Kyle, withdraw IRA)', () => {
    // Preston Scenario B:
    // homePrice = $300,000
    // downPayment = 300,000 × 0.10 = $30,000
    // closingCosts = 300,000 × 0.025 = $7,500
    // movingCosts = $3,000
    // totalCashNeeded = 30,000 + 7,500 + 3,000 = $40,500
    //
    // IRA withdrawal net proceeds (after taxes + penalty) ≈ $20,400
    // liquidSavings = $0
    // cashAvailable = 0 + 20,400 = $20,400
    // surplus = 20,400 - 40,500 = -$20,100 (SHORTFALL)
    const result = calculateUpfrontCapital({
      scenario: 'scenarioB',
      homePrice: 300_000,
      downPaymentPercent: 0.10,
      closingCostsRate: 0.025,
      movingCosts: 3_000,
      liquidSavings: 0,
      iraWithdrawalNetProceeds: 20_400,
    })

    expect(result.downPayment).toBeCloseTo(30_000, 0)
    expect(result.closingCosts).toBeCloseTo(7_500, 0)
    expect(result.movingCosts).toBe(3_000)
    expect(result.totalCashNeeded).toBeCloseTo(40_500, 0)
    expect(result.cashAvailable).toBeCloseTo(20_400, 0)
    expect(result.surplus).toBeCloseTo(-20_100, 0)
    expect(result.iraWithdrawalNetProceeds).toBeCloseTo(20_400, 0)
    expect(result.homeSaleNetProceeds).toBeNull()
  })

  it('calculates positive surplus when user has enough cash', () => {
    // homePrice = $200,000
    // downPayment = 200,000 × 0.20 = $40,000
    // closingCosts = 200,000 × 0.025 = $5,000
    // movingCosts = $2,000
    // totalCashNeeded = 40,000 + 5,000 + 2,000 = $47,000
    //
    // liquidSavings = $30,000
    // homeSaleNetProceeds = $50,000
    // cashAvailable = 30,000 + 50,000 = $80,000
    // surplus = 80,000 - 47,000 = $33,000
    const result = calculateUpfrontCapital({
      scenario: 'scenarioA',
      homePrice: 200_000,
      downPaymentPercent: 0.20,
      closingCostsRate: 0.025,
      movingCosts: 2_000,
      liquidSavings: 30_000,
      homeSaleNetProceeds: 50_000,
    })

    expect(result.totalCashNeeded).toBeCloseTo(47_000, 0)
    expect(result.cashAvailable).toBeCloseTo(80_000, 0)
    expect(result.surplus).toBeCloseTo(33_000, 0)
  })

  it('handles zero down payment correctly', () => {
    // Some programs (VA, USDA) allow 0% down
    // downPayment = 0
    // closingCosts = 300,000 × 0.025 = $7,500
    // totalCashNeeded = 0 + 7,500 + 3,000 = $10,500
    const result = calculateUpfrontCapital({
      scenario: 'scenarioA',
      homePrice: 300_000,
      downPaymentPercent: 0,
      closingCostsRate: 0.025,
      movingCosts: 3_000,
      liquidSavings: 15_000,
      homeSaleNetProceeds: 0,
    })

    expect(result.downPayment).toBe(0)
    expect(result.totalCashNeeded).toBeCloseTo(10_500, 0)
    expect(result.cashAvailable).toBe(15_000)
    expect(result.surplus).toBeCloseTo(4_500, 0)
  })
})

// ---- monthlyBurnRate --------------------------------------------------------

describe('monthlyBurnRate', () => {
  it('calculates net monthly position without rental income', () => {
    // Net take-home = 8,333.33 - 1,200 = $7,133.33
    // Obligations = 1,439 + 500 + 200 + 50 + 3,000 + 300 = $5,489
    // Net position = 7,133.33 - 5,489 = $1,644.33 surplus
    const result = monthlyBurnRate({
      monthlyGrossIncome: 8_333.33,
      monthlyFederalTax: 1_200,
      primaryMortgagePI: 1_439,
      primaryPropertyTaxMonthly: 500,
      primaryInsuranceMonthly: 200,
      primaryPMIMonthly: 50,
      monthlyLivingExpenses: 3_000,
      monthlyDebtPayments: 300,
    })

    // 7,133.33 - 5,489 = 1,644.33
    expect(result).toBeCloseTo(1_644.33, 0)
  })

  it('includes positive rental cash flow as income offset', () => {
    // Same as above but with +$200/mo rental cash flow
    // Net position = 1,644.33 + 200 = $1,844.33
    const result = monthlyBurnRate({
      monthlyGrossIncome: 8_333.33,
      monthlyFederalTax: 1_200,
      primaryMortgagePI: 1_439,
      primaryPropertyTaxMonthly: 500,
      primaryInsuranceMonthly: 200,
      primaryPMIMonthly: 50,
      monthlyLivingExpenses: 3_000,
      monthlyDebtPayments: 300,
      rentalNetCashFlow: 200,
    })

    expect(result).toBeCloseTo(1_844.33, 0)
  })

  it('includes negative rental cash flow as additional drain', () => {
    // Same as base but with -$500/mo rental cash flow (common for
    // negative cash flow rentals where mortgage > rent collected)
    // Net position = 1,644.33 + (-500) = $1,144.33
    const result = monthlyBurnRate({
      monthlyGrossIncome: 8_333.33,
      monthlyFederalTax: 1_200,
      primaryMortgagePI: 1_439,
      primaryPropertyTaxMonthly: 500,
      primaryInsuranceMonthly: 200,
      primaryPMIMonthly: 50,
      monthlyLivingExpenses: 3_000,
      monthlyDebtPayments: 300,
      rentalNetCashFlow: -500,
    })

    expect(result).toBeCloseTo(1_144.33, 0)
  })

  it('returns negative when obligations exceed income', () => {
    // Net take-home = 4,000 - 600 = $3,400
    // Obligations = 1,500 + 400 + 150 + 0 + 2,500 + 200 = $4,750
    // Net position = 3,400 - 4,750 = -$1,350 (bleeding reserves)
    const result = monthlyBurnRate({
      monthlyGrossIncome: 4_000,
      monthlyFederalTax: 600,
      primaryMortgagePI: 1_500,
      primaryPropertyTaxMonthly: 400,
      primaryInsuranceMonthly: 150,
      primaryPMIMonthly: 0,
      monthlyLivingExpenses: 2_500,
      monthlyDebtPayments: 200,
    })

    expect(result).toBeCloseTo(-1_350, 0)
  })
})

// ---- reserveRunwayMonths ----------------------------------------------------

describe('reserveRunwayMonths', () => {
  it('returns months until reserves are depleted with negative burn rate', () => {
    // $5,000 reserves, losing $500/month
    // Runway = 5,000 / 500 = 10 months
    expect(reserveRunwayMonths(5_000, -500)).toBeCloseTo(10, 2)
  })

  it('returns Infinity when burn rate is positive (surplus)', () => {
    // If you have positive cash flow, reserves never deplete
    expect(reserveRunwayMonths(5_000, 200)).toBe(Infinity)
  })

  it('returns Infinity when burn rate is exactly zero', () => {
    // Breaking even — reserves hold steady indefinitely
    expect(reserveRunwayMonths(5_000, 0)).toBe(Infinity)
  })

  it('returns 0 when post-closing savings are zero', () => {
    // No reserves at all — already at zero
    expect(reserveRunwayMonths(0, -500)).toBe(0)
  })

  it('returns 0 when post-closing savings are negative', () => {
    // In the red from day one
    expect(reserveRunwayMonths(-1_000, -500)).toBe(0)
  })

  it('handles large reserves with small negative burn', () => {
    // $50,000 reserves, losing $100/month
    // Runway = 50,000 / 100 = 500 months (~41.7 years)
    expect(reserveRunwayMonths(50_000, -100)).toBeCloseTo(500, 2)
  })
})

// ---- stressTest -------------------------------------------------------------

describe('stressTest', () => {
  describe('vacancy + maintenance shock', () => {
    it('calculates shock cost and remaining reserves correctly', () => {
      // Shock = 3 months lost rent + major repair
      // shockCost = 3 × $2,000 + $8,000 = $14,000
      //
      // With $5,000 reserves:
      // remainingReserves = 5,000 - 14,000 = -$9,000
      // Since remaining ≤ 0, monthsOfReserves = 0
      const result = stressTest({
        postClosingReserves: 5_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.vacancyAndMaintenance.shockCost).toBeCloseTo(14_000, 0)
      expect(result.vacancyAndMaintenance.monthsOfReserves).toBe(0)
    })

    it('calculates months of reserves when shock is absorbed', () => {
      // shockCost = 3 × $1,500 + $8,000 = $12,500
      // remainingReserves = 30,000 - 12,500 = $17,500
      // monthlyNetPosition = -$300 (negative)
      // monthsOfReserves = 17,500 / 300 ≈ 58.33
      const result = stressTest({
        postClosingReserves: 30_000,
        monthlyNetPosition: -300,
        monthlyRent: 1_500,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.vacancyAndMaintenance.shockCost).toBeCloseTo(12_500, 0)
      expect(result.vacancyAndMaintenance.monthsOfReserves).toBeCloseTo(58.33, 0)
    })

    it('returns Infinity when net position is positive after shock', () => {
      // shockCost = 3 × $1,500 + $8,000 = $12,500
      // remainingReserves = 30,000 - 12,500 = $17,500 (> 0)
      // monthlyNetPosition = +$500 (positive surplus)
      // monthsOfReserves = Infinity (never depletes)
      const result = stressTest({
        postClosingReserves: 30_000,
        monthlyNetPosition: 500,
        monthlyRent: 1_500,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.vacancyAndMaintenance.monthsOfReserves).toBe(Infinity)
    })
  })

  describe('income disruption', () => {
    it('calculates months until crisis with income reduction', () => {
      // reducedMonthlyIncome = 8,333 × 0.80 = $6,666.40
      // monthlyShortfall = 5,000 - 6,666.40 = -$1,666.40 → no shortfall
      // Wait — obligations < reduced income, so shortfall ≤ 0 → Infinity
      const result = stressTest({
        postClosingReserves: 10_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      // 8,333 × 0.80 = 6,666.40, obligations = 5,000
      // shortfall = 5,000 - 6,666.40 = -1,666.40 (no shortfall)
      expect(result.incomeDisruption.reducedMonthlyIncome).toBeCloseTo(6_666.40, 0)
      expect(result.incomeDisruption.monthlyShortfall).toBeCloseTo(0, 0)
      expect(result.incomeDisruption.monthsUntilCrisis).toBe(Infinity)
    })

    it('calculates crisis timeline when obligations exceed reduced income', () => {
      // reducedMonthlyIncome = 6,000 × 0.80 = $4,800
      // monthlyShortfall = 5,500 - 4,800 = $700
      // monthsUntilCrisis = 10,000 / 700 ≈ 14.29
      const result = stressTest({
        postClosingReserves: 10_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 6_000,
        monthlyObligations: 5_500,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.incomeDisruption.reducedMonthlyIncome).toBeCloseTo(4_800, 0)
      expect(result.incomeDisruption.monthlyShortfall).toBeCloseTo(700, 0)
      expect(result.incomeDisruption.monthsUntilCrisis).toBeCloseTo(14.29, 0)
    })
  })

  describe('market downturn', () => {
    it('calculates equity after 10% value drop (still positive equity)', () => {
      // Current: value=$270k, mortgage=$199k → equity=$71k
      // After 10% drop: value=$243k, mortgage=$199k → equity=$44k
      // Not underwater → underwaterBy=0, forcedSaleLoss=0
      const result = stressTest({
        postClosingReserves: 10_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.marketDownturn.currentEquity).toBeCloseTo(71_000, 0)
      expect(result.marketDownturn.newEquity).toBeCloseTo(44_000, 0)
      expect(result.marketDownturn.underwaterBy).toBe(0)
      expect(result.marketDownturn.forcedSaleLoss).toBe(0)
    })

    it('detects underwater scenario and calculates forced sale loss', () => {
      // High-LTV property:
      // Current: value=$220k, mortgage=$210k → equity=$10k
      // After 10% drop: value=$198k, mortgage=$210k → equity=-$12k
      // underwaterBy = $12,000
      // forcedSaleLoss = 198,000 × 0.06 + 12,000 = 11,880 + 12,000 = $23,880
      const result = stressTest({
        postClosingReserves: 10_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 220_000,
        mortgageBalance: 210_000,
        sellingCostRate: 0.06,
      })

      expect(result.marketDownturn.currentEquity).toBeCloseTo(10_000, 0)
      expect(result.marketDownturn.newEquity).toBeCloseTo(-12_000, 0)
      expect(result.marketDownturn.underwaterBy).toBeCloseTo(12_000, 0)
      expect(result.marketDownturn.forcedSaleLoss).toBeCloseTo(23_880, 0)
    })

    it('handles exactly underwater (zero equity after drop)', () => {
      // value=$200k, mortgage=$180k → equity=$20k
      // After 10% drop: value=$180k, mortgage=$180k → equity=$0
      // Not underwater (equity = 0, not negative)
      const result = stressTest({
        postClosingReserves: 10_000,
        monthlyNetPosition: 500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 200_000,
        mortgageBalance: 180_000,
        sellingCostRate: 0.06,
      })

      expect(result.marketDownturn.newEquity).toBeCloseTo(0, 0)
      expect(result.marketDownturn.underwaterBy).toBe(0)
      expect(result.marketDownturn.forcedSaleLoss).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles zero reserves across all stress scenarios', () => {
      const result = stressTest({
        postClosingReserves: 0,
        monthlyNetPosition: -500,
        monthlyRent: 2_000,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      // Vacancy shock: remaining = 0 - 14,000 = -14,000 → 0 months
      expect(result.vacancyAndMaintenance.monthsOfReserves).toBe(0)
      // Income disruption with 0 reserves: 0 / shortfall (if any)
      // reducedIncome = 8,333 × 0.80 = 6,666.40, obligations = 5,000
      // No shortfall → Infinity (can still cover obligations even at 80% income)
      expect(result.incomeDisruption.monthsUntilCrisis).toBe(Infinity)
    })

    it('handles zero rent in vacancy shock', () => {
      // shockCost = 3 × 0 + 8,000 = $8,000
      const result = stressTest({
        postClosingReserves: 20_000,
        monthlyNetPosition: 500,
        monthlyRent: 0,
        monthlyGrossIncome: 8_333,
        monthlyObligations: 5_000,
        homeValue: 270_000,
        mortgageBalance: 199_000,
        sellingCostRate: 0.06,
      })

      expect(result.vacancyAndMaintenance.shockCost).toBeCloseTo(8_000, 0)
    })
  })
})
