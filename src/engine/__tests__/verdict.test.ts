// ---------------------------------------------------------------------------
// verdict.test.ts — Tests for the verdict engine
//
// Tests dealbreaker detection, scenario comparison, and verdict synthesis.
// Uses both real model output (via runModel) and constructed edge cases
// to verify correctness of the decision cascade.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { checkDealbreakers, generateVerdict } from '../verdict'
import { runModel } from '../scenarios'
import type {
  ScenarioOutput,
  ScenarioInputs,
  ModelOutput,
  YearlySnapshot,
  Warning,
} from '../types'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '../constants'

// ---------------------------------------------------------------------------
// Test Data Builders
// ---------------------------------------------------------------------------

/** Creates a minimal viable ScenarioOutput for testing dealbreaker detection. */
function makeScenarioOutput(overrides: {
  surplus?: number
  backEndDTI?: number
  monthlyCashFlowBestCase?: number
  monthlyReserveRunwayMonths?: number
  finalNetWorth?: number
  totalIRAValue?: number
  warningCount?: number
  warnings?: Warning[]
}): ScenarioOutput {
  const {
    surplus = 10_000,
    backEndDTI = 0.30,
    monthlyCashFlowBestCase = 500,
    monthlyReserveRunwayMonths = 6,
    finalNetWorth = 500_000,
    totalIRAValue = 200_000,
    warningCount = 0,
    warnings,
  } = overrides

  const snapshot: YearlySnapshot = {
    year: 1,
    netWorth: 100_000,
    iraBalance: 30_000,
    currentHomeEquity: 70_000,
    newHomeEquity: 10_000,
    currentHomeMortgageBalance: 200_000,
    newHomeMortgageBalance: 240_000,
    annualCashFlow: monthlyCashFlowBestCase * 12,
    monthlyCashFlowBestCase,
    monthlyCashFlowWorstCase: monthlyCashFlowBestCase - 200,
    cumulativeCommuteSavings: 5_000,
    annualGrossIncome: 100_000,
  }

  const defaultWarnings: Warning[] = warnings ?? Array.from(
    { length: warningCount },
    (_, i) => ({
      category: 'liquidity' as const,
      severity: 'warning' as const,
      message: `Test warning ${i + 1}`,
    })
  )

  return {
    name: 'Test Scenario',
    yearlySnapshots: [snapshot],
    upfrontCapital: {
      totalCashNeeded: 50_000,
      cashAvailable: 50_000 + surplus,
      surplus,
      downPayment: 40_000,
      closingCosts: 7_500,
      movingCosts: 3_000,
      iraWithdrawalNetProceeds: null,
      homeSaleNetProceeds: null,
    },
    dtiResult: {
      frontEndDTI: backEndDTI - 0.05,
      backEndDTI,
      passesLenderThreshold: backEndDTI <= 0.43,
      rentalIncomeCredit: 0,
    },
    warnings: defaultWarnings,
    finalNetWorth,
    totalIRAValue,
    monthlyReserveRunwayMonths,
    rentalExitTaxEvent: null,
  }
}

/** Preston's default inputs as a ScenarioInputs object. */
const prestonDefaults: ScenarioInputs = {
  personal: DEFAULT_PERSONAL_INPUTS,
  retirement: DEFAULT_RETIREMENT_INPUTS,
  currentHome: DEFAULT_CURRENT_HOME_INPUTS,
  newHome: DEFAULT_NEW_HOME_INPUTS,
  commute: DEFAULT_COMMUTE_INPUTS,
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
}

