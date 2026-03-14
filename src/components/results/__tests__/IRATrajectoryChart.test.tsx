import { cloneElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ModelOutput, ScenarioInputs } from '@/engine/types'
import { runModel } from '@/engine/scenarios'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '@/engine/constants'
import { formatCurrency } from '@/utils/formatters'
import { IRATrajectoryChart } from '../IRATrajectoryChart'

// ---------------------------------------------------------------------------
// Build default inputs from engine constants — mirrors how the schemas module
// assembles defaultValues, but avoids the dependency on the schemas directory
// which may not exist in every worktree branch.
// ---------------------------------------------------------------------------
const defaultInputs: ScenarioInputs = {
  personal: { ...DEFAULT_PERSONAL_INPUTS },
  retirement: { ...DEFAULT_RETIREMENT_INPUTS },
  currentHome: { ...DEFAULT_CURRENT_HOME_INPUTS },
  newHome: { ...DEFAULT_NEW_HOME_INPUTS },
  commute: { ...DEFAULT_COMMUTE_INPUTS },
  costs: { ...DEFAULT_COST_INPUTS },
  projection: { ...DEFAULT_PROJECTION_INPUTS },
}

// Generate real model output so the chart receives structurally valid data
// without needing a full React context tree.
const realModelOutput = runModel(defaultInputs)

// ---------------------------------------------------------------------------
// Mock useModelOutput — the chart consumes ModelOutput from context.
// ---------------------------------------------------------------------------
const mockUseModelOutput = vi.fn()

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockUseModelOutput(),
}))

// ResponsiveContainer relies on DOM measurements which jsdom cannot provide.
// Mock it to render children with explicit width/height injected so Recharts
// LineChart actually renders the SVG elements.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement
    }) => (
      // Clone the child (LineChart) and inject width/height props
      // since jsdom can't measure container dimensions.
      <div style={{ width: 500, height: 300 }}>
        {cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 500, height: 300 })}
      </div>
    ),
  }
})

// Recharts uses ResizeObserver internally for ResponsiveContainer.
// jsdom doesn't provide it, so we stub it with a proper class.
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

beforeEach(() => {
  mockUseModelOutput.mockReturnValue({
    modelOutput: realModelOutput,
    isComputing: false,
  })
})

describe('IRATrajectoryChart', () => {
  it('renders without crashing with valid ModelOutput', () => {
    const { container } = render(<IRATrajectoryChart />)
    expect(container).toBeTruthy()
  })

  it('renders 2 lines (Scenario A and Scenario B)', () => {
    // Baseline IRA trajectory is identical to Scenario A, so we omit it
    // and render only 2 lines: Scenario A and Scenario B
    const { container } = render(<IRATrajectoryChart />)

    // Recharts renders Line components as <path> elements inside <g> with class "recharts-line"
    const lines = container.querySelectorAll('.recharts-line')
    expect(lines.length).toBe(2)
  })

  it('renders a callout showing the dollar gap at the final year', () => {
    render(<IRATrajectoryChart />)

    const finalYearIndex =
      realModelOutput.scenarioA.yearlySnapshots.length - 1
    const scenarioAFinalIRA =
      realModelOutput.scenarioA.yearlySnapshots[finalYearIndex].iraBalance
    const scenarioBFinalIRA =
      realModelOutput.scenarioB.yearlySnapshots[finalYearIndex].iraBalance
    const gap = scenarioAFinalIRA - scenarioBFinalIRA
    const finalYear =
      realModelOutput.scenarioA.yearlySnapshots[finalYearIndex].year

    // The callout text should show the formatted gap and final year
    const calloutText = screen.getByText(
      (content) =>
        content.includes(formatCurrency(Math.abs(gap))) &&
        content.includes(String(finalYear))
    )
    expect(calloutText).toBeInTheDocument()
  })

  it('handles edge case where Scenario B IRA is $0 for many years', () => {
    // Create a modified output where Scenario B IRA balance is $0 for all years
    const modifiedOutput: ModelOutput = {
      ...realModelOutput,
      scenarioB: {
        ...realModelOutput.scenarioB,
        yearlySnapshots: realModelOutput.scenarioB.yearlySnapshots.map(
          (snapshot) => ({
            ...snapshot,
            iraBalance: 0,
          })
        ),
      },
    }

    mockUseModelOutput.mockReturnValue({
      modelOutput: modifiedOutput,
      isComputing: false,
    })

    const { container } = render(<IRATrajectoryChart />)

    // Should still render without crashing
    expect(container).toBeTruthy()

    // Should still show 2 lines even if one is flat at $0
    const lines = container.querySelectorAll('.recharts-line')
    expect(lines.length).toBe(2)

    // The gap callout should reflect the full Scenario A IRA value
    const finalYearIndex =
      modifiedOutput.scenarioA.yearlySnapshots.length - 1
    const scenarioAFinalIRA =
      modifiedOutput.scenarioA.yearlySnapshots[finalYearIndex].iraBalance
    const finalYear =
      modifiedOutput.scenarioA.yearlySnapshots[finalYearIndex].year

    const calloutText = screen.getByText(
      (content) =>
        content.includes(formatCurrency(Math.abs(scenarioAFinalIRA))) &&
        content.includes(String(finalYear))
    )
    expect(calloutText).toBeInTheDocument()
  })

  it('handles null modelOutput gracefully', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: null,
      isComputing: false,
    })

    const { container } = render(<IRATrajectoryChart />)
    expect(container).toBeTruthy()

    // Should not render any chart lines when modelOutput is null
    const lines = container.querySelectorAll('.recharts-line')
    expect(lines.length).toBe(0)
  })
})
