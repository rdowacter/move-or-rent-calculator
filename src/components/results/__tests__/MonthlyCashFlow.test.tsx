import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthlyCashFlow } from '../MonthlyCashFlow'
import { runModel } from '@/engine/scenarios'
import { defaultValues } from '@/schemas/scenarioInputs'
import { formatCurrency } from '@/utils/formatters'

// ---------------------------------------------------------------------------
// Mock useModelOutput so we can control what the component receives without
// needing the full FormProvider + ScenarioModelProvider tree.
// ---------------------------------------------------------------------------
const mockUseModelOutput = vi.fn()

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockUseModelOutput(),
}))

/** Pre-computed model output using real engine + default inputs. */
const modelOutput = runModel(defaultValues)

describe('MonthlyCashFlow', () => {
  it('renders 3 scenario cards', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    render(<MonthlyCashFlow />)

    // Each scenario has a card with its name
    expect(screen.getByText(modelOutput.baseline.name)).toBeInTheDocument()
    expect(screen.getByText(modelOutput.scenarioA.name)).toBeInTheDocument()
    expect(screen.getByText(modelOutput.scenarioB.name)).toBeInTheDocument()
  })

  it('each card shows net monthly cash flow', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    render(<MonthlyCashFlow />)

    const baselineSnap = modelOutput.baseline.yearlySnapshots[0]
    const scenarioASnap = modelOutput.scenarioA.yearlySnapshots[0]

    // Baseline and Scenario A show best-case monthly cash flow
    expect(
      screen.getByText(formatCurrency(baselineSnap.monthlyCashFlowBestCase))
    ).toBeInTheDocument()
    expect(
      screen.getByText(formatCurrency(scenarioASnap.monthlyCashFlowBestCase))
    ).toBeInTheDocument()
  })

  it('Scenario B shows both best-case and worst-case monthly cash flow', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    render(<MonthlyCashFlow />)

    const scenarioBSnap = modelOutput.scenarioB.yearlySnapshots[0]

    // Scenario B should display both best-case and worst-case labels + values
    expect(screen.getByText('Best case')).toBeInTheDocument()
    expect(screen.getByText('Worst case')).toBeInTheDocument()
    expect(
      screen.getByText(formatCurrency(scenarioBSnap.monthlyCashFlowBestCase))
    ).toBeInTheDocument()
    expect(
      screen.getByText(formatCurrency(scenarioBSnap.monthlyCashFlowWorstCase))
    ).toBeInTheDocument()
  })

  it('negative cash flow values have text-destructive class', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    const { container } = render(<MonthlyCashFlow />)

    // Find all elements with the text-destructive class
    const destructiveElements = container.querySelectorAll('.text-destructive')

    // Count how many scenario snapshots have negative best-case or worst-case values
    const allSnapshots = [
      modelOutput.baseline.yearlySnapshots[0],
      modelOutput.scenarioA.yearlySnapshots[0],
      modelOutput.scenarioB.yearlySnapshots[0],
    ]

    let expectedNegativeCount = 0
    for (const snap of allSnapshots) {
      if (snap.monthlyCashFlowBestCase < 0) expectedNegativeCount++
      if (snap.monthlyCashFlowWorstCase < 0) expectedNegativeCount++
    }

    // Every negative value should have destructive styling
    expect(destructiveElements.length).toBe(expectedNegativeCount)
  })

  it('handles null modelOutput gracefully', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: null, isComputing: false })
    const { container } = render(<MonthlyCashFlow />)

    // Should not render any cards when modelOutput is null
    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(0)
  })

  it('shows annual savings capacity translation on each card', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    render(<MonthlyCashFlow />)

    // Each card translates monthly cash flow to annual savings capacity
    const baselineCashFlow = modelOutput.baseline.yearlySnapshots[0].monthlyCashFlowBestCase
    const annualText = `= ${formatCurrency(baselineCashFlow * 12)}/yr savings capacity`
    expect(screen.getByText(annualText)).toBeInTheDocument()
  })

  it('shows "See breakdown" trigger on each card', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput, isComputing: false })
    render(<MonthlyCashFlow />)

    // All 3 cards should have a "See breakdown" collapsible trigger
    const triggers = screen.getAllByText('See breakdown')
    expect(triggers.length).toBe(3)
  })
})
