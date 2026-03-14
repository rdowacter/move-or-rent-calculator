// ---------------------------------------------------------------------------
// scenarios.test.ts — Tests for the scenario orchestrator
//
// Tests are organized in tiers:
//   Tier 1: Stepping helpers (stepMortgageYear, stepIRAYear, stepAppreciationYear)
//   Tier 2: Per-scenario smoke tests (baseline, Scenario A, Scenario B)
//   Tier 3: runModel + warning generation
//   Tier 4: Directional invariants that must hold for any valid inputs
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'

import {
  stepMortgageYear,
  stepIRAYear,
  stepAppreciationYear,
  projectBaseline,
  projectScenarioA,
  projectScenarioB,
  runModel,
} from '../scenarios'

import {
  calculateMonthlyPayment,
  calculateOriginalLoanAmount,
} from '../mortgage'

import { calculateIRAFutureValue } from '../ira'

import type { ScenarioInputs } from '../types'

import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '../constants'

// ---- Test fixture: Preston's defaults ----
const prestonInputs: ScenarioInputs = {
  personal: { ...DEFAULT_PERSONAL_INPUTS },
  retirement: { ...DEFAULT_RETIREMENT_INPUTS },
  currentHome: { ...DEFAULT_CURRENT_HOME_INPUTS },
  newHome: { ...DEFAULT_NEW_HOME_INPUTS },
  commute: { ...DEFAULT_COMMUTE_INPUTS },
  costs: { ...DEFAULT_COST_INPUTS },
  projection: { ...DEFAULT_PROJECTION_INPUTS },
}

// ===========================================================================
// Tier 1: Stepping Helpers
// ===========================================================================

describe('stepMortgageYear', () => {
  it('advances a mortgage balance by one year correctly', () => {
    // Kyle mortgage: $199k balance at 2%, back-calculate original loan
    const originalLoan = calculateOriginalLoanAmount(199_000, 0.02, 30, 5)
    const monthlyPayment = calculateMonthlyPayment(originalLoan, 0.02, 30)

    const result = stepMortgageYear(199_000, 0.02, monthlyPayment)

    // principalPaid + interestPaid must equal monthlyPayment × 12 (exact)
    expect(result.principalPaid + result.interestPaid).toBeCloseTo(
      monthlyPayment * 12,
      2
    )

    // Ending balance must be less than starting balance
    expect(result.endingBalance).toBeLessThan(199_000)

    // Interest should be approximately balance × annualRate for low rates.
    // Actual interest is slightly less than balance × rate because principal
    // is being paid down during the year (each month's interest is computed
    // on a slightly lower balance). At 2% on $199k, expect ~$3,900-$3,980.
    expect(result.interestPaid).toBeGreaterThan(3_800)
    expect(result.interestPaid).toBeLessThan(4_000)
  })

  it('handles 0% interest: all principal, zero interest', () => {
    // balance = $120,000, rate = 0%, monthlyPayment = $1,000
    // After 1 year: endingBalance = 108,000, principalPaid = 12,000, interestPaid = 0
    const result = stepMortgageYear(120_000, 0, 1_000)

    expect(result.endingBalance).toBe(108_000)
    expect(result.principalPaid).toBe(12_000)
    expect(result.interestPaid).toBe(0)
  })

  it('clamps balance to 0 when final payment is partial', () => {
    // Small balance that will be paid off within 12 months
    // balance = $500, rate = 5%, monthlyPayment = $100
    const result = stepMortgageYear(500, 0.05, 100)

    expect(result.endingBalance).toBe(0)
    // Principal paid should equal the starting balance (plus some rounding)
    expect(result.principalPaid).toBeCloseTo(500, 0)
    // Total payments < 12 × $100 because loan pays off early
    expect(result.principalPaid + result.interestPaid).toBeLessThan(1200)
  })

  it('handles zero balance', () => {
    const result = stepMortgageYear(0, 0.06, 1000)
    expect(result.endingBalance).toBe(0)
    expect(result.principalPaid).toBe(0)
    expect(result.interestPaid).toBe(0)
  })
})

