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
  VerdictOutput,
  ScorecardRow,
  FeasibilityBadge,
  RiskLevel,
  Warning,
} from './types'

import { DTI_HARD_MAX, MONTHS_PER_YEAR } from './constants'
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
  const endAge = inputs.personal.age + horizon

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
      label: `IRA at age ${endAge}`,
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

// ---------------------------------------------------------------------------
// Scorecard Verdict Engine
//
// An alternative verdict API that produces a structured scorecard with
// feasibility badges, risk levels, and a compact verdict sentence.
// Designed for rendering summary cards in the UI.
// ---------------------------------------------------------------------------

// ---- Scorecard Constants --------------------------------------------------

/**
 * Minimum monthly cash flow (best-case) for a scenario to be considered
 * "ready" (green). Below $500/mo, the user has very little room for
 * unexpected expenses even in the best case.
 */
export const READY_CASH_FLOW_THRESHOLD = 500

/**
 * Minimum months of post-closing reserves for a scenario to be "ready".
 * 3 months is the bare minimum emergency fund per financial planning standards.
 */
export const READY_RESERVE_MONTHS = 3

/**
 * Net worth gap required to declare a clear winner.
 * If the gap between the top two scenarios is less than 3%, the difference
 * is not meaningful enough to make a confident recommendation — small
 * assumption changes could flip the result.
 */
export const WINNER_THRESHOLD = 0.03

// ---------------------------------------------------------------------------
// assessFeasibility
// ---------------------------------------------------------------------------

/**
 * Evaluates a scenario's feasibility and returns a traffic-light badge.
 *
 * - Baseline (totalCashNeeded === 0): always "ready" with infinite reserves,
 *   because staying put requires no upfront capital event.
 * - Red "Not Feasible": surplus < 0 (can't close) OR worst-case monthly
 *   cash flow < $0 (losing money from day one).
 * - Green "Ready": surplus >= 0, reserves >= 3 months, AND best-case
 *   monthly cash flow >= $500/mo.
 * - Amber "Tight": can close (surplus >= 0) but either reserves < 3 months
 *   OR best-case cash flow is between $0 and $499/mo.
 *
 * @param scenario - The scenario output to assess
 * @param inputs - The user's scenario inputs (needed for expense calculation)
 */
export function assessFeasibility(
  scenario: ScenarioOutput,
  inputs: ScenarioInputs
): FeasibilityBadge {
  // Baseline: no capital event, user stays put
  if (scenario.upfrontCapital.totalCashNeeded === 0) {
    return {
      status: 'ready',
      label: 'N/A',
      reserveMonths: Infinity,
    }
  }

  const year1 = scenario.yearlySnapshots[0]
  const surplus = scenario.upfrontCapital.surplus

  // Calculate total monthly obligations from year 1 data.
  // We derive this from income minus cash flow: if the user earns X/mo
  // and has Y/mo cash flow, then obligations = X/mo - Y/mo.
  // But for reserve calculation, we need the raw expense figure.
  // Compute from inputs + scenario data.
  const totalMonthlyObligations = computeTotalMonthlyObligations(scenario, inputs)

  // Post-closing reserves = whatever cash remains after closing
  const postClosingReserves = Math.max(0, surplus)

  // Reserve months = how long reserves last against monthly obligations
  const reserveMonths = totalMonthlyObligations > 0
    ? postClosingReserves / totalMonthlyObligations
    : postClosingReserves > 0 ? Infinity : 0

  // Red: can't afford to close, OR losing money every month in worst case
  if (surplus < 0 || year1.monthlyCashFlowWorstCase < 0) {
    const reason = surplus < 0
      ? `${formatCurrency(Math.abs(surplus))} shortfall`
      : 'Negative cash flow'
    return {
      status: 'not_feasible',
      label: `Not Feasible — ${reason}`,
      reserveMonths,
    }
  }

  // Green: can close, has adequate reserves, and comfortable cash flow
  if (reserveMonths >= READY_RESERVE_MONTHS && year1.monthlyCashFlowBestCase >= READY_CASH_FLOW_THRESHOLD) {
    return {
      status: 'ready',
      label: 'Ready',
      reserveMonths,
    }
  }

  // Amber: can close but thin reserves or tight cash flow
  const tightReason = reserveMonths < READY_RESERVE_MONTHS
    ? `${reserveMonths.toFixed(1)} months reserves`
    : `${formatCurrency(year1.monthlyCashFlowBestCase)}/mo cash flow`
  return {
    status: 'tight',
    label: `Tight — ${tightReason}`,
    reserveMonths,
  }
}

