// ---------------------------------------------------------------------------
// Integration.test.tsx — Integration tests verifying that ResultsSections
// renders all six results components with real model output.
//
// Individual component tests live alongside each results component.
// This test ensures the full wiring works: model output flows through
// useModelOutput() and all six sections render.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultsSections } from '@/components/results/ResultsSections'
import { runModel } from '@/engine/scenarios'
import { defaultValues } from '@/schemas/scenarioInputs'

// Generate real model output from the engine with default inputs
const mockModelOutput = runModel(defaultValues)

// Mock useModelOutput — components import from two different paths.
// Most import from ScenarioModelProvider, but UpfrontCapital uses
// the separate @/hooks/useModelOutput module.
let mockReturnValue: { modelOutput: typeof mockModelOutput | null; isComputing?: boolean } = {
  modelOutput: mockModelOutput,
  isComputing: false,
}

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockReturnValue,
}))

vi.mock('@/hooks/useModelOutput', () => ({
  useModelOutput: () => mockReturnValue,
}))

// Mock useWatch for VerdictSection — it needs form values to call generateVerdict
vi.mock('react-hook-form', () => ({
  useWatch: () => defaultValues,
}))

// Mock recharts ResponsiveContainer to avoid jsdom layout issues
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactNode
    }) => <div data-testid="responsive-container">{children}</div>,
  }
})

describe('ResultsSections integration', () => {
  it('renders the results-sections wrapper', () => {
    mockReturnValue = { modelOutput: mockModelOutput, isComputing: false }
    render(<ResultsSections />)
    expect(screen.getByTestId('results-sections')).toBeInTheDocument()
  })

  it('renders all six results sections when model output is available', () => {
    mockReturnValue = { modelOutput: mockModelOutput, isComputing: false }
    render(<ResultsSections />)

    // NetWorthChart renders its own heading
    expect(screen.getByText('Net Worth Projection')).toBeInTheDocument()

    // IRATrajectoryChart renders its own heading
    expect(screen.getByText('IRA Balance Trajectory')).toBeInTheDocument()

    // WarningsList renders "Warnings & Risks" heading (when warnings exist)
    expect(screen.getByText('Warnings & Risks')).toBeInTheDocument()

    // ReserveRunway renders inside a Card with "Reserve Runway" title
    expect(screen.getByText('Reserve Runway')).toBeInTheDocument()

    // UpfrontCapital renders its section with aria-label
    expect(
      screen.getByLabelText('Upfront Capital Requirements')
    ).toBeInTheDocument()

    // MonthlyCashFlow renders scenario cards with "Baseline" label
    // (VerdictSection's key metrics table also has "Baseline" as a column header)
    expect(screen.getAllByText('Baseline').length).toBeGreaterThanOrEqual(1)
  })

  it('renders gracefully when model output is null', () => {
    mockReturnValue = { modelOutput: null, isComputing: true }
    render(<ResultsSections />)

    // The wrapper should still render
    expect(screen.getByTestId('results-sections')).toBeInTheDocument()

    // Components that return null when modelOutput is null should not
    // render their content headings
    expect(screen.queryByText('Net Worth Projection')).not.toBeInTheDocument()
    expect(screen.queryByText('Reserve Runway')).not.toBeInTheDocument()
  })
})
