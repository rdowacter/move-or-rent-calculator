// ---------------------------------------------------------------------------
// sensitivity.ts — Breakeven Sensitivity Analysis Engine
//
// Answers the question: "What would have to go wrong for this recommendation
// to be wrong?" For each of 5 key input variables, this module searches for
// the value at which the verdict recommendation would flip — the breakeven.
//
// The approach: binary search within a bounded range for each variable,
// checking whether modifying that single variable causes generateVerdict()
// to return a different recommendation.
//
// All functions are pure — zero React, zero DOM, zero side effects.
// ---------------------------------------------------------------------------

import type {
  ScenarioInputs,
  VerdictResult,
  BreakevenResult,
  SensitivityResult,
} from './types'

import { runModel } from './scenarios'
import { generateVerdict } from './verdict'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum iterations for binary search per variable.
 * At 20 iterations, binary search achieves precision of ~1/2^20 of the range
 * (< 0.001% of the search range). This is more than sufficient for financial
 * sensitivity analysis, and 5 variables × 20 iterations = 100 model runs max.
 */
const MAX_BINARY_SEARCH_ITERATIONS = 20

/**
 * Minimum absolute difference between search bounds before we consider
 * the binary search converged. For rates (percentages), 0.001 = 0.1%.
 * For dollar amounts, we use a separate convergence check scaled to the variable.
 */
const RATE_CONVERGENCE_EPSILON = 0.001

/**
 * For dollar-denominated variables (rent, income), convergence threshold
 * as a fraction of the search range. When the remaining search interval
 * is less than 0.5% of the original range, we've converged.
 */
const DOLLAR_CONVERGENCE_FRACTION = 0.005

// ---------------------------------------------------------------------------
// Variable Definitions
// ---------------------------------------------------------------------------

/**
 * Configuration for each variable the sensitivity analysis tests.
 * Each entry defines:
 *   - What to display to the user
 *   - How to modify the inputs to test a different value
 *   - The search direction and bounds
 *   - How to classify the margin
 */
interface VariableConfig {
  /** Human-readable name shown to the user. */
  name: string
  /** Direction to search: 'below' means searching for values lower than current. */
  direction: 'below' | 'above'
  /** Extract the current value from inputs. */
  getCurrentValue: (inputs: ScenarioInputs) => number
  /** Return the search boundary (the most extreme value to test). */
  getBoundary: (inputs: ScenarioInputs) => number
  /** Clone inputs with the variable overridden to a new value. */
  applyOverride: (inputs: ScenarioInputs, value: number) => ScenarioInputs
  /**
   * Whether this variable uses absolute difference (rates) or
   * percentage difference (dollar amounts) for margin classification.
   */
  marginType: 'absolute' | 'percentage'
}

/**
 * The 5 key variables to test, chosen because they are the primary drivers
 * of which scenario wins:
 *
 * 1. Home appreciation rate — drives net worth divergence between scenarios
 * 2. Monthly rent — drives Scenario B cash flow viability
 * 3. New home interest rate — drives affordability of the new mortgage
 * 4. Vacancy rate — drives Scenario B worst-case cash flow
 * 5. Income — drives affordability across all scenarios
 */
const SENSITIVITY_VARIABLES: VariableConfig[] = [
  {
    name: 'Home appreciation rate',
    direction: 'below',
    getCurrentValue: (inputs) => inputs.currentHome.annualAppreciationRate,
    // Search down to -5% appreciation (significant decline)
    getBoundary: () => -0.05,
    applyOverride: (inputs, value) => ({
      ...inputs,
      currentHome: { ...inputs.currentHome, annualAppreciationRate: value },
      // Both homes' appreciation rates move together — they're in the same market
      newHome: { ...inputs.newHome, annualAppreciationRate: value },
    }),
    marginType: 'absolute',
  },
  {
    name: 'Monthly rent',
    direction: 'below',
    getCurrentValue: (inputs) => inputs.currentHome.expectedMonthlyRent,
    // Search down to $0 rent (complete loss of rental income)
    getBoundary: () => 0,
    applyOverride: (inputs, value) => ({
      ...inputs,
      currentHome: { ...inputs.currentHome, expectedMonthlyRent: value },
    }),
    marginType: 'percentage',
  },
  {
    name: 'New home interest rate',
    direction: 'above',
    getCurrentValue: (inputs) => inputs.newHome.interestRate,
    // Search up to 15% (extreme but not unprecedented in US history)
    getBoundary: () => 0.15,
    applyOverride: (inputs, value) => ({
      ...inputs,
      newHome: { ...inputs.newHome, interestRate: value },
    }),
    marginType: 'absolute',
  },
  {
    name: 'Vacancy rate',
    direction: 'above',
    getCurrentValue: (inputs) => inputs.currentHome.vacancyRate,
    // Search up to 50% vacancy (6 months empty per year — extreme)
    getBoundary: () => 0.50,
    applyOverride: (inputs, value) => ({
      ...inputs,
      currentHome: { ...inputs.currentHome, vacancyRate: value },
    }),
    marginType: 'absolute',
  },
  {
    name: 'Income',
    direction: 'below',
    getCurrentValue: (inputs) => inputs.personal.annualGrossIncome,
    // Search down to $0 income (complete job loss)
    getBoundary: () => 0,
    applyOverride: (inputs, value) => ({
      ...inputs,
      personal: { ...inputs.personal, annualGrossIncome: value },
    }),
    marginType: 'percentage',
  },
]