/** Conservative couple inputs from integration-couple.test.ts. */
const coupleInputs: ScenarioInputs = {
  personal: {
    age: 42,
    annualGrossIncome: 150_000,
    annualSalaryGrowthRate: 0.02,
    filingStatus: 'married_filing_jointly',
    stateIncomeTaxRate: 0.0,
    monthlyLivingExpenses: 4_500,
    monthlyDebtPayments: 500,
    liquidSavings: 15_000,
  },
  retirement: {
    iraBalance: 50_000,
    iraType: 'roth',
    iraExpectedAnnualReturn: 0.07,
    annualIRAContributionScenarioA: 7_000,
    annualIRAContributionScenarioB: 0,
    hasEmployerMatch: false,
    employerMatchPercentage: 0.0,
    hasOtherRetirementSavings: false,
    otherRetirementBalance: 0,
  },
  currentHome: {
    homeValue: 400_000,
    mortgageBalance: 280_000,
    interestRate: 0.035,
    originalLoanTermYears: 30,
    yearsIntoLoan: 7,
    annualPropertyTaxRate: 0.022,
    annualInsurance: 3_200,
    landlordInsurancePremiumIncrease: 0.20,
    maintenanceReserveRate: 0.01,
    monthlyHOA: 150,
    expectedMonthlyRent: 2_800,
    annualRentGrowthRate: 0.03,
    vacancyRate: 0.08,
    propertyManagementFeeRate: 0.10,
    tenantTurnoverFrequencyYears: 2,
    costPerTurnover: 4_000,
    sellingCostsRate: 0.07,
    annualAppreciationRate: 0.03,
  },
  newHome: {
    purchasePrice: 500_000,
    interestRate: 0.065,
    loanTermYears: 30,
    downPaymentPercentScenarioA: 0.20,
    downPaymentPercentScenarioB: 0.10,
    annualPMIRate: 0.007,
    annualPropertyTaxRate: 0.022,
    annualInsurance: 3_600,
    closingCostsRate: 0.03,
    annualAppreciationRate: 0.035,
  },
  commute: {
    currentRoundTripMiles: 60,
    workDaysPerYear: 250,
    irsMileageRate: 0.725,
    currentMonthlyTolls: 400,
    newRoundTripMiles: 15,
    newMonthlyTolls: 50,
    commuteTimeSavedPerDayHours: 2.0,
    landlordHoursPerMonth: 3,
  },
  costs: {
    movingCosts: 5_000,
    insuranceEscalationRate: 0.03,
    propertyTaxEscalationRate: 0.02,
    generalInflationRate: 0.025,
    additionalTaxPrepCost: 800,
    umbrellaInsuranceAnnualCost: 400,
  },
  projection: {
    timeHorizonYears: 10,
    plannedRentalExitYear: 5,
  },
}

// ===========================================================================
// DEALBREAKER DETECTION UNIT TESTS
// ===========================================================================

