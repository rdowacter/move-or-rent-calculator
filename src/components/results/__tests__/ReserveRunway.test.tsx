import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReserveRunway } from '../ReserveRunway'
import type { ModelOutput } from '@/engine/types'
import { runModel } from '@/engine/scenarios'
import { defaultValues } from '@/schemas/scenarioInputs'

// ---------------------------------------------------------------------------
// Mock useModelOutput — lets us inject controlled model data into the
// component without needing the full FormProvider + ScenarioModelProvider tree.
// ---------------------------------------------------------------------------
const mockUseModelOutput = vi.fn()

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockUseModelOutput(),
}))

// ---------------------------------------------------------------------------
// Generate real model output from the engine using default inputs.
// This ensures our test data is realistic and internally consistent.
// ---------------------------------------------------------------------------
const realModelOutput: ModelOutput = runModel(defaultValues)

describe('ReserveRunway', () => {
  it('renders months of reserves for each scenario', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: realModelOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    // Should show the component heading
    expect(screen.getByText('Reserve Runway')).toBeInTheDocument()

    // Should render all three scenario labels
    expect(screen.getByText('Baseline')).toBeInTheDocument()
    expect(screen.getByText('Scenario A')).toBeInTheDocument()
    expect(screen.getByText('Scenario B')).toBeInTheDocument()
  })

  it('displays critical styling for low runway (< 3 months)', () => {
    const lowRunwayOutput: ModelOutput = {
      ...realModelOutput,
      scenarioB: {
        ...realModelOutput.scenarioB,
        monthlyReserveRunwayMonths: 1.5,
      },
    }

    mockUseModelOutput.mockReturnValue({
      modelOutput: lowRunwayOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    // The critical value card should have destructive styling
    const criticalCard = screen.getByTestId('reserve-runway-scenarioB')
    expect(criticalCard).toHaveTextContent('2') // formatNumber(1.5) rounds to 2
    // Check for the critical/destructive text color class
    expect(criticalCard.querySelector('[data-severity="critical"]')).toBeInTheDocument()
  })

  it('displays warning styling for moderate runway (3-6 months)', () => {
    const moderateRunwayOutput: ModelOutput = {
      ...realModelOutput,
      scenarioA: {
        ...realModelOutput.scenarioA,
        monthlyReserveRunwayMonths: 4,
      },
    }

    mockUseModelOutput.mockReturnValue({
      modelOutput: moderateRunwayOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    const warningCard = screen.getByTestId('reserve-runway-scenarioA')
    expect(warningCard.querySelector('[data-severity="warning"]')).toBeInTheDocument()
  })

  it('displays normal styling for adequate runway (>= 6 months)', () => {
    const adequateRunwayOutput: ModelOutput = {
      ...realModelOutput,
      baseline: {
        ...realModelOutput.baseline,
        monthlyReserveRunwayMonths: 12,
      },
    }

    mockUseModelOutput.mockReturnValue({
      modelOutput: adequateRunwayOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    const normalCard = screen.getByTestId('reserve-runway-baseline')
    expect(normalCard.querySelector('[data-severity="normal"]')).toBeInTheDocument()
  })

  it('displays "Unlimited" for Infinity runway (positive cash flow)', () => {
    const infinityRunwayOutput: ModelOutput = {
      ...realModelOutput,
      baseline: {
        ...realModelOutput.baseline,
        monthlyReserveRunwayMonths: Infinity,
      },
    }

    mockUseModelOutput.mockReturnValue({
      modelOutput: infinityRunwayOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    expect(screen.getByText('Unlimited')).toBeInTheDocument()
  })

  it('handles null modelOutput gracefully', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: null,
      isComputing: true,
    })

    const { container } = render(<ReserveRunway />)

    // Should render nothing (or a minimal placeholder) when no data
    expect(container.textContent).toBe('')
  })

  it('shows descriptive labels for each reserve value', () => {
    mockUseModelOutput.mockReturnValue({
      modelOutput: realModelOutput,
      isComputing: false,
    })

    render(<ReserveRunway />)

    // Each card should indicate these are months of reserves
    const monthsLabels = screen.getAllByText(/months?/i)
    expect(monthsLabels.length).toBeGreaterThan(0)
  })
})
