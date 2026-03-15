/**
 * Scenario color palette — consistent across all chart and comparison components.
 *
 * Baseline: Indigo — neutral, status quo
 * Scenario A: Emerald — positive, clean start
 * Scenario B: Amber — caution, more complex
 */
export const SCENARIO_COLORS = {
  baseline: '#6366f1',
  scenarioA: '#10b981',
  scenarioB: '#f59e0b',
} as const

export type ScenarioColorKey = keyof typeof SCENARIO_COLORS
