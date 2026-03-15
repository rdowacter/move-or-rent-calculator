// ---------------------------------------------------------------------------
// verdict.ts — Verdict Engine
//
// Pure function that evaluates all three financial scenarios and produces a
// risk-gated, plain-language recommendation with dollar amounts. This is the
// most important output the user sees — it answers "what should I do?"
//
// The decision follows a strict cascade:
//   1. Dealbreaker scan — eliminate scenarios that are not financially viable
//   2. Viability comparison — compare surviving scenarios on key metrics
//   3. Synthesis — assemble headline, reasoning, and key metrics
//
// All functions are pure — zero React, zero DOM, zero side effects.
// ---------------------------------------------------------------------------

import type {
  ScenarioOutput,
  ScenarioInputs,
  ModelOutput,
  VerdictResult,
  Warning,
} from './types'

import { DTI_HARD_MAX } from './constants'
import { formatCurrency, formatPercent } from '../utils/formatters'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum months of reserve runway required for a scenario to be considered
 * viable. Below this threshold, the user is one emergency from financial crisis.
 * Industry rule of thumb: 3 months is the bare minimum emergency fund.
 */
const MIN_RESERVE_RUNWAY_MONTHS = 3

/**
 * Severity weights for computing a risk score from warnings.
 * Critical warnings are weighted 3x more than info warnings because
 * they represent imminent financial danger, not just awareness items.
 */
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
}

// ---------------------------------------------------------------------------
// Dealbreaker Detection
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a single scenario is financially viable by checking for
 * critical dealbreakers. A scenario is eliminated if ANY dealbreaker is found.
 *
 * Each dealbreaker reason includes the actual dollar amount or percentage from
 * the scenario — no generic messages.
 *
 * @param scenario - The scenario output to evaluate
 * @returns Object with isViable flag and array of specific reasons if not viable
 */
export function checkDealbreakers(
  scenario: ScenarioOutput
): { isViable: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Dealbreaker 1: Can't afford upfront costs
  if (scenario.upfrontCapital.surplus < 0) {
    const shortfall = Math.abs(scenario.upfrontCapital.surplus)
    reasons.push(
      `Upfront cash shortfall of ${formatCurrency(shortfall)} — you need ${formatCurrency(scenario.upfrontCapital.totalCashNeeded)} but only have ${formatCurrency(scenario.upfrontCapital.cashAvailable)} available`
    )
  }

  // Dealbreaker 2: Lender won't approve the mortgage
  if (scenario.dtiResult.backEndDTI > DTI_HARD_MAX) {
    reasons.push(
      `Debt-to-income ratio of ${formatPercent(scenario.dtiResult.backEndDTI)} exceeds the ${formatPercent(DTI_HARD_MAX)} qualified mortgage maximum — lender will not approve`
    )
  }

  // Dealbreaker 3: Bleeding money from day one
  const year1 = scenario.yearlySnapshots[0]
  if (year1 && year1.monthlyCashFlowBestCase < 0) {
    reasons.push(
      `Negative monthly cash flow of ${formatCurrency(year1.monthlyCashFlowBestCase)} in Year 1 — you would be losing money every month even in the best case`
    )
  }

  // Dealbreaker 4: Dangerously thin reserves
  if (scenario.monthlyReserveRunwayMonths < MIN_RESERVE_RUNWAY_MONTHS) {
    const runwayDisplay = scenario.monthlyReserveRunwayMonths === Infinity
      ? 'infinite'
      : scenario.monthlyReserveRunwayMonths.toFixed(1)
    reasons.push(
      `Only ${runwayDisplay} months of reserve runway — minimum ${MIN_RESERVE_RUNWAY_MONTHS} months needed to survive an emergency`
    )
  }

  return {
    isViable: reasons.length === 0,
    reasons,
  }
}

// ---------------------------------------------------------------------------
// Risk Scoring
// ---------------------------------------------------------------------------

/**
 * Computes a weighted risk score from a scenario's warnings.
 * Higher score = more risk. Used to break ties when net worth is close.
 */
function warningRiskScore(warnings: Warning[]): number {
  return warnings.reduce((score, w) => {
    return score + (SEVERITY_WEIGHTS[w.severity] ?? 1)
  }, 0)
}

// ---------------------------------------------------------------------------
// Key Metrics Assembly
// ---------------------------------------------------------------------------

/**
 * Builds the side-by-side comparison table of key metrics across all three
 * scenarios. Values are pre-formatted strings ready for display.
 */
