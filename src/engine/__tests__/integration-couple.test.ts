// ---------------------------------------------------------------------------
// integration-couple.test.ts — Golden Run 2: Conservative Couple
//
// End-to-end integration test that runs runModel() with a second profile
// designed to exercise different code paths from the Preston defaults:
//
//   - Married filing jointly (wider tax brackets)
//   - Roth IRA (no income tax on withdrawal, contributions out tax-free)
//   - $150k AGI (full passive loss phase-out — zero rental deduction)
//   - Mid-projection rental exit at year 5
//   - $500/mo car payment (pushes DTI higher)
//   - 10% property management fee
//   - $150/mo HOA on rental
//   - 10-year time horizon
//
// This test validates structural correctness, directional invariants,
// Roth-specific behavior, mid-projection rental exit, and passive loss
// phase-out at higher income levels.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest'
import { runModel } from '../scenarios'
import type { ScenarioInputs, ModelOutput } from '../types'

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
    iraWithdrawalAmountScenarioB: 50_000, // Full balance
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
    landValuePercentage: 0.15,
    rentalIncomeDTICreditRate: 0.75,
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
  homeNames: {
    currentHomeName: 'Current Home',
    newHomeName: 'New Home',
  },
}

describe('Integration: Conservative Couple (Golden Run 2)', () => {
  let result: ModelOutput

  beforeAll(() => {
    result = runModel(coupleInputs)
  })

  // ---- 1. Structure checks ------------------------------------------------

  describe('structure checks', () => {
    it('all three scenarios have exactly 10 snapshots', () => {
      expect(result.baseline.yearlySnapshots).toHaveLength(10)
      expect(result.scenarioA.yearlySnapshots).toHaveLength(10)
      expect(result.scenarioB.yearlySnapshots).toHaveLength(10)
    })

    it('Scenario B has a non-null rentalExitTaxEvent', () => {
      expect(result.scenarioB.rentalExitTaxEvent).not.toBeNull()
    })

    it('baseline and scenarioA rentalExitTaxEvent are null', () => {
      expect(result.baseline.rentalExitTaxEvent).toBeNull()
      expect(result.scenarioA.rentalExitTaxEvent).toBeNull()
    })

    it('all snapshots have sequential year numbers 1-10', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        scenario.yearlySnapshots.forEach((snap, idx) => {
          expect(snap.year).toBe(idx + 1)
        })
      }
    })
  })

  // ---- 2. Roth IRA withdrawal ---------------------------------------------

  describe('Roth IRA withdrawal', () => {
    it('Roth withdrawal net proceeds equal full balance (no tax, no penalty per engine simplification)', () => {
      // The engine treats Roth withdrawals as all-contributions (tax-free, penalty-free)
      // per the simplification documented in tax.ts
      expect(result.scenarioB.upfrontCapital.iraWithdrawalNetProceeds).toBe(50_000)
    })

    it('Scenario B IRA starts at $0 after full withdrawal', () => {
      // $0 * 1.07 + $0 = $0 (no contributions in Scenario B)
      expect(result.scenarioB.yearlySnapshots[0].iraBalance).toBe(0)
    })
  })

  // ---- 3. Mid-projection rental exit (year 5) -----------------------------

  describe('mid-projection rental exit at year 5', () => {
    it('years 1-5 have rental activity (rentalGrossIncome defined)', () => {
      for (let i = 0; i < 5; i++) {
        const snap = result.scenarioB.yearlySnapshots[i]
        expect(snap.rentalGrossIncome).toBeDefined()
        expect(snap.rentalGrossIncome).toBeGreaterThan(0)
      }
    })

    it('years 6-10 have NO rental activity (rentalGrossIncome undefined)', () => {
      for (let i = 5; i < 10; i++) {
        const snap = result.scenarioB.yearlySnapshots[i]
        expect(snap.rentalGrossIncome).toBeUndefined()
      }
    })

    it('rental exit event at year 5 shows depreciation recapture > 0', () => {
      const exitEvent = result.scenarioB.rentalExitTaxEvent!
      expect(exitEvent.depreciationRecaptureTax).toBeGreaterThan(0)
    })

    it('rental exit event has positive net sale proceeds', () => {
      const exitEvent = result.scenarioB.rentalExitTaxEvent!
      expect(exitEvent.netSaleProceeds).toBeGreaterThan(0)
    })

    it('total depreciation claimed is 5 years worth', () => {
      const exitEvent = result.scenarioB.rentalExitTaxEvent!

      // Annual depreciation = $400k * 0.85 / 27.5 ≈ $12,363.64/year
      // 5 years ≈ $61,818
      const expectedAnnualDepr = (400_000 * 0.85) / 27.5
      expect(exitEvent.totalDepreciationClaimed).toBeCloseTo(
        expectedAnnualDepr * 5,
        -1 // within $10
      )
    })
  })

  // ---- 4. Passive loss phase-out ------------------------------------------

  describe('passive loss phase-out', () => {
    it('at $150k AGI, passiveLossAllowed should be 0 or very close to 0 in Year 1', () => {
      const year1 = result.scenarioB.yearlySnapshots[0]

      // At $150k AGI, the passive activity loss allowance is fully phased out
      // Phase-out: $25k reduced by $0.50 per $1 above $100k
      // At $150k: reduction = ($150k - $100k) * 0.50 = $25k → allowance = $0
      expect(year1.passiveLossAllowed).toBeDefined()
      expect(year1.passiveLossAllowed!).toBeCloseTo(0, 0)
    })

    it('passive loss is suspended (carried forward) in Year 1', () => {
      const year1 = result.scenarioB.yearlySnapshots[0]

      // With zero allowance, any rental loss is fully suspended
      expect(year1.passiveLossSuspended).toBeDefined()
      expect(year1.passiveLossSuspended!).toBeGreaterThanOrEqual(0)
    })
  })

  // ---- 5. Directional invariants ------------------------------------------

  describe('directional invariants', () => {
    it('Scenario A IRA > Scenario B IRA at every year', () => {
      for (let i = 0; i < 10; i++) {
        const scenarioAIRA = result.scenarioA.yearlySnapshots[i].iraBalance
        const scenarioBIRA = result.scenarioB.yearlySnapshots[i].iraBalance

        expect(scenarioAIRA).toBeGreaterThan(scenarioBIRA)
      }
    })

    it('Scenario B Year 1 cash flow <= Scenario A Year 1 cash flow', () => {
      const scenarioACF = result.scenarioA.yearlySnapshots[0].monthlyCashFlowBestCase
      const scenarioBCF = result.scenarioB.yearlySnapshots[0].monthlyCashFlowBestCase

      // Scenario B has two mortgages + landlord costs; Scenario A has one mortgage
      expect(scenarioBCF).toBeLessThanOrEqual(scenarioACF)
    })

    it('all net worth values are positive', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        for (const snap of scenario.yearlySnapshots) {
          expect(snap.netWorth).toBeGreaterThan(0)
        }
      }
    })

    it('all snapshot counts = 10', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        expect(scenario.yearlySnapshots).toHaveLength(10)
      }
    })
  })

  // ---- 6. DTI with debt ---------------------------------------------------

  describe('DTI with debt', () => {
    it('back-end DTI is higher than a no-debt scenario would be', () => {
      // With $500/mo car payment + housing, DTI should be meaningfully above
      // just-housing DTI. We just verify it's above 20% (conservative check).
      expect(result.scenarioB.dtiResult.backEndDTI).toBeGreaterThan(0.20)
    })

    it('Scenario B DTI includes rental income credit', () => {
      // Scenario B has rental income that should be credited at 75%
      expect(result.scenarioB.dtiResult.rentalIncomeCredit).toBeGreaterThan(0)
    })

    it('front-end DTI is less than back-end DTI when there are other debts', () => {
      // With $500/mo car payment, back-end must exceed front-end
      expect(result.scenarioA.dtiResult.backEndDTI).toBeGreaterThan(
        result.scenarioA.dtiResult.frontEndDTI
      )
    })
  })

  // ---- 7. Warning differences ---------------------------------------------

  describe('warning differences', () => {
    it('Scenario B has warnings', () => {
      expect(result.scenarioB.warnings.length).toBeGreaterThan(0)
    })

    it('should trigger passive loss phase-out warning at $150k+ AGI', () => {
      // The engine generates a tax/info warning when AGI >= $150k
      const phaseOutWarnings = result.scenarioB.warnings.filter(
        (w) => w.category === 'tax' && w.message.toLowerCase().includes('deduct')
      )
      expect(phaseOutWarnings.length).toBeGreaterThan(0)
    })

    it('all warning messages are non-empty strings', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        for (const warning of scenario.warnings) {
          expect(typeof warning.message).toBe('string')
          expect(warning.message.length).toBeGreaterThan(0)
        }
      }
    })

    it('Scenario B includes a retirement-category warning', () => {
      const retirementWarnings = result.scenarioB.warnings.filter(
        (w) => w.category === 'retirement'
      )
      expect(retirementWarnings.length).toBeGreaterThan(0)
    })
  })
})