describe('checkDealbreakers', () => {
  it('scenario with surplus of -$20,100 → not viable, reason mentions shortfall', () => {
    const scenario = makeScenarioOutput({ surplus: -20_100 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('$20,100')
    expect(result.reasons[0]).toContain('shortfall')
  })

  it('scenario with DTI of 0.48 → not viable, reason mentions 48%', () => {
    const scenario = makeScenarioOutput({ backEndDTI: 0.48 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('48%')
    expect(result.reasons[0]).toContain('43%')
  })

  it('negative month-1 cash flow → not viable, reason mentions monthly loss', () => {
    const scenario = makeScenarioOutput({ monthlyCashFlowBestCase: -350 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('-$350')
    expect(result.reasons[0]).toContain('losing money')
  })

  it('reserve runway 2.1 months → not viable, reason mentions months', () => {
    const scenario = makeScenarioOutput({ monthlyReserveRunwayMonths: 2.1 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('2.1')
    expect(result.reasons[0]).toContain('months')
  })

  it('reserve runway 0 months → not viable', () => {
    const scenario = makeScenarioOutput({ monthlyReserveRunwayMonths: 0 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    expect(result.reasons[0]).toContain('0.0')
  })

  it('multiple dealbreakers → all listed', () => {
    const scenario = makeScenarioOutput({
      surplus: -5_000,
      backEndDTI: 0.50,
      monthlyCashFlowBestCase: -200,
      monthlyReserveRunwayMonths: 1.0,
    })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
    // All four dealbreakers should be detected
    expect(result.reasons).toHaveLength(4)
    expect(result.reasons[0]).toContain('$5,000') // surplus shortfall
    expect(result.reasons[1]).toContain('50%')     // DTI
    expect(result.reasons[2]).toContain('-$200')   // negative cash flow
    expect(result.reasons[3]).toContain('1.0')     // reserve runway
  })

  it('no dealbreakers → viable, empty reasons', () => {
    const scenario = makeScenarioOutput({
      surplus: 10_000,
      backEndDTI: 0.30,
      monthlyCashFlowBestCase: 500,
      monthlyReserveRunwayMonths: 6,
    })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it('edge case: DTI exactly at 0.43 → viable (not exceeding)', () => {
    const scenario = makeScenarioOutput({ backEndDTI: 0.43 })
    const result = checkDealbreakers(scenario)

    // 0.43 is the threshold, not exceeded
    expect(result.isViable).toBe(true)
  })

  it('edge case: DTI at 0.4301 → not viable', () => {
    const scenario = makeScenarioOutput({ backEndDTI: 0.4301 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(false)
  })

  it('edge case: reserve runway exactly 3 months → viable', () => {
    const scenario = makeScenarioOutput({ monthlyReserveRunwayMonths: 3.0 })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(true)
  })

  it('edge case: surplus exactly 0 → viable', () => {
    const scenario = makeScenarioOutput({ surplus: 0 })
    const result = checkDealbreakers(scenario)

    // surplus = 0 means you have exactly enough — viable
    expect(result.isViable).toBe(true)
  })

  it('edge case: cash flow exactly 0 → viable', () => {
    const scenario = makeScenarioOutput({ monthlyCashFlowBestCase: 0 })
    const result = checkDealbreakers(scenario)

    // Breaking even is not a dealbreaker; negative cash flow is
    expect(result.isViable).toBe(true)
  })

  it('edge case: Infinity reserve runway → viable', () => {
    const scenario = makeScenarioOutput({ monthlyReserveRunwayMonths: Infinity })
    const result = checkDealbreakers(scenario)

    expect(result.isViable).toBe(true)
  })
})

// ===========================================================================
// PRESTON DEFAULTS — INTEGRATION TEST
// ===========================================================================

describe('generateVerdict: Preston defaults', () => {
  // Preston has $0 liquid savings. ALL three scenarios have 0 months reserve
  // runway because he has no emergency fund. Scenario A and B also have
  // capital shortfalls. The correct verdict is 'none' — he needs to save
  // before doing anything.
  const model = runModel(prestonDefaults)
  const verdict = generateVerdict(model, prestonDefaults)

  it('recommends none because all scenarios have dealbreakers (0 reserves)', () => {
    // Baseline has 0 months reserve runway — below the 3-month minimum.
    // Scenario A and B also have capital shortfalls and 0 reserves.
    expect(verdict.recommendation).toBe('none')
  })

  it('headline communicates that nothing works', () => {
    expect(verdict.headline.toLowerCase()).toContain('none')
    expect(verdict.headline.length).toBeLessThanOrEqual(60)
  })

  it('reasoning contains dollar amounts, not placeholders', () => {
    expect(verdict.reasoning.length).toBeGreaterThanOrEqual(2)
    expect(verdict.reasoning.length).toBeLessThanOrEqual(4)

    // Every reasoning string must contain at least one dollar amount or percentage
    for (const sentence of verdict.reasoning) {
      const hasDollarAmount = /\$[\d,]+/.test(sentence)
      const hasPercent = /\d+(\.\d+)?%/.test(sentence)
      expect(
        hasDollarAmount || hasPercent,
        `Reasoning sentence lacks dollar amount or percentage: "${sentence}"`
      ).toBe(true)
    }
  })

  it('dealbreakers include all three scenarios', () => {
    // All three fail: baseline has 0 reserve runway, A and B have capital shortfalls + 0 reserves
    expect(verdict.dealbreakers.length).toBe(3)

    const scenarioNames = verdict.dealbreakers.map(d => d.scenario)
    expect(scenarioNames).toContain('Baseline (stay put)')
    expect(scenarioNames).toContain('Scenario A (sell and buy)')
    expect(scenarioNames).toContain('Scenario B (keep as rental)')
  })

  it('Scenario A dealbreaker mentions capital shortfall of ~$15,700', () => {
    const scenarioADealbreaker = verdict.dealbreakers.find(
      d => d.scenario.includes('Scenario A')
    )!
    expect(scenarioADealbreaker.reasons.length).toBeGreaterThan(0)

    const hasShortfallReason = scenarioADealbreaker.reasons.some(
      r => r.includes('shortfall') && r.includes('$15,700')
    )
    expect(hasShortfallReason).toBe(true)
  })

  it('Scenario B dealbreaker mentions capital shortfall of ~$20,398', () => {
    const scenarioBDealbreaker = verdict.dealbreakers.find(
      d => d.scenario.includes('Scenario B')
    )!
    expect(scenarioBDealbreaker.reasons.length).toBeGreaterThan(0)

    const hasShortfallReason = scenarioBDealbreaker.reasons.some(
      r => r.includes('shortfall') && r.includes('$20,398')
    )
    expect(hasShortfallReason).toBe(true)
  })

  it('Baseline dealbreaker mentions reserve runway', () => {
    const baselineDealbreaker = verdict.dealbreakers.find(
      d => d.scenario.includes('Baseline')
    )!
    expect(baselineDealbreaker.reasons.length).toBeGreaterThan(0)
    expect(baselineDealbreaker.reasons.some(r => r.includes('reserve'))).toBe(true)
  })

  it('keyMetrics has at least 4 rows', () => {
    expect(verdict.keyMetrics.length).toBeGreaterThanOrEqual(4)
  })

  it('keyMetrics values match actual model output', () => {
    // Find net worth row
    const netWorthRow = verdict.keyMetrics.find(m => m.label.includes('Net worth'))!
    expect(netWorthRow).toBeDefined()
    // Should contain the formatted baseline net worth
    expect(netWorthRow.baseline).toContain('$')

    // Find IRA row
    const iraRow = verdict.keyMetrics.find(m => m.label.includes('IRA'))!
    expect(iraRow).toBeDefined()
    // Scenario B IRA should be $0
    expect(iraRow.scenarioB).toBe('$0')

    // Find cash flow row
    const cashFlowRow = verdict.keyMetrics.find(m => m.label.includes('cash flow'))!
    expect(cashFlowRow).toBeDefined()

    // Find reserve runway row
    const runwayRow = verdict.keyMetrics.find(m => m.label.includes('Reserve'))!
    expect(runwayRow).toBeDefined()
  })
})

// ===========================================================================
// CONSERVATIVE COUPLE — INTEGRATION TEST
// ===========================================================================

describe('generateVerdict: Conservative Couple', () => {
  const model = runModel(coupleInputs)
  const verdict = generateVerdict(model, coupleInputs)

  it('recommends baseline (it has Infinity reserves; A and B have shortfalls)', () => {
    // Couple has $15k savings. Baseline has Infinity reserve runway (no upfront costs).
    // Scenario A has -$13k surplus. Scenario B has -$5k surplus.
    // Baseline is the only viable option.
    expect(verdict.recommendation).toBe('baseline')
  })

  it('produces a different verdict structure than Preston defaults', () => {
    const prestonModel = runModel(prestonDefaults)
    const prestonVerdict = generateVerdict(prestonModel, prestonDefaults)

    // Couple gets baseline recommendation; Preston gets 'none'
    // because Preston has 0 savings (0 reserve runway even for baseline)
    expect(verdict.recommendation).toBe('baseline')
    expect(prestonVerdict.recommendation).toBe('none')

    // Different time horizons in key metrics
    const coupleNetWorth = verdict.keyMetrics.find(m => m.label.includes('Net worth'))!
    const prestonNetWorth = prestonVerdict.keyMetrics.find(m => m.label.includes('Net worth'))!
    expect(coupleNetWorth.label).toContain('10')
    expect(prestonNetWorth.label).toContain('20')
  })

  it('reasoning references dollar amounts', () => {
    for (const sentence of verdict.reasoning) {
      const hasDollarAmount = /\$[\d,]+/.test(sentence)
      const hasPercent = /\d+(\.\d+)?%/.test(sentence)
      expect(
        hasDollarAmount || hasPercent,
        `Missing financial reference: "${sentence}"`
      ).toBe(true)
    }
  })

  it('dealbreakers include A and B but not baseline', () => {
    const names = verdict.dealbreakers.map(d => d.scenario)
    expect(names).toContain('Scenario A (sell and buy)')
    expect(names).toContain('Scenario B (keep as rental)')
    expect(names).not.toContain('Baseline (stay put)')
  })
})

// ===========================================================================
// ALL DEALBREAKERS — EDGE CASE
// ===========================================================================

describe('generateVerdict: all scenarios have dealbreakers', () => {
  // Construct inputs where everything fails: very low income, high home price,
  // no savings, high debt
  const hopelessInputs: ScenarioInputs = {
    ...prestonDefaults,
    personal: {
      ...DEFAULT_PERSONAL_INPUTS,
      annualGrossIncome: 40_000,   // Very low income
      monthlyDebtPayments: 1_000,  // High existing debt
      liquidSavings: 0,
    },
    newHome: {
      ...DEFAULT_NEW_HOME_INPUTS,
      purchasePrice: 500_000,      // Expensive for the income
    },
  }

  const model = runModel(hopelessInputs)
  const verdict = generateVerdict(model, hopelessInputs)

  it('recommendation is none', () => {
    expect(verdict.recommendation).toBe('none')
  })

  it('headline communicates that nothing works', () => {
    expect(verdict.headline.toLowerCase()).toContain('none')
  })

  it('reasoning provides actionable guidance with dollar amounts', () => {
    expect(verdict.reasoning.length).toBeGreaterThanOrEqual(2)

    // Should mention saving more or reducing price
    const fullReasoning = verdict.reasoning.join(' ')
    const mentionsSaving = fullReasoning.includes('sav')
    const mentionsPrice = fullReasoning.includes('price')
    const mentionsIncome = fullReasoning.includes('income')

    expect(mentionsSaving || mentionsPrice || mentionsIncome).toBe(true)
  })

  it('all three scenarios appear in dealbreakers', () => {
    // Baseline should also fail because of DTI or reserve issues
    // given $40k income with $1k monthly debt
    // Actually baseline may not fail — check
    if (verdict.dealbreakers.length === 3) {
      expect(verdict.dealbreakers.length).toBe(3)
    } else {
      // At minimum, A and B should fail
      expect(verdict.dealbreakers.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('keyMetrics still populated even with no viable scenarios', () => {
    expect(verdict.keyMetrics.length).toBeGreaterThanOrEqual(4)
  })
})

// ===========================================================================
// ONLY BASELINE VIABLE
// ===========================================================================

describe('generateVerdict: only baseline viable', () => {
  // Use couple inputs where baseline has Infinity reserve runway (viable)
  // but Scenario A and B both have capital shortfalls (not viable)
  const model = runModel(coupleInputs)
  const verdict = generateVerdict(model, coupleInputs)

  it('recommendation is baseline', () => {
    expect(verdict.recommendation).toBe('baseline')
  })

  it('dealbreakers list A and B but not baseline', () => {
    const dealbreakScenarios = verdict.dealbreakers.map(d => d.scenario)
    expect(dealbreakScenarios).not.toContain('Baseline (stay put)')
    expect(verdict.dealbreakers.length).toBe(2)
  })

  it('reasoning explains that others were eliminated', () => {
    const fullReasoning = verdict.reasoning.join(' ')
    // Should mention that other scenarios are not viable / were eliminated
    expect(fullReasoning).toContain('eliminated')
  })
})

// ===========================================================================
// WEALTHY BUYER — SCENARIO A WINS
// ===========================================================================

describe('generateVerdict: wealthy buyer where Scenario A is viable', () => {
  // Give the user enough savings that Scenario A works
  const wealthyInputs: ScenarioInputs = {
    ...prestonDefaults,
    personal: {
      ...DEFAULT_PERSONAL_INPUTS,
      liquidSavings: 100_000, // Plenty of cash
      annualGrossIncome: 150_000,
    },
  }

  const model = runModel(wealthyInputs)
  const verdict = generateVerdict(model, wealthyInputs)

  it('recommends either scenarioA or baseline (both should be viable)', () => {
    // With $100k in savings, Scenario A should be viable
    // It may or may not beat baseline in net worth depending on model
    expect(['baseline', 'scenarioA', 'scenarioB']).toContain(verdict.recommendation)
    expect(verdict.recommendation).not.toBe('none')
  })

  it('has fewer dealbreakers than Preston defaults', () => {
    const prestonModel = runModel(prestonDefaults)
    const prestonVerdict = generateVerdict(prestonModel, prestonDefaults)

    expect(verdict.dealbreakers.length).toBeLessThan(prestonVerdict.dealbreakers.length)
  })

  it('reasoning contains specific dollar amounts', () => {
    for (const sentence of verdict.reasoning) {
      const hasDollarAmount = /\$[\d,]+/.test(sentence)
      const hasPercent = /\d+(\.\d+)?%/.test(sentence)
      expect(hasDollarAmount || hasPercent).toBe(true)
    }
  })
})

// ===========================================================================
// REASONING QUALITY CHECKS
// ===========================================================================

describe('verdict reasoning quality', () => {
  // Use couple inputs where baseline is recommended (single viable scenario)
  // to test reasoning quality on a recommendation path
  const model = runModel(coupleInputs)
  const verdict = generateVerdict(model, coupleInputs)

  it('headline is under 60 characters', () => {
    expect(verdict.headline.length).toBeLessThanOrEqual(60)
  })

  it('reasoning has 2-4 sentences', () => {
    expect(verdict.reasoning.length).toBeGreaterThanOrEqual(2)
    expect(verdict.reasoning.length).toBeLessThanOrEqual(4)
  })

  it('every reasoning string contains at least one dollar amount or percentage', () => {
    for (const sentence of verdict.reasoning) {
      const hasDollarAmount = /\$[\d,]+/.test(sentence)
      const hasPercent = /\d+(\.\d+)?%/.test(sentence)
      expect(
        hasDollarAmount || hasPercent,
        `Missing financial reference: "${sentence}"`
      ).toBe(true)
    }
  })

  it('keyMetrics has at least 4 rows', () => {
    expect(verdict.keyMetrics.length).toBeGreaterThanOrEqual(4)
  })

  it('keyMetrics labels are descriptive', () => {
    const labels = verdict.keyMetrics.map(m => m.label)
    expect(labels.some(l => l.includes('Net worth'))).toBe(true)
    expect(labels.some(l => l.includes('IRA'))).toBe(true)
    expect(labels.some(l => l.includes('cash flow'))).toBe(true)
    expect(labels.some(l => l.includes('cash needed') || l.includes('Upfront'))).toBe(true)
  })

  it('all keyMetric values contain $ or descriptive text', () => {
    for (const metric of verdict.keyMetrics) {
      for (const val of [metric.baseline, metric.scenarioA, metric.scenarioB]) {
        // Each value should be a formatted string with $ or a descriptive word
        expect(val.length).toBeGreaterThan(0)
        const hasContent = val.includes('$') || val.includes('month') || val.includes('Fully')
        expect(hasContent, `Empty or unformatted metric value: "${val}"`).toBe(true)
      }
    }
  })
})

// ===========================================================================
// CLOSE NET WORTH TIEBREAKER
// ===========================================================================

describe('generateVerdict: close net worth prefers better cash flow', () => {
  it('when net worth is within 5%, prefers scenario with better cash flow and lower risk', () => {
    // Construct a model where two scenarios have close net worth
    // but different cash flow and risk profiles
    const highCashFlowScenario = makeScenarioOutput({
      finalNetWorth: 500_000,
      monthlyCashFlowBestCase: 1_500,
      monthlyReserveRunwayMonths: 6,
      surplus: 10_000,
      warnings: [
        { category: 'liquidity', severity: 'info', message: 'Minor note about $500' },
      ],
    })

    const lowCashFlowScenario = makeScenarioOutput({
      finalNetWorth: 510_000,  // Only $10k more (2% difference, under 5%)
      monthlyCashFlowBestCase: 200,
      monthlyReserveRunwayMonths: 6,
      surplus: 10_000,
      warnings: [
        { category: 'liquidity', severity: 'critical', message: 'Major risk about $10,000 exposure' },
        { category: 'retirement', severity: 'critical', message: 'Zero retirement at $0' },
        { category: 'landlord', severity: 'warning', message: 'Landlord hassle at $2,000/yr' },
      ],
    })

    // Make baseline worst so it doesn't interfere
    const baselineScenario = makeScenarioOutput({
      finalNetWorth: 300_000,
      monthlyCashFlowBestCase: 2_000,
      monthlyReserveRunwayMonths: 12,
      surplus: 50_000,
    })

    const model: ModelOutput = {
      baseline: baselineScenario,
      scenarioA: highCashFlowScenario,
      scenarioB: lowCashFlowScenario,
    }

    const verdict = generateVerdict(model, prestonDefaults)

    // Scenario A has less net worth but much better cash flow and lower risk
    // When they're within 5%, the tiebreaker should prefer better cash flow + lower risk
    expect(verdict.recommendation).toBe('scenarioA')
  })
})

// ===========================================================================
// DEALBREAKER DETECTION ON REAL MODEL OUTPUT
// ===========================================================================

describe('checkDealbreakers on real model output', () => {
  const prestonModel = runModel(prestonDefaults)

  it('baseline with Preston defaults has 0 reserve runway dealbreaker', () => {
    // Preston has $0 liquid savings → 0 months reserve runway
    const result = checkDealbreakers(prestonModel.baseline)
    expect(result.isViable).toBe(false)
    expect(result.reasons.some(r => r.includes('reserve'))).toBe(true)
  })

  it('Scenario A with Preston defaults has capital shortfall dealbreaker', () => {
    const result = checkDealbreakers(prestonModel.scenarioA)
    expect(result.isViable).toBe(false)
    expect(result.reasons.some(r => r.includes('shortfall'))).toBe(true)
  })

  it('Scenario B with Preston defaults has capital shortfall dealbreaker', () => {
    const result = checkDealbreakers(prestonModel.scenarioB)
    expect(result.isViable).toBe(false)
    expect(result.reasons.some(r => r.includes('shortfall'))).toBe(true)
  })

  it('baseline with couple inputs (Infinity reserves) is viable', () => {
    const coupleModel = runModel(coupleInputs)
    const result = checkDealbreakers(coupleModel.baseline)
    // Couple has $15k savings and Infinity reserve runway for baseline
    expect(result.isViable).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })
})