function buildKeyMetrics(
  model: ModelOutput,
  inputs: ScenarioInputs
): VerdictResult['keyMetrics'] {
  const horizon = inputs.projection.timeHorizonYears
  const retirementAge = 65

  // Helper to format reserve runway (handles Infinity)
  function formatRunway(months: number): string {
    if (months === Infinity) return 'Fully funded'
    if (months === 0) return '0 months'
    return `${months.toFixed(1)} months`
  }

  return [
    {
      label: `Net worth at year ${horizon}`,
      baseline: formatCurrency(model.baseline.finalNetWorth),
      scenarioA: formatCurrency(model.scenarioA.finalNetWorth),
      scenarioB: formatCurrency(model.scenarioB.finalNetWorth),
    },
    {
      label: `IRA at age ${retirementAge}`,
      baseline: formatCurrency(model.baseline.totalIRAValue),
      scenarioA: formatCurrency(model.scenarioA.totalIRAValue),
      scenarioB: formatCurrency(model.scenarioB.totalIRAValue),
    },
    {
      label: 'Monthly cash flow (Year 1)',
      baseline: formatCurrency(model.baseline.yearlySnapshots[0].monthlyCashFlowBestCase),
      scenarioA: formatCurrency(model.scenarioA.yearlySnapshots[0].monthlyCashFlowBestCase),
      scenarioB: formatCurrency(model.scenarioB.yearlySnapshots[0].monthlyCashFlowBestCase),
    },
    {
      label: 'Upfront cash needed',
      baseline: formatCurrency(model.baseline.upfrontCapital.totalCashNeeded),
      scenarioA: formatCurrency(model.scenarioA.upfrontCapital.totalCashNeeded),
      scenarioB: formatCurrency(model.scenarioB.upfrontCapital.totalCashNeeded),
    },
    {
      label: 'Reserve runway',
      baseline: formatRunway(model.baseline.monthlyReserveRunwayMonths),
      scenarioA: formatRunway(model.scenarioA.monthlyReserveRunwayMonths),
      scenarioB: formatRunway(model.scenarioB.monthlyReserveRunwayMonths),
    },
  ]
}

// ---------------------------------------------------------------------------
// Scenario Metadata
// ---------------------------------------------------------------------------

type ScenarioKey = 'baseline' | 'scenarioA' | 'scenarioB'

const SCENARIO_DISPLAY_NAMES: Record<ScenarioKey, string> = {
  baseline: 'Baseline (stay put)',
  scenarioA: 'Scenario A (sell and buy)',
  scenarioB: 'Scenario B (keep as rental)',
}

const SCENARIO_HEADLINE_NAMES: Record<ScenarioKey, string> = {
  baseline: 'Stay in your current home',
  scenarioA: 'Scenario A is the stronger choice',
  scenarioB: 'Scenario B is the stronger choice',
}

// ---------------------------------------------------------------------------
// Synthesis Helpers
// ---------------------------------------------------------------------------

/**
 * Generates reasoning for when no scenarios are viable.
 * Provides actionable guidance about what the user would need to change.
 */
function synthesizeNoneViable(
  model: ModelOutput,
  _dealbreakersMap: Record<ScenarioKey, { isViable: boolean; reasons: string[] }>
): string[] {
  const reasoning: string[] = []

  // Check if capital shortfall is the main blocker
  const scenarioASurplus = model.scenarioA.upfrontCapital.surplus
  const scenarioBSurplus = model.scenarioB.upfrontCapital.surplus

  if (scenarioASurplus < 0 && scenarioBSurplus < 0) {
    const minShortfall = Math.min(Math.abs(scenarioASurplus), Math.abs(scenarioBSurplus))
    reasoning.push(
      `Both moving scenarios require more cash than you have — the smallest shortfall is ${formatCurrency(minShortfall)}.`
    )
    reasoning.push(
      `Consider saving at least ${formatCurrency(minShortfall)} more before revisiting, or look at a lower purchase price.`
    )
  }

  // Check if DTI is a blocker
  const scenarioBDTI = model.scenarioB.dtiResult.backEndDTI
  if (scenarioBDTI > DTI_HARD_MAX) {
    reasoning.push(
      `Scenario B's DTI of ${formatPercent(scenarioBDTI)} exceeds lending limits — you would need higher income or lower debt to qualify.`
    )
  }

  if (reasoning.length === 0) {
    reasoning.push(
      'None of the scenarios meet the minimum financial safety thresholds with your current numbers.'
    )
    reasoning.push(
      'Consider increasing your savings, reducing the purchase price, or increasing your income before proceeding.'
    )
  }

  return reasoning
}

/**
 * Generates reasoning for when exactly one scenario is viable.
 */