// ---------------------------------------------------------------------------
// Margin Classification
// ---------------------------------------------------------------------------

/**
 * Classifies how much buffer exists between the current value and the
 * breakeven value. This tells the user whether the assumption has room
 * to be wrong or is dangerously close to flipping the recommendation.
 *
 * For rates (appreciation, vacancy, interest):
 *   - Uses absolute difference as the buffer metric
 *   - Thresholds: >2% absolute → comfortable, 1-2% → thin, <1% → at_risk
 *   - Rationale: A 1% swing in appreciation or interest rates is very
 *     plausible in a single year. 2%+ requires a significant market shift.
 *
 * For dollar amounts (rent, income):
 *   - Uses percentage difference relative to the current value
 *   - Thresholds: >30% drop needed → comfortable, 15-30% → thin, <15% → at_risk
 *   - Rationale: A 15% income drop (e.g., job change, hours cut) is common.
 *     A 30%+ drop requires a major life event. For rent, 15% below market
 *     is a pessimistic but realistic scenario.
 */
function classifyMargin(
  currentValue: number,
  breakevenValue: number,
  marginType: 'absolute' | 'percentage',
  breakevenFound: boolean
): BreakevenResult['margin'] {
  // If no breakeven was found within the search range, the recommendation
  // is robust to this variable — comfortable margin.
  if (!breakevenFound) {
    return 'comfortable'
  }

  if (marginType === 'absolute') {
    // For rates: use absolute distance
    const absoluteBuffer = Math.abs(currentValue - breakevenValue)

    // Absolute thresholds for rate variables:
    // >2 percentage points of buffer → comfortable
    // 1-2 percentage points → thin
    // <1 percentage point → at_risk
    if (absoluteBuffer > 0.02) return 'comfortable'
    if (absoluteBuffer > 0.01) return 'thin'
    return 'at_risk'
  } else {
    // For dollar amounts: use percentage distance from current value
    if (currentValue === 0) {
      // Edge case: if current value is 0, any breakeven is infinitely far
      return 'comfortable'
    }

    const percentBuffer = Math.abs(currentValue - breakevenValue) / Math.abs(currentValue)

    // Percentage thresholds for dollar variables:
    // >30% buffer → comfortable (would need a 30%+ drop/rise to flip)
    // 15-30% → thin (plausible market conditions could flip it)
    // <15% → at_risk (a bad quarter could flip the recommendation)
    if (percentBuffer > 0.30) return 'comfortable'
    if (percentBuffer > 0.15) return 'thin'
    return 'at_risk'
  }
}

// ---------------------------------------------------------------------------
// Binary Search for Breakeven
// ---------------------------------------------------------------------------

/**
 * Uses binary search to find the value of a single variable at which the
 * verdict recommendation changes.
 *
 * The search runs between the current value and a boundary value (e.g.,
 * current appreciation 3% searching down to -5%). At each midpoint, we
 * run the full model and check if the recommendation has changed.
 *
 * Returns the breakeven value if found, or null if the recommendation
 * holds across the entire search range.
 */
function findBreakeven(
  inputs: ScenarioInputs,
  originalRecommendation: VerdictResult['recommendation'],
  config: VariableConfig
): { breakevenValue: number; newRecommendation: string } | null {
  const currentValue = config.getCurrentValue(inputs)
  const boundary = config.getBoundary(inputs)

  // First, check if the recommendation changes at all at the boundary.
  // If it doesn't, no breakeven exists within the search range.
  const boundaryInputs = config.applyOverride(inputs, boundary)
  const boundaryModel = runModel(boundaryInputs)
  const boundaryVerdict = generateVerdict(boundaryModel, boundaryInputs)

  if (boundaryVerdict.recommendation === originalRecommendation) {
    // Recommendation holds even at the extreme boundary — no breakeven
    return null
  }

  // Binary search between currentValue and boundary
  let lo: number
  let hi: number

  if (config.direction === 'below') {
    // Searching downward: lo = boundary (lower), hi = currentValue (higher)
    lo = boundary
    hi = currentValue
  } else {
    // Searching upward: lo = currentValue (lower), hi = boundary (higher)
    lo = currentValue
    hi = boundary
  }

  let lastFlippedValue = boundary
  let lastNewRecommendation = boundaryVerdict.recommendation

  // Determine convergence epsilon based on variable type
  const range = Math.abs(hi - lo)
  const epsilon = config.marginType === 'absolute'
    ? RATE_CONVERGENCE_EPSILON
    : range * DOLLAR_CONVERGENCE_FRACTION

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
    if (Math.abs(hi - lo) < epsilon) break

    const mid = (lo + hi) / 2
    const midInputs = config.applyOverride(inputs, mid)
    const midModel = runModel(midInputs)
    const midVerdict = generateVerdict(midModel, midInputs)

    if (midVerdict.recommendation !== originalRecommendation) {
      // Recommendation flipped at this midpoint — the breakeven is between
      // currentValue and mid. Narrow the search toward currentValue.
      lastFlippedValue = mid
      lastNewRecommendation = midVerdict.recommendation

      if (config.direction === 'below') {
        // Searching downward: the flip happened at mid (which is lower).
        // The breakeven is between mid and hi. Move lo up.
        lo = mid
      } else {
        // Searching upward: the flip happened at mid (which is higher).
        // The breakeven is between lo and mid. Move hi down.
        hi = mid
      }
    } else {
      // Recommendation still holds at mid — the breakeven is between
      // mid and the boundary. Narrow toward the boundary.
      if (config.direction === 'below') {
        // Still holds at mid (higher value). Breakeven is below mid.
        hi = mid
      } else {
        // Still holds at mid (lower value). Breakeven is above mid.
        lo = mid
      }
    }
  }

  return {
    breakevenValue: lastFlippedValue,
    newRecommendation: getRecommendationDisplayName(lastNewRecommendation),
  }
}

