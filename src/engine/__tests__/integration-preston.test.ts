// ---------------------------------------------------------------------------
// integration-preston.test.ts — Golden Run 1: Preston Defaults
//
// End-to-end integration test that runs runModel() with all default values
// from constants.ts (Preston's actual situation) and validates structural
// correctness, directional invariants, warning generation, and key checkpoint
// values across all three scenarios.
//
// This test does NOT recompute expected values manually — that's what unit
// tests do. Instead it verifies the engine pipeline produces consistent,
// reasonable, and directionally correct results.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest'
import { runModel } from '../scenarios'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '../constants'
import type { ScenarioInputs, ModelOutput } from '../types'

const prestonInputs: ScenarioInputs = {
  personal: DEFAULT_PERSONAL_INPUTS,
  retirement: DEFAULT_RETIREMENT_INPUTS,
  currentHome: DEFAULT_CURRENT_HOME_INPUTS,
  newHome: DEFAULT_NEW_HOME_INPUTS,
  commute: DEFAULT_COMMUTE_INPUTS,
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
}

describe('Integration: Preston Defaults (Golden Run 1)', () => {
  // Run the model once and reuse the result across all assertions
  let result: ModelOutput

  beforeAll(() => {
    result = runModel(prestonInputs)
  })

  // ---- 1. Structure checks ------------------------------------------------

  describe('structure checks', () => {
    it('returns all three scenarios with exactly 20 yearly snapshots', () => {
      expect(result.baseline.yearlySnapshots).toHaveLength(20)
      expect(result.scenarioA.yearlySnapshots).toHaveLength(20)
      expect(result.scenarioB.yearlySnapshots).toHaveLength(20)
    })

    it('scenarioB has a non-null rentalExitTaxEvent (exit at year 20)', () => {
      expect(result.scenarioB.rentalExitTaxEvent).not.toBeNull()
    })

    it('baseline and scenarioA rentalExitTaxEvent are null', () => {
      expect(result.baseline.rentalExitTaxEvent).toBeNull()
      expect(result.scenarioA.rentalExitTaxEvent).toBeNull()
    })

    it('all snapshots have sequential year numbers 1-20', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        scenario.yearlySnapshots.forEach((snap, idx) => {
          expect(snap.year).toBe(idx + 1)
        })
      }
    })
  })

  // ---- 2. Year 1 checkpoint assertions ------------------------------------

  describe('Year 1 checkpoints', () => {
    it('each scenario Year 1 net worth is positive and reasonable', () => {
      const baselineY1 = result.baseline.yearlySnapshots[0]
      const scenarioAY1 = result.scenarioA.yearlySnapshots[0]
      const scenarioBY1 = result.scenarioB.yearlySnapshots[0]

      // All net worths should be positive (all scenarios have home equity + some savings)
      expect(baselineY1.netWorth).toBeGreaterThan(0)
      expect(scenarioAY1.netWorth).toBeGreaterThan(0)
      expect(scenarioBY1.netWorth).toBeGreaterThan(0)

      // Reasonable range: $10k - $500k for year 1
      for (const snap of [baselineY1, scenarioAY1, scenarioBY1]) {
        expect(snap.netWorth).toBeGreaterThan(10_000)
        expect(snap.netWorth).toBeLessThan(500_000)
      }
    })

    it('baseline and scenarioA IRA balances are similar in Year 1 (~$39k after growth+contributions)', () => {
      const baselineIRA = result.baseline.yearlySnapshots[0].iraBalance
      const scenarioAIRA = result.scenarioA.yearlySnapshots[0].iraBalance

      // $30k * 1.07 + $7k = $39,100
      expect(baselineIRA).toBeCloseTo(39_100, -2) // within $100
      expect(scenarioAIRA).toBeCloseTo(39_100, -2)
    })

    it('scenarioB IRA balance is near $0 in Year 1 (withdrawn, $0 contributions)', () => {
      const scenarioBIRA = result.scenarioB.yearlySnapshots[0].iraBalance

      // IRA starts at $0 after withdrawal, Scenario B contribution is $0
      // $0 * 1.07 + $0 = $0
      expect(scenarioBIRA).toBe(0)
    })
  })

  // ---- 3. Year 20 checkpoint assertions -----------------------------------

  describe('Year 20 checkpoints', () => {
    it('final net worth for all three scenarios is positive', () => {
      expect(result.baseline.finalNetWorth).toBeGreaterThan(0)
      expect(result.scenarioA.finalNetWorth).toBeGreaterThan(0)
      expect(result.scenarioB.finalNetWorth).toBeGreaterThan(0)
    })

    it('Scenario A IRA > Scenario B IRA at year 20', () => {
      const scenarioAIRA = result.scenarioA.yearlySnapshots[19].iraBalance
      const scenarioBIRA = result.scenarioB.yearlySnapshots[19].iraBalance

      expect(scenarioAIRA).toBeGreaterThan(scenarioBIRA)
    })

    it('Scenario B rental exit event has positive recapture tax and net proceeds', () => {
      const exitEvent = result.scenarioB.rentalExitTaxEvent!

      expect(exitEvent.depreciationRecaptureTax).toBeGreaterThan(0)
      expect(exitEvent.netSaleProceeds).toBeGreaterThan(0)
    })

    it('Scenario B rental exit totalDepreciationClaimed is 20 years of depreciation', () => {
      const exitEvent = result.scenarioB.rentalExitTaxEvent!

      // Annual depreciation = $270k * 0.85 / 27.5 ≈ $8,345.45/year
      // 20 years ≈ $166,909
      expect(exitEvent.totalDepreciationClaimed).toBeCloseTo(8_345.45 * 20, -2)
    })
  })

  // ---- 4. Directional invariants ------------------------------------------

  describe('directional invariants', () => {
    it('Scenario A IRA >= Baseline IRA at every year', () => {
      for (let i = 0; i < 20; i++) {
        const baselineIRA = result.baseline.yearlySnapshots[i].iraBalance
        const scenarioAIRA = result.scenarioA.yearlySnapshots[i].iraBalance

        // Both scenarios use the same contribution rate, so they should be equal
        expect(scenarioAIRA).toBeGreaterThanOrEqual(baselineIRA - 0.01)
      }
    })

    it('Scenario A IRA > Scenario B IRA at every year', () => {
      for (let i = 0; i < 20; i++) {
        const scenarioAIRA = result.scenarioA.yearlySnapshots[i].iraBalance
        const scenarioBIRA = result.scenarioB.yearlySnapshots[i].iraBalance

        expect(scenarioAIRA).toBeGreaterThan(scenarioBIRA)
      }
    })

    it('Scenario B Year 1 worst-case cash flow < Scenario B Year 1 best-case cash flow', () => {
      const bestCase = result.scenarioB.yearlySnapshots[0].monthlyCashFlowBestCase
      const worstCase = result.scenarioB.yearlySnapshots[0].monthlyCashFlowWorstCase

      // Worst case accounts for vacancy and maintenance shocks on the rental
      expect(worstCase).toBeLessThan(bestCase)
    })

    it('all net worth values are positive', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        for (const snap of scenario.yearlySnapshots) {
          expect(snap.netWorth).toBeGreaterThan(0)
        }
      }
    })

    it('all snapshots have correct year numbers (1-20)', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        scenario.yearlySnapshots.forEach((snap, idx) => {
          expect(snap.year).toBe(idx + 1)
        })
      }
    })
  })

  // ---- 5. Warning assertions ----------------------------------------------

  describe('warning assertions', () => {
    it('Scenario B has more warnings than baseline', () => {
      expect(result.scenarioB.warnings.length).toBeGreaterThan(
        result.baseline.warnings.length
      )
    })

    it('Scenario B includes a retirement-category warning', () => {
      const retirementWarnings = result.scenarioB.warnings.filter(
        (w) => w.category === 'retirement'
      )
      expect(retirementWarnings.length).toBeGreaterThan(0)
    })

    it('Scenario B includes at least one liquidity-category warning', () => {
      const liquidityWarnings = result.scenarioB.warnings.filter(
        (w) => w.category === 'liquidity'
      )
      expect(liquidityWarnings.length).toBeGreaterThan(0)
    })

    it('all warning messages are non-empty strings', () => {
      for (const scenario of [result.baseline, result.scenarioA, result.scenarioB]) {
        for (const warning of scenario.warnings) {
          expect(typeof warning.message).toBe('string')
          expect(warning.message.length).toBeGreaterThan(0)
        }
      }
    })
  })

  // ---- 6. Rental exit (Year 20) -------------------------------------------

  describe('rental exit (Year 20)', () => {
    it('depreciationRecaptureTax > 0', () => {
      expect(result.scenarioB.rentalExitTaxEvent!.depreciationRecaptureTax).toBeGreaterThan(0)
    })

    it('netSaleProceeds > 0', () => {
      expect(result.scenarioB.rentalExitTaxEvent!.netSaleProceeds).toBeGreaterThan(0)
    })

    it('capitalGain > 0 (home appreciated over 20 years)', () => {
      expect(result.scenarioB.rentalExitTaxEvent!.capitalGain).toBeGreaterThan(0)
    })

    it('capitalGainsTax >= 0', () => {
      expect(result.scenarioB.rentalExitTaxEvent!.capitalGainsTax).toBeGreaterThanOrEqual(0)
    })
  })
})