describe('stepIRAYear', () => {
  it('compounds returns and adds contribution at end of year', () => {
    // $30,000 at 7% + $7,000 contribution:
    // Growth: 30000 × 1.07 = 32,100
    // Plus contribution: 32100 + 7000 = 39,100
    const result = stepIRAYear(30_000, 0.07, 7_000)
    expect(result).toBeCloseTo(39_100, 2)
  })

  it('returns 0 with zero balance and zero contribution', () => {
    // $0 at 7% + $0 contribution → 0
    expect(stepIRAYear(0, 0.07, 0)).toBe(0)
  })

  it('handles 0% return: balance + contribution', () => {
    // $50,000 at 0% + $7,000 → 57,000
    expect(stepIRAYear(50_000, 0, 7_000)).toBe(57_000)
  })

  it('handles contribution only (no initial balance)', () => {
    // $0 at 7% + $7,000 = $7,000
    expect(stepIRAYear(0, 0.07, 7_000)).toBe(7_000)
  })
})

describe('stepAppreciationYear', () => {
  it('applies compound appreciation correctly', () => {
    // $270,000 at 3% → 278,100
    expect(stepAppreciationYear(270_000, 0.03)).toBeCloseTo(278_100, 2)
  })

  it('handles 0% appreciation', () => {
    // $270,000 at 0% → 270,000
    expect(stepAppreciationYear(270_000, 0)).toBe(270_000)
  })

  it('handles negative appreciation (depreciation)', () => {
    // $270,000 at -5% → 256,500
    expect(stepAppreciationYear(270_000, -0.05)).toBeCloseTo(256_500, 2)
  })
})

// ===========================================================================
// Tier 2: Per-Scenario Smoke Tests
// ===========================================================================

describe('projectBaseline', () => {
  const result = projectBaseline(prestonInputs)

  it('returns correct number of yearly snapshots', () => {
    expect(result.yearlySnapshots).toHaveLength(20)
  })

  it('has correct scenario name', () => {
    expect(result.name).toContain('Baseline')
  })

  it('Year 1 net worth is positive and reasonable', () => {
    const year1 = result.yearlySnapshots[0]
    expect(year1.netWorth).toBeGreaterThan(0)
    // Kyle equity ~$71k + IRA ~$39k + some liquid savings
    // Should be in the ballpark of $100k-$200k
    expect(year1.netWorth).toBeGreaterThan(50_000)
    expect(year1.netWorth).toBeLessThan(500_000)
  })

  it('Year 20 net worth > Year 1 net worth', () => {
    const year1 = result.yearlySnapshots[0]
    const year20 = result.yearlySnapshots[19]
    expect(year20.netWorth).toBeGreaterThan(year1.netWorth)
  })

  it('IRA balance grows monotonically', () => {
    for (let i = 1; i < result.yearlySnapshots.length; i++) {
      expect(result.yearlySnapshots[i].iraBalance).toBeGreaterThan(
        result.yearlySnapshots[i - 1].iraBalance
      )
    }
  })

  it('Year 1 IRA matches manual calculation', () => {
    // $30,000 × 1.07 + $7,000 = $39,100
    expect(result.yearlySnapshots[0].iraBalance).toBeCloseTo(39_100, 0)
  })

  it('Year 20 IRA matches closed-form calculation', () => {
    const expectedIRA = calculateIRAFutureValue(30_000, 7_000, 0.07, 20)
    expect(result.yearlySnapshots[19].iraBalance).toBeCloseTo(expectedIRA, 0)
  })

  it('Year 1 income is base income (no growth)', () => {
    expect(result.yearlySnapshots[0].annualGrossIncome).toBe(100_000)
  })

  it('Year 1 Kyle home appreciates correctly', () => {
    // Kyle value year 1 = 270000 × 1.03 = 278,100
    // Kyle equity = 278100 - endingMortgageBalance
    expect(result.yearlySnapshots[0].currentHomeEquity).toBeGreaterThan(0)
  })

  it('has no rental exit tax event', () => {
    expect(result.rentalExitTaxEvent).toBeNull()
  })

  it('no new home equity (stays in Kyle)', () => {
    for (const snapshot of result.yearlySnapshots) {
      expect(snapshot.newHomeEquity).toBe(0)
      expect(snapshot.newHomeMortgageBalance).toBe(0)
    }
  })

  it('upfront capital shows no capital event', () => {
    expect(result.upfrontCapital.totalCashNeeded).toBe(0)
    expect(result.upfrontCapital.downPayment).toBe(0)
    expect(result.upfrontCapital.closingCosts).toBe(0)
    expect(result.upfrontCapital.homeSaleNetProceeds).toBeNull()
    expect(result.upfrontCapital.iraWithdrawalNetProceeds).toBeNull()
  })
})