/**
 * Compute total monthly obligations from scenario output and inputs.
 *
 * This includes primary mortgage P&I, primary property tax, primary insurance,
 * primary PMI, primary HOA, living expenses, debt payments, and (for Scenario B)
 * rental property expenses: rental mortgage, rental property tax, rental
 * insurance, rental maintenance, and rental HOA.
 *
 * We compute this from inputs rather than a cashFlowBreakdown field because
 * not all snapshot shapes include itemized expense breakdowns.
 */
function computeTotalMonthlyObligations(
  scenario: ScenarioOutput,
  inputs: ScenarioInputs
): number {
  // Start with living expenses and debt payments
  let obligations = inputs.personal.monthlyLivingExpenses + inputs.personal.monthlyDebtPayments

  // Primary home costs (new home for A/B, current home for baseline)
  // We can derive monthly mortgage from DTI data or compute from inputs.
  // Use the new home inputs since this is for A/B scenarios (totalCashNeeded > 0).
  const isScenarioB = scenario.upfrontCapital.iraWithdrawalNetProceeds !== null

  // New home monthly costs
  const downPaymentPercent = isScenarioB
    ? inputs.newHome.downPaymentPercentScenarioB
    : inputs.newHome.downPaymentPercentScenarioA
  const loanAmount = inputs.newHome.purchasePrice * (1 - downPaymentPercent)

  // Monthly P&I — use a simplified calculation
  const monthlyRate = inputs.newHome.interestRate / MONTHS_PER_YEAR
  const numPayments = inputs.newHome.loanTermYears * MONTHS_PER_YEAR
  let monthlyPI: number
  if (monthlyRate === 0) {
    monthlyPI = loanAmount / numPayments
  } else {
    monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))
      / (Math.pow(1 + monthlyRate, numPayments) - 1)
  }

  obligations += monthlyPI
  obligations += (inputs.newHome.annualPropertyTaxRate * inputs.newHome.purchasePrice) / MONTHS_PER_YEAR
  obligations += inputs.newHome.annualInsurance / MONTHS_PER_YEAR

  // PMI if applicable (LTV > 80%)
  if (downPaymentPercent < 0.2) {
    obligations += (inputs.newHome.annualPMIRate * loanAmount) / MONTHS_PER_YEAR
  }

  // Rental property costs (Scenario B only)
  if (isScenarioB) {
    // Rental mortgage P&I
    const rentalMonthlyRate = inputs.currentHome.interestRate / MONTHS_PER_YEAR
    const rentalNumPayments = inputs.currentHome.originalLoanTermYears * MONTHS_PER_YEAR
    let rentalMonthlyPI: number
    if (rentalMonthlyRate === 0) {
      rentalMonthlyPI = inputs.currentHome.mortgageBalance / rentalNumPayments
    } else {
      // Use remaining balance and remaining term
      const remainingPayments = rentalNumPayments - (inputs.currentHome.yearsIntoLoan * MONTHS_PER_YEAR)
      if (remainingPayments <= 0) {
        rentalMonthlyPI = 0
      } else {
        rentalMonthlyPI = inputs.currentHome.mortgageBalance
          * (rentalMonthlyRate * Math.pow(1 + rentalMonthlyRate, remainingPayments))
          / (Math.pow(1 + rentalMonthlyRate, remainingPayments) - 1)
      }
    }

    obligations += rentalMonthlyPI
    obligations += (inputs.currentHome.annualPropertyTaxRate * inputs.currentHome.homeValue) / MONTHS_PER_YEAR
    // Landlord insurance = base insurance + premium increase
    const landlordInsurance = inputs.currentHome.annualInsurance * (1 + inputs.currentHome.landlordInsurancePremiumIncrease)
    obligations += landlordInsurance / MONTHS_PER_YEAR
    obligations += (inputs.currentHome.maintenanceReserveRate * inputs.currentHome.homeValue) / MONTHS_PER_YEAR
    obligations += inputs.currentHome.monthlyHOA
  }

  return obligations
}

