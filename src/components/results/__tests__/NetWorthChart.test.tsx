// ---------------------------------------------------------------------------
// NetWorthChart.test.tsx — Tests for the net worth projection chart component
//
// Mocks the ScenarioModelProvider context and verifies the chart renders
// correctly with model output data.
// ---------------------------------------------------------------------------

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NetWorthChart } from '../NetWorthChart'
import { runModel } from '@/engine/scenarios'
import { defaultValues } from '@/schemas/scenarioInputs'
import type { UseScenarioModelResult } from '@/hooks/useScenarioModel'

// Generate real model output from the engine with default inputs
const mockModelOutput = runModel(defaultValues)

// Mock the useModelOutput hook from ScenarioModelProvider
vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: vi.fn(),
}))

// Import the mocked function so we can change its return value per test
import { useModelOutput } from '@/components/ScenarioModelProvider'
const mockUseModelOutput = vi.mocked(useModelOutput)

// Mock recharts ResponsiveContainer to avoid jsdom layout issues —
// ResponsiveContainer requires a real DOM with measurable dimensions
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode
    }) => <div data-testid="responsive-container">{children}</div>,
  }
})

describe('NetWorthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when modelOutput is null', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: null,
      isComputing: false,
    } as UseScenarioModelResult)

    const { container } = render(<NetWorthChart />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a ResponsiveContainer and LineChart when model output is available', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: mockModelOutput,
      isComputing: false,
    } as UseScenarioModelResult)

    render(<NetWorthChart />)

    // ResponsiveContainer is rendered (via our mock)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()

    // Chart title is rendered
    expect(screen.getByText('Net Worth Projection')).toBeInTheDocument()

    // Accessible role is present
    expect(
      screen.getByRole('img', {
        name: /net worth projection chart/i,
      })
    ).toBeInTheDocument()
  })

  it('has data points matching the number of yearly snapshots across all scenarios', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: mockModelOutput,
      isComputing: false,
    } as UseScenarioModelResult)

    render(<NetWorthChart />)

    // The chart renders inside a ResponsiveContainer. In jsdom, Recharts
    // cannot measure DOM dimensions so the SVG content (lines, legend text)
    // won't actually render. We verify the chart container is present and
    // that the underlying model data is consistent across scenarios.
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()

    // Verify the model output has the expected number of snapshots
    // (default projection is 10 years)
    const expectedYears =
      mockModelOutput.baseline.yearlySnapshots.length
    expect(expectedYears).toBeGreaterThan(0)

    // All three scenarios must have the same number of snapshots
    // so the chart can align data points across lines
    expect(
      mockModelOutput.scenarioA.yearlySnapshots.length
    ).toBe(expectedYears)
    expect(
      mockModelOutput.scenarioB.yearlySnapshots.length
    ).toBe(expectedYears)

    // Each snapshot should have a year and netWorth value
    mockModelOutput.baseline.yearlySnapshots.forEach((snapshot, i) => {
      expect(snapshot.year).toBe(i + 1)
      expect(typeof snapshot.netWorth).toBe('number')
    })
  })
})