// ---------------------------------------------------------------------------
// Display Name Helpers
// ---------------------------------------------------------------------------

const RECOMMENDATION_DISPLAY_NAMES: Record<string, string> = {
  baseline: 'Baseline (stay put)',
  scenarioA: 'Scenario A',
  scenarioB: 'Scenario B',
  none: 'no viable scenario',
}

function getRecommendationDisplayName(recommendation: string): string {
  return RECOMMENDATION_DISPLAY_NAMES[recommendation] ?? recommendation
}

// ---------------------------------------------------------------------------
// Main Analysis Functions
// ---------------------------------------------------------------------------

/**
 * Analyzes the breakeven thresholds for 5 key input variables — the values
 * at which the verdict recommendation would flip.
 *
 * For each variable, the function:
 *   1. Clones inputs with the variable overridden to a test value
 *   2. Runs runModel() → generateVerdict() with modified inputs
 *   3. Binary searches to find where the recommendation changes
 *   4. Classifies the margin (comfortable / thin / at_risk)
 *
 * @param inputs - The user's current scenario inputs
 * @param verdict - The current verdict result (from generateVerdict)
 * @returns Array of BreakevenResult, one per tested variable.
 *          Empty array if verdict recommendation is 'none' (nothing to break).
 */
export function analyzeBreakevens(
  inputs: ScenarioInputs,
  verdict: VerdictResult
): BreakevenResult[] {
  // If the verdict is 'none', there's no recommendation to test —
  // all scenarios already failed, so there's nothing to "break."
  if (verdict.recommendation === 'none') {
    return []
  }

  const results: BreakevenResult[] = []

  for (const config of SENSITIVITY_VARIABLES) {
    const currentValue = config.getCurrentValue(inputs)
    const breakeven = findBreakeven(inputs, verdict.recommendation, config)

    if (breakeven === null) {
      // No breakeven found — recommendation holds across all tested values.
      // This is a strong confidence signal.
      results.push({
        inputName: config.name,
        currentValue,
        breakevenValue: config.getBoundary(inputs),
        direction: config.direction,
        consequence: `Recommendation holds across all tested values of ${config.name.toLowerCase()}`,
        margin: 'comfortable',
      })
    } else {
      // Breakeven found — report the threshold and classify the margin.
      const breakevenFound = true
      results.push({
        inputName: config.name,
        currentValue,
        breakevenValue: breakeven.breakevenValue,
        direction: config.direction,
        consequence: `${breakeven.newRecommendation} becomes the recommendation`,
        margin: classifyMargin(currentValue, breakeven.breakevenValue, config.marginType, breakevenFound),
      })
    }
  }

  return results
}

/**
 * Full sensitivity analysis — wraps analyzeBreakevens with a human-readable summary.
 *
 * @param inputs - The user's current scenario inputs
 * @param verdict - The current verdict result
 * @returns SensitivityResult with breakevens array and summary string
 */
export function analyzeSensitivity(
  inputs: ScenarioInputs,
  verdict: VerdictResult
): SensitivityResult {
  const breakevens = analyzeBreakevens(inputs, verdict)

  if (verdict.recommendation === 'none') {
    return {
      breakevens,
      summary: 'No recommendation to analyze — all scenarios have dealbreakers.',
    }
  }

  const atRiskCount = breakevens.filter(b => b.margin === 'at_risk').length
  const thinCount = breakevens.filter(b => b.margin === 'thin').length
  const comfortableCount = breakevens.filter(b => b.margin === 'comfortable').length

  if (atRiskCount > 0) {
    return {
      breakevens,
      summary: `Your recommendation is sensitive to ${atRiskCount} variable${atRiskCount > 1 ? 's' : ''} — small changes could flip the outcome.`,
    }
  }

  if (thinCount > 0) {
    return {
      breakevens,
      summary: `Your recommendation holds but has thin margins on ${thinCount} variable${thinCount > 1 ? 's' : ''}.`,
    }
  }

  return {
    breakevens,
    summary: `Your recommendation holds under all ${comfortableCount} tested conditions with comfortable margins.`,
  }
}