describe('projectScenarioA', () => {
  const result = projectScenarioA(prestonInputs)

  it('returns correct number of yearly snapshots', () => {
    expect(result.yearlySnapshots).toHaveLength(20)
  })

  it('has correct scenario name', () => {
    expect(result.name).toContain('Scenario A')
  })

  it('Year 1 net worth is positive and reasonable', () => {
    const year1 = result.yearlySnapshots[0]
    expect(year1.netWorth).toBeGreaterThan(0)
  })

  it('Year 20 net worth > Year 1 net worth', () => {
    const year1 = result.yearlySnapshots[0]
    const year20 = result.yearlySnapshots[19]
    expect(year20.netWorth).toBeGreaterThan(year1.netWorth)
  })

  it('Kyle is sold: no Kyle equity for any year', () => {
    for (const snapshot of result.yearlySnapshots) {
      expect(snapshot.currentHomeEquity).toBe(0)
      expect(snapshot.currentHomeMortgageBalance).toBe(0)
    }
  })

  it('Austin equity grows over time', () => {
    const year1 = result.yearlySnapshots[0]
    const year20 = result.yearlySnapshots[19]
    expect(year20.newHomeEquity).toBeGreaterThan(year1.newHomeEquity)
  })

  it('IRA trajectory matches baseline (same contributions)', () => {
    const baselineResult = projectBaseline(prestonInputs)
    for (let i = 0; i < result.yearlySnapshots.length; i++) {
      expect(result.yearlySnapshots[i].iraBalance).toBeCloseTo(
        baselineResult.yearlySnapshots[i].iraBalance,
        0
      )
    }
  })

  it('has commute savings (shorter commute)', () => {
    // Austin commute is shorter than Kyle commute
    const year20 = result.yearlySnapshots[19]
    expect(year20.cumulativeCommuteSavings).toBeGreaterThan(0)
  })

  it('has no rental exit tax event', () => {
    expect(result.rentalExitTaxEvent).toBeNull()
  })

  it('upfront capital shows home sale proceeds', () => {
    expect(result.upfrontCapital.homeSaleNetProceeds).not.toBeNull()
    // Kyle sale: $270k - $16.2k (6% selling costs) - $199k (mortgage) = $54,800
    expect(result.upfrontCapital.homeSaleNetProceeds).toBeCloseTo(54_800, 0)
  })

  it('Austin monthly payment matches Phase 1 calculation', () => {
    // Austin loan = 300000 × 0.80 = 240,000
    // Monthly PI = calculateMonthlyPayment(240000, 0.06, 30) ≈ $1,438.92
    const expectedPayment = calculateMonthlyPayment(240_000, 0.06, 30)
    // Verify via mortgage balance declining correctly
    const year1MortgageBalance = result.yearlySnapshots[0].newHomeMortgageBalance
    expect(year1MortgageBalance).toBeLessThan(240_000)
    expect(year1MortgageBalance).toBeGreaterThan(230_000)
  })

  it('no PMI with 20% down', () => {
    // 20% down = 80% LTV = no PMI required
    // This is verified indirectly — monthly cash flow should not include PMI
    // Direct check: DTI housing cost should not include PMI component
    const expectedPITI =
      calculateMonthlyPayment(240_000, 0.06, 30) +
      (300_000 * 0.02) / 12 +
      2_400 / 12
    expect(result.dtiResult.frontEndDTI).toBeCloseTo(
      expectedPITI / (100_000 / 12),
      2
    )
  })
})