function synthesizeSingleViable(
  winner: ScenarioKey,
  winnerOutput: ScenarioOutput,
  _model: ModelOutput,
  eliminated: { scenario: string; reasons: string[] }[],
  inputs: ScenarioInputs
): string[] {
  const reasoning: string[] = []
  const horizon = inputs.projection.timeHorizonYears

  reasoning.push(
    `${SCENARIO_DISPLAY_NAMES[winner]} is the only viable option, producing ${formatCurrency(winnerOutput.finalNetWorth)} in net worth over ${horizon} years.`
  )

  // Add key metric about cash flow
  reasoning.push(
    `Monthly cash flow is ${formatCurrency(winnerOutput.yearlySnapshots[0].monthlyCashFlowBestCase)}/mo in Year 1, and the other scenarios were eliminated by critical financial risks.`
  )

  // Mention the biggest eliminated scenario's primary reason
  if (eliminated.length > 0) {
    const primaryEliminated = eliminated[0]
    if (primaryEliminated.reasons.length > 0) {
      reasoning.push(
        `${primaryEliminated.scenario} was eliminated: ${primaryEliminated.reasons[0].charAt(0).toLowerCase() + primaryEliminated.reasons[0].slice(1)}`
      )
    }
  }

  return reasoning
}

/**
 * Generates reasoning for when multiple scenarios are viable and we're
 * comparing them to pick the best one.
 */
function synthesizeComparison(
  winner: ScenarioKey,
  viable: { key: ScenarioKey; output: ScenarioOutput }[],
  model: ModelOutput,
  inputs: ScenarioInputs
): string[] {
  const reasoning: string[] = []
  const horizon = inputs.projection.timeHorizonYears
  const winnerOutput = model[winner]

  // Find the runner-up
  const runnerUp = viable.find(v => v.key !== winner)

  if (runnerUp) {
    const netWorthDiff = winnerOutput.finalNetWorth - runnerUp.output.finalNetWorth
    const iraDiff = winnerOutput.totalIRAValue - runnerUp.output.totalIRAValue

    if (Math.abs(netWorthDiff) > 10_000) {
      reasoning.push(
        `It builds ${formatCurrency(Math.abs(netWorthDiff))} more in net worth over ${horizon} years than ${SCENARIO_DISPLAY_NAMES[runnerUp.key]}.`
      )
    } else {
      // Very close — mention both are viable
      reasoning.push(
        `Net worth is very close between the top options — only ${formatCurrency(Math.abs(netWorthDiff))} apart over ${horizon} years.`
      )
    }

    // Retirement comparison
    if (Math.abs(iraDiff) > 5_000) {
      reasoning.push(
        `Retirement savings are ${formatCurrency(Math.abs(winnerOutput.totalIRAValue))} vs ${formatCurrency(Math.abs(runnerUp.output.totalIRAValue))} at age 65.`
      )
    }

    // Cash flow comparison
    const winnerCashFlow = winnerOutput.yearlySnapshots[0].monthlyCashFlowBestCase
    const runnerCashFlow = runnerUp.output.yearlySnapshots[0].monthlyCashFlowBestCase
    const cashFlowDiff = winnerCashFlow - runnerCashFlow

    if (winnerCashFlow > 0 && runnerCashFlow > 0 && Math.abs(cashFlowDiff) > 50) {
      if (cashFlowDiff < 0) {
        // Winner has worse cash flow — mention the tradeoff
        reasoning.push(
          `Monthly cash flow is tighter at ${formatCurrency(winnerCashFlow)}/mo vs ${formatCurrency(runnerCashFlow)}/mo, but the long-term wealth advantage outweighs the monthly squeeze.`
        )
      } else {
        reasoning.push(
          `Monthly cash flow is also stronger at ${formatCurrency(winnerCashFlow)}/mo vs ${formatCurrency(runnerCashFlow)}/mo.`
        )
      }
    }
  } else {
    // Only one viable scenario left (e.g., baseline only)
    reasoning.push(
      `This path produces ${formatCurrency(winnerOutput.finalNetWorth)} in net worth over ${horizon} years with ${formatCurrency(winnerOutput.yearlySnapshots[0].monthlyCashFlowBestCase)}/mo cash flow in Year 1.`
    )
  }

  return reasoning
}

// ---------------------------------------------------------------------------
// Main Verdict Function
// ---------------------------------------------------------------------------