// ---------------------------------------------------------------------------
// assessRisk
// ---------------------------------------------------------------------------

/**
 * Derives a risk level from a scenario's warnings.
 *
 * - High: 2 or more critical-severity warnings
 * - Medium: 1 critical OR 2+ warning-severity warnings
 * - Low: everything else (only info-level or few warnings)
 *
 * @param scenario - The scenario output whose warnings to evaluate
 */
export function assessRisk(scenario: ScenarioOutput): RiskLevel {
  const criticalCount = scenario.warnings.filter(w => w.severity === 'critical').length
  const warningCount = scenario.warnings.filter(w => w.severity === 'warning').length

  if (criticalCount >= 2) return 'high'
  if (criticalCount >= 1 || warningCount >= 2) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// generateScorecardVerdict
// ---------------------------------------------------------------------------

/**
 * Generates a structured scorecard verdict by evaluating all three scenarios.
 * Produces a 3-row scorecard with feasibility badges, risk levels, and a
 * compact verdict sentence suitable for a summary card UI.
 *
 * The winner is the scenario with the highest finalNetWorth, but only
 * starred if the gap exceeds WINNER_THRESHOLD (3%). When the gap is smaller,
 * the difference is not meaningful enough to declare a confident winner.
 *
 * @param model - Complete model output from runModel()
 * @param inputs - The user's scenario inputs
 */
export function generateScorecardVerdict(
  model: ModelOutput,
  inputs: ScenarioInputs
): VerdictOutput {
  const scenarios: { key: ScenarioKey; output: ScenarioOutput }[] = [
    { key: 'baseline', output: model.baseline },
    { key: 'scenarioA', output: model.scenarioA },
    { key: 'scenarioB', output: model.scenarioB },
  ]

  // Build scorecard rows
  const rows = scenarios.map(s => {
    const feasibility = assessFeasibility(s.output, inputs)
    const year1 = s.output.yearlySnapshots[0]

    return {
      scenarioName: SCENARIO_DISPLAY_NAMES[s.key],
      feasibility,
      monthlyCashFlow: year1.monthlyCashFlowWorstCase,
      monthlyCashFlowBest: year1.monthlyCashFlowBestCase,
      finalNetWorth: s.output.finalNetWorth,
      isWinner: false, // Set below
      riskLevel: assessRisk(s.output),
      finalIRABalance: s.output.totalIRAValue,
    } satisfies ScorecardRow
  }) as [ScorecardRow, ScorecardRow, ScorecardRow]

  // Determine winner: highest finalNetWorth, starred only if gap > 3%
  const sortedByNetWorth = [...rows].sort((a, b) => b.finalNetWorth - a.finalNetWorth)
  const best = sortedByNetWorth[0]
  const secondBest = sortedByNetWorth[1]

  const gap = secondBest.finalNetWorth > 0
    ? (best.finalNetWorth - secondBest.finalNetWorth) / secondBest.finalNetWorth
    : best.finalNetWorth > 0 ? 1 : 0

  if (gap > WINNER_THRESHOLD) {
    // Mark the winner in the original rows array
    const winnerIdx = rows.findIndex(r => r.scenarioName === best.scenarioName)
    if (winnerIdx >= 0) {
      rows[winnerIdx].isWinner = true
    }
  }

  // Build verdict text
  const verdictText = buildVerdictText(rows, inputs)

  // Build guardrail callout
  const guardrailCallout = buildGuardrailCallout(rows, model, inputs)

  return {
    verdictText,
    scorecard: rows,
    guardrailCallout,
  }
}

/**
 * Builds a 1-2 sentence verdict text from the scorecard rows.
 * Uses deterministic string templates — no LLM-style generation.
 */
function buildVerdictText(
  rows: [ScorecardRow, ScorecardRow, ScorecardRow],
  inputs: ScenarioInputs
): string {
  const horizon = inputs.projection.timeHorizonYears
  const winner = rows.find(r => r.isWinner)
  const feasibleRows = rows.filter(r => r.feasibility.status !== 'not_feasible')
  const allInfeasible = feasibleRows.length === 0

  if (allInfeasible) {
    const bestNetWorth = Math.max(...rows.map(r => r.finalNetWorth))
    return `None of the three scenarios are financially feasible with your current inputs. The strongest scenario produces ${formatCurrency(bestNetWorth)} in net worth over ${horizon} years, but upfront capital or monthly cash flow falls short.`
  }

  if (!winner) {
    // No clear winner (gap < 3%)
    const top = [...rows].sort((a, b) => b.finalNetWorth - a.finalNetWorth)[0]
    const second = [...rows].sort((a, b) => b.finalNetWorth - a.finalNetWorth)[1]
    return `${top.scenarioName} and ${second.scenarioName} produce similar net worth over ${horizon} years (${formatCurrency(top.finalNetWorth)} vs ${formatCurrency(second.finalNetWorth)}). The difference is too small to declare a clear winner — consider cash flow and risk tolerance.`
  }

  // Clear winner
  const runnerUp = [...rows]
    .filter(r => !r.isWinner)
    .sort((a, b) => b.finalNetWorth - a.finalNetWorth)[0]
  const advantage = winner.finalNetWorth - runnerUp.finalNetWorth

  return `${winner.scenarioName} builds ${formatCurrency(advantage)} more in net worth over ${horizon} years (${formatCurrency(winner.finalNetWorth)} total). Monthly cash flow is ${formatCurrency(winner.monthlyCashFlowBest)}/mo in the best case.`
}

/**
 * Builds a guardrail callout when the data is decisive enough to
 * warrant a prominent warning. Returns null if no guardrail applies.
 *
 * Guardrail conditions (checked in priority order):
 * 1. Both Scenario A and B are infeasible
 * 2. Winner has zero retirement savings at end of projection
 * 3. All scenarios produce less net worth than the starting position
 */
function buildGuardrailCallout(
  rows: [ScorecardRow, ScorecardRow, ScorecardRow],
  _model: ModelOutput,
  inputs: ScenarioInputs
): string | null {
  const [_baseline, scenarioA, scenarioB] = rows
  const horizon = inputs.projection.timeHorizonYears
  const endAge = inputs.personal.age + horizon

  // Guardrail 1: Both moving scenarios infeasible
  if (scenarioA.feasibility.status === 'not_feasible' && scenarioB.feasibility.status === 'not_feasible') {
    return 'Neither moving scenario is financially feasible right now. Focus on building savings before revisiting.'
  }

  // Guardrail 2: Winner has zero IRA balance at projection end
  const winner = rows.find(r => r.isWinner)
  if (winner && winner.finalIRABalance === 0) {
    return `The recommended scenario leaves your IRA account at $0 by age ${endAge} based on current contribution plans. This doesn't account for future contributions you may start, employer retirement plans, or other investment accounts — but it means you'd be rebuilding retirement savings from scratch.`
  }

  // Guardrail 3: All scenarios produce less net worth than current position
  const currentNetWorth = inputs.personal.liquidSavings + inputs.retirement.iraBalance
    + (inputs.currentHome.homeValue - inputs.currentHome.mortgageBalance)
  const allDecline = rows.every(r => r.finalNetWorth < currentNetWorth)
  if (allDecline && currentNetWorth > 0) {
    return `All three scenarios project lower net worth than your current ${formatCurrency(currentNetWorth)}. Review your assumptions — appreciation rates and time horizon significantly affect the outcome.`
  }

  return null
}