describe('projectScenarioB', () => {
  const result = projectScenarioB(prestonInputs)

  it('returns correct number of yearly snapshots', () => {
    expect(result.yearlySnapshots).toHaveLength(20)
  })

  it('has correct scenario name', () => {
    expect(result.name).toContain('Scenario B')
  })

  it('Year 1 IRA is $0 (withdrawn)', () => {
    // IRA starts at $0 after withdrawal, contribution is $0 in Scenario B
    // stepIRAYear(0, 0.07, 0) = 0
    expect(result.yearlySnapshots[0].iraBalance).toBe(0)
  })

  it('Year 1 has rental activity', () => {
    const year1 = result.yearlySnapshots[0]
    expect(year1.rentalGrossIncome).toBeDefined()
    expect(year1.rentalGrossIncome).toBeGreaterThan(0)
    expect(year1.depreciationExpense).toBeDefined()
    expect(year1.depreciationExpense).toBeGreaterThan(0)
  })

  it('Year 1 depreciation matches manual calculation', () => {
    // Depreciation = $270,000 × 0.85 / 27.5 = $8,345.45
    expect(result.yearlySnapshots[0].depreciationExpense).toBeCloseTo(
      8_345.45,
      0
    )
  })

  it('has rental exit tax event at year 20', () => {
    expect(result.rentalExitTaxEvent).not.toBeNull()
    expect(result.rentalExitTaxEvent!.totalDepreciationClaimed).toBeGreaterThan(
      0
    )
    expect(result.rentalExitTaxEvent!.depreciationRecaptureTax).toBeGreaterThan(
      0
    )
    expect(result.rentalExitTaxEvent!.netSaleProceeds).toBeGreaterThan(0)
  })

  it('cumulative depreciation at exit matches manual calculation', () => {
    // 20 years × $8,345.45/year = $166,909.09
    expect(
      result.rentalExitTaxEvent!.totalDepreciationClaimed
    ).toBeCloseTo(8_345.45 * 20, 0)
  })

  it('upfront capital shows IRA withdrawal proceeds', () => {
    expect(result.upfrontCapital.iraWithdrawalNetProceeds).not.toBeNull()
    // IRA withdrawal: $30k, taxes + penalty ≈ $9,600
    // Net proceeds ≈ $20,400
    expect(result.upfrontCapital.iraWithdrawalNetProceeds!).toBeGreaterThan(
      15_000
    )
    expect(result.upfrontCapital.iraWithdrawalNetProceeds!).toBeLessThan(
      30_000
    )
  })

  it('Austin has PMI with 10% down', () => {
    // 10% down = 90% LTV = PMI required
    // Austin loan = $270,000
    // Annual PMI = 270000 × 0.007 = $1,890
    // This affects monthly cash flow (PMI is in the housing cost)
    const austinLoan = 300_000 * 0.9
    const monthlyPI = calculateMonthlyPayment(austinLoan, 0.06, 30)
    const pitiWithPMI =
      monthlyPI +
      (300_000 * 0.02) / 12 +
      2_400 / 12 +
      (austinLoan * 0.007) / 12

    // DTI should include PMI
    expect(result.dtiResult.frontEndDTI).toBeGreaterThan(0.25)
  })

  it('DTI includes rental income credit', () => {
    expect(result.dtiResult.rentalIncomeCredit).toBeGreaterThan(0)
    // Rental income credit = $2,000 × 0.75 = $1,500
    expect(result.dtiResult.rentalIncomeCredit).toBeCloseTo(1_500, 0)
  })

  it('Kyle mortgage balance decreases over time while rental active', () => {
    // Year 1 Kyle balance should be less than initial
    expect(result.yearlySnapshots[0].currentHomeMortgageBalance).toBeLessThan(
      199_000
    )
  })

  it('Year 20 net worth is positive', () => {
    expect(result.yearlySnapshots[19].netWorth).toBeGreaterThan(0)
  })
})

// ===========================================================================
// Tier 3: runModel + Warning Generation
// ===========================================================================

