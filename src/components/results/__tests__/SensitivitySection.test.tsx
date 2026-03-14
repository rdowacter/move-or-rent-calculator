import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SensitivitySection } from '../SensitivitySection'
import type { ModelOutput, ScenarioInputs } from '@/engine/types'
import { runModel } from '@/engine/scenarios'
import { generateVerdict } from '@/engine/verdict'
import { defaultValues } from '@/schemas/scenarioInputs'

// ---------------------------------------------------------------------------
// Mock useModelOutput — returns the value set by mockModelOutputValue
// ---------------------------------------------------------------------------
let mockModelOutputValue: { modelOutput: ModelOutput | null; isComputing: boolean } = {
  modelOutput: null,
  isComputing: false,
}

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockModelOutputValue,
}))

// ---------------------------------------------------------------------------
// Mock useWatch — returns the form values
// ---------------------------------------------------------------------------
let mockFormValues: ScenarioInputs = defaultValues

vi.mock('react-hook-form', () => ({
  useWatch: () => mockFormValues,
}))

// ---------------------------------------------------------------------------
// Mock requestAnimationFrame for synchronous test execution
// ---------------------------------------------------------------------------
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0)
  return 0
})

// ---------------------------------------------------------------------------
// Fixtures: inputs that produce a viable verdict (not 'none')
// ---------------------------------------------------------------------------

/**
 * The default inputs have $0 liquid savings, so all scenarios fail with
 * upfront capital shortfalls. These viable inputs give enough savings
 * for at least one scenario to pass dealbreaker checks.
 */
const viableInputs: ScenarioInputs = {
  ...defaultValues,
  personal: {
    ...defaultValues.personal,
    // Enough liquid savings to cover down payment + closing costs
    liquidSavings: 80_000,
    // Higher income to keep DTI under control with two mortgages
    annualGrossIncome: 120_000,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a model output where ALL scenarios have dealbreakers, so
 * the verdict is 'none'.
 */
function makeAllBrokenModel(): ModelOutput {
  const real = runModel(defaultValues)
  return {
    baseline: {
      ...real.baseline,
      upfrontCapital: { ...real.baseline.upfrontCapital, surplus: -5000, totalCashNeeded: 10000, cashAvailable: 5000 },
      yearlySnapshots: real.baseline.yearlySnapshots.map((s, i) =>
        i === 0 ? { ...s, monthlyCashFlowBestCase: -100 } : s
      ),
      monthlyReserveRunwayMonths: 1,
    },
    scenarioA: {
      ...real.scenarioA,
      upfrontCapital: { ...real.scenarioA.upfrontCapital, surplus: -20000, totalCashNeeded: 100000, cashAvailable: 80000 },
      yearlySnapshots: real.scenarioA.yearlySnapshots.map((s, i) =>
        i === 0 ? { ...s, monthlyCashFlowBestCase: -300 } : s
      ),
      monthlyReserveRunwayMonths: 0.5,
    },
    scenarioB: {
      ...real.scenarioB,
      upfrontCapital: { ...real.scenarioB.upfrontCapital, surplus: -15000, totalCashNeeded: 80000, cashAvailable: 65000 },
      yearlySnapshots: real.scenarioB.yearlySnapshots.map((s, i) =>
        i === 0 ? { ...s, monthlyCashFlowBestCase: -500 } : s
      ),
      monthlyReserveRunwayMonths: 0.2,
    },
  }
}

describe('SensitivitySection', () => {
  it('renders nothing when modelOutput is null (smoke test)', () => {
    mockModelOutputValue = { modelOutput: null, isComputing: false }
    const { container } = render(<SensitivitySection />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when verdict recommendation is none', () => {
    const allBrokenModel = makeAllBrokenModel()
    // Verify our test setup actually produces a 'none' verdict
    const verdict = generateVerdict(allBrokenModel, defaultValues)
    expect(verdict.recommendation).toBe('none')

    mockModelOutputValue = { modelOutput: allBrokenModel, isComputing: false }
    mockFormValues = defaultValues
    const { container } = render(<SensitivitySection />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the "Show Analysis" button when verdict has a recommendation', () => {
    const model = runModel(viableInputs)
    const verdict = generateVerdict(model, viableInputs)
    // Sanity check: viable inputs should produce a real recommendation
    expect(verdict.recommendation).not.toBe('none')

    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    const button = screen.getByTestId('run-sensitivity-button')
    expect(button).toBeInTheDocument()
    expect(button.textContent).toBe('Show Sensitivity Analysis')
  })

  it('renders breakeven rows after clicking "Show Analysis"', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    const button = screen.getByTestId('run-sensitivity-button')
    fireEvent.click(button)

    // After clicking, the analysis should run synchronously (mocked rAF)
    // and display breakeven rows
    await waitFor(() => {
      const rows = screen.getAllByTestId('breakeven-row')
      // analyzeSensitivity tests 5 variables
      expect(rows.length).toBe(5)
    })
  })

  it('displays the summary text after analysis runs', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    fireEvent.click(screen.getByTestId('run-sensitivity-button'))

    await waitFor(() => {
      const summary = screen.getByTestId('sensitivity-summary')
      expect(summary).toBeInTheDocument()
      expect(summary.textContent).toBeTruthy()
    })
  })

  it('renders margin indicators with correct data attributes', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    fireEvent.click(screen.getByTestId('run-sensitivity-button'))

    await waitFor(() => {
      const indicators = screen.getAllByTestId('margin-indicator')
      expect(indicators.length).toBe(5)

      // Each indicator should have a valid margin data attribute
      for (const indicator of indicators) {
        const margin = indicator.getAttribute('data-margin')
        expect(['comfortable', 'thin', 'at_risk']).toContain(margin)
      }
    })
  })

  it('shows correct labels for each margin type', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    fireEvent.click(screen.getByTestId('run-sensitivity-button'))

    await waitFor(() => {
      const indicators = screen.getAllByTestId('margin-indicator')

      for (const indicator of indicators) {
        const margin = indicator.getAttribute('data-margin')
        if (margin === 'comfortable') {
          expect(indicator.textContent).toContain('Comfortable buffer')
        } else if (margin === 'thin') {
          expect(indicator.textContent).toContain('Thin margin')
        } else if (margin === 'at_risk') {
          expect(indicator.textContent).toContain('At risk')
        }
      }
    })
  })

  it('has proper ARIA region label for accessibility', () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    const region = screen.getByRole('region', { name: 'Sensitivity analysis' })
    expect(region).toBeInTheDocument()
  })

  it('shows a re-run button after analysis completes', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    fireEvent.click(screen.getByTestId('run-sensitivity-button'))

    await waitFor(() => {
      const rerunButton = screen.getByTestId('rerun-sensitivity-button')
      expect(rerunButton).toBeInTheDocument()
      expect(rerunButton.textContent).toBe('Re-run Analysis')
    })
  })

  it('renders variable names for all 5 tested variables', async () => {
    const model = runModel(viableInputs)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = viableInputs

    render(<SensitivitySection />)

    fireEvent.click(screen.getByTestId('run-sensitivity-button'))

    await waitFor(() => {
      // The 5 variables defined in sensitivity.ts
      expect(screen.getByText('Home appreciation rate')).toBeInTheDocument()
      expect(screen.getByText('Monthly rent')).toBeInTheDocument()
      expect(screen.getByText('New home interest rate')).toBeInTheDocument()
      expect(screen.getByText('Vacancy rate')).toBeInTheDocument()
      expect(screen.getByText('Income')).toBeInTheDocument()
    })
  })
})