/**
 * Generates a risk-gated, plain-language verdict by evaluating all three
 * financial scenarios. This is the core decision engine.
 *
 * The function follows a strict cascade:
 *   1. Eliminate scenarios with dealbreakers (capital shortfall, DTI failure,
 *      negative cash flow, insufficient reserves)
 *   2. Compare surviving scenarios on net worth, IRA balance, cash flow,
 *      and risk score
 *   3. Synthesize a headline, reasoning with dollar amounts, and key metrics
 *
 * @param model - Complete model output from runModel()
 * @param inputs - The user's scenario inputs (needed for time horizon, etc.)
 * @returns VerdictResult with recommendation, reasoning, and comparison data
 */
export function generateVerdict(
  model: ModelOutput,
  inputs: ScenarioInputs
): VerdictResult {
  const scenarios: { key: ScenarioKey; output: ScenarioOutput }[] = [
    { key: 'baseline', output: model.baseline },
    { key: 'scenarioA', output: model.scenarioA },
    { key: 'scenarioB', output: model.scenarioB },
  ]

  // Step 1: Dealbreaker scan
  const dealbreakersMap: Record<ScenarioKey, { isViable: boolean; reasons: string[] }> = {
    baseline: checkDealbreakers(model.baseline),
    scenarioA: checkDealbreakers(model.scenarioA),
    scenarioB: checkDealbreakers(model.scenarioB),
  }

  const dealbreakers: VerdictResult['dealbreakers'] = scenarios
    .filter(s => !dealbreakersMap[s.key].isViable)
    .map(s => ({
      scenario: SCENARIO_DISPLAY_NAMES[s.key],
      reasons: dealbreakersMap[s.key].reasons,
    }))

  const viableScenarios = scenarios.filter(s => dealbreakersMap[s.key].isViable)

  // Build key metrics regardless of outcome
  const keyMetrics = buildKeyMetrics(model, inputs)

  // Step 2 & 3: Compare and synthesize based on how many survived
  if (viableScenarios.length === 0) {
    return {
      recommendation: 'none',
      headline: 'None of these scenarios work right now',
      reasoning: synthesizeNoneViable(model, dealbreakersMap),
      dealbreakers,
      keyMetrics,
    }
  }

  if (viableScenarios.length === 1) {
    const winner = viableScenarios[0]
    return {
      recommendation: winner.key,
      headline: SCENARIO_HEADLINE_NAMES[winner.key],
      reasoning: synthesizeSingleViable(
        winner.key,
        winner.output,
        model,
        dealbreakers,
        inputs
      ),
      dealbreakers,
      keyMetrics,
    }
  }

  // Multiple viable — compare on metrics
  const winner = pickBestScenario(viableScenarios, inputs)

  return {
    recommendation: winner.key,
    headline: SCENARIO_HEADLINE_NAMES[winner.key],
    reasoning: synthesizeComparison(winner.key, viableScenarios, model, inputs),
    dealbreakers,
    keyMetrics,
  }
}

/**
 * Picks the best scenario from a list of viable options by comparing
 * on a priority-ordered set of metrics:
 *   1. Final net worth (primary — the wealth question)
 *   2. IRA at age 65 (secondary — the retirement question)
 *   3. Year 1 cash flow (tiebreaker — the affordability question)
 *   4. Warning risk score (final tiebreaker — the risk question)
 *
 * When net worth is very close (within 5% of the larger value), the
 * scenario with better cash flow and lower risk wins — because a small
 * net worth advantage isn't worth sleepless nights.
 */
function pickBestScenario(
  viable: { key: ScenarioKey; output: ScenarioOutput }[],
  _inputs: ScenarioInputs
): { key: ScenarioKey; output: ScenarioOutput } {
  // Sort by final net worth descending
  const sorted = [...viable].sort(
    (a, b) => b.output.finalNetWorth - a.output.finalNetWorth
  )

  const best = sorted[0]
  const secondBest = sorted[1]

  if (!secondBest) return best

  // Check if net worth is close (within 5% of the larger value)
  const netWorthGap = best.output.finalNetWorth - secondBest.output.finalNetWorth
  const isClose = netWorthGap < best.output.finalNetWorth * 0.05

  if (isClose) {
    // When net worth is close, prefer the scenario with:
    // 1. Better monthly cash flow (less financial stress)
    // 2. Lower risk score (fewer/less severe warnings)
    const bestCashFlow = best.output.yearlySnapshots[0].monthlyCashFlowBestCase
    const secondCashFlow = secondBest.output.yearlySnapshots[0].monthlyCashFlowBestCase
    const bestRisk = warningRiskScore(best.output.warnings)
    const secondRisk = warningRiskScore(secondBest.output.warnings)

    // If second-best has meaningfully better cash flow AND lower risk, prefer it
    if (secondCashFlow > bestCashFlow + 100 && secondRisk < bestRisk) {
      return secondBest
    }
  }

  return best
}