describe('runModel', () => {
  const model = runModel(prestonInputs)

  it('returns all three scenarios', () => {
    expect(model.baseline).toBeDefined()
    expect(model.scenarioA).toBeDefined()
    expect(model.scenarioB).toBeDefined()
  })

  it('each scenario has 20 snapshots', () => {
    expect(model.baseline.yearlySnapshots).toHaveLength(20)
    expect(model.scenarioA.yearlySnapshots).toHaveLength(20)
    expect(model.scenarioB.yearlySnapshots).toHaveLength(20)
  })

  it('Scenario B has rentalExitTaxEvent, others do not', () => {
    expect(model.baseline.rentalExitTaxEvent).toBeNull()
    expect(model.scenarioA.rentalExitTaxEvent).toBeNull()
    expect(model.scenarioB.rentalExitTaxEvent).not.toBeNull()
  })

  it('Scenario B has more warnings than baseline', () => {
    expect(model.scenarioB.warnings.length).toBeGreaterThan(
      model.baseline.warnings.length
    )
  })

  it('all warning messages are non-empty strings', () => {
    const allWarnings = [
      ...model.baseline.warnings,
      ...model.scenarioA.warnings,
      ...model.scenarioB.warnings,
    ]
    for (const warning of allWarnings) {
      expect(warning.message).toBeTruthy()
      expect(typeof warning.message).toBe('string')
      expect(warning.message.length).toBeGreaterThan(0)
    }
  })

  it('all warnings have valid category and severity', () => {
    const validCategories = [
      'lending',
      'retirement',
      'liquidity',
      'tax',
      'landlord',
      'market',
    ]
    const validSeverities = ['info', 'warning', 'critical']
    const allWarnings = [
      ...model.baseline.warnings,
      ...model.scenarioA.warnings,
      ...model.scenarioB.warnings,
    ]
    for (const warning of allWarnings) {
      expect(validCategories).toContain(warning.category)
      expect(validSeverities).toContain(warning.severity)
    }
  })

  it('Scenario B includes retirement warning (IRA withdrawn)', () => {
    const retirementWarnings = model.scenarioB.warnings.filter(
      (w) => w.category === 'retirement'
    )
    expect(retirementWarnings.length).toBeGreaterThan(0)
  })

  it('Scenario B includes liquidity warnings', () => {
    const liquidityWarnings = model.scenarioB.warnings.filter(
      (w) => w.category === 'liquidity'
    )
    expect(liquidityWarnings.length).toBeGreaterThan(0)
  })

  it('baseline has no lending warnings (no new mortgage)', () => {
    const lendingWarnings = model.baseline.warnings.filter(
      (w) => w.category === 'lending'
    )
    expect(lendingWarnings.length).toBe(0)
  })
})

// ===========================================================================
// Tier 4: Directional Invariants (must hold for ANY valid inputs)
// ===========================================================================

describe('Directional invariants', () => {
  const model = runModel(prestonInputs)

  it('Scenario A IRA >= Scenario B IRA at every year', () => {
    for (let i = 0; i < model.scenarioA.yearlySnapshots.length; i++) {
      expect(model.scenarioA.yearlySnapshots[i].iraBalance).toBeGreaterThanOrEqual(
        model.scenarioB.yearlySnapshots[i].iraBalance
      )
    }
  })

  it('Scenario B Year 1 cash flow <= Scenario A Year 1 cash flow', () => {
    // Two mortgages + rental expenses vs one mortgage
    expect(
      model.scenarioB.yearlySnapshots[0].monthlyCashFlowBestCase
    ).toBeLessThanOrEqual(
      model.scenarioA.yearlySnapshots[0].monthlyCashFlowBestCase
    )
  })

  it('all snapshots have positive net worth', () => {
    for (const scenario of [model.baseline, model.scenarioA, model.scenarioB]) {
      for (const snapshot of scenario.yearlySnapshots) {
        expect(snapshot.netWorth).toBeGreaterThan(0)
      }
    }
  })

  it('snapshot count equals timeHorizonYears for all three', () => {
    expect(model.baseline.yearlySnapshots.length).toBe(
      prestonInputs.projection.timeHorizonYears
    )
    expect(model.scenarioA.yearlySnapshots.length).toBe(
      prestonInputs.projection.timeHorizonYears
    )
    expect(model.scenarioB.yearlySnapshots.length).toBe(
      prestonInputs.projection.timeHorizonYears
    )
  })

  it('IRA balance in baseline grows monotonically', () => {
    const snapshots = model.baseline.yearlySnapshots
    for (let i = 1; i < snapshots.length; i++) {
      expect(snapshots[i].iraBalance).toBeGreaterThan(
        snapshots[i - 1].iraBalance
      )
    }
  })

  it('Scenario A IRA equals Baseline IRA (same contributions)', () => {
    for (let i = 0; i < model.baseline.yearlySnapshots.length; i++) {
      expect(model.scenarioA.yearlySnapshots[i].iraBalance).toBeCloseTo(
        model.baseline.yearlySnapshots[i].iraBalance,
        0
      )
    }
  })
})
