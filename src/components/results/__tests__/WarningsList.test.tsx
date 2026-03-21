import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WarningsList } from '../WarningsList'
import type { ModelOutput, Warning } from '@/engine/types'
import { runModel } from '@/engine/scenarios'
import { defaultValues } from '@/schemas/scenarioInputs'

// ---------------------------------------------------------------------------
// Mock useModelOutput — returns the value set by mockModelOutput
// ---------------------------------------------------------------------------
let mockModelOutputValue: { modelOutput: ModelOutput | null; isComputing: boolean } = {
  modelOutput: null,
  isComputing: false,
}

vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: () => mockModelOutputValue,
}))

// ---------------------------------------------------------------------------
// Helper: create a Warning object
// ---------------------------------------------------------------------------
function makeWarning(
  overrides: Partial<Warning> & Pick<Warning, 'severity' | 'message'>
): Warning {
  return {
    category: 'lending',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper: create a ModelOutput with custom warnings injected
// ---------------------------------------------------------------------------
function makeModelOutputWithWarnings(warnings: {
  baseline?: Warning[]
  scenarioA?: Warning[]
  scenarioB?: Warning[]
}): ModelOutput {
  // Start from real model output using default inputs
  const real = runModel(defaultValues)
  return {
    baseline: {
      ...real.baseline,
      warnings: warnings.baseline ?? [],
    },
    scenarioA: {
      ...real.scenarioA,
      warnings: warnings.scenarioA ?? [],
    },
    scenarioB: {
      ...real.scenarioB,
      warnings: warnings.scenarioB ?? [],
    },
  }
}

describe('WarningsList', () => {
  it('renders nothing when modelOutput is null', () => {
    mockModelOutputValue = { modelOutput: null, isComputing: false }
    const { container } = render(<WarningsList />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when all scenarios have empty warnings arrays', () => {
    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        baseline: [],
        scenarioA: [],
        scenarioB: [],
      }),
      isComputing: false,
    }
    const { container } = render(<WarningsList />)
    expect(container.innerHTML).toBe('')
  })

  it('renders warnings sorted by severity (critical first, then warning, then info)', () => {
    const infoWarning = makeWarning({
      severity: 'info',
      message: 'Info level message',
      category: 'market',
    })
    const warningWarning = makeWarning({
      severity: 'warning',
      message: 'Warning level message',
      category: 'tax',
    })
    const criticalWarning = makeWarning({
      severity: 'critical',
      message: 'Critical level message',
      category: 'lending',
    })

    // Put all three in the same scenario so severity sort is testable
    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        baseline: [],
        scenarioA: [],
        scenarioB: [infoWarning, warningWarning, criticalWarning],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(3)

    // Within the Scenario B group, warnings should be sorted by severity
    const allAlertTexts = alerts.map((a) => a.textContent ?? '')
    const criticalIdx = allAlertTexts.findIndex((t) => t.includes('Critical level message'))
    const warningIdx = allAlertTexts.findIndex((t) => t.includes('Warning level message'))
    const infoIdx = allAlertTexts.findIndex((t) => t.includes('Info level message'))

    expect(criticalIdx).not.toBe(-1)
    expect(warningIdx).not.toBe(-1)
    expect(infoIdx).not.toBe(-1)
    expect(criticalIdx).toBeLessThan(warningIdx)
    expect(warningIdx).toBeLessThan(infoIdx)
  })

  it('displays dollar impact when present on a warning', () => {
    const warningWithDollar = makeWarning({
      severity: 'warning',
      message: 'You will pay extra taxes',
      category: 'tax',
      dollarImpact: 9600,
    })

    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        scenarioB: [warningWithDollar],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    // formatCurrency(9600) → "$9,600"
    expect(screen.getByText(/\$9,600/)).toBeInTheDocument()
  })

  it('does not show dollar impact text when dollarImpact is absent', () => {
    const warningNoDollar = makeWarning({
      severity: 'warning',
      message: 'General caution about lending',
      category: 'lending',
    })

    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        baseline: [warningNoDollar],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    expect(screen.getByText(/General caution about lending/)).toBeInTheDocument()
    // No dollar amount should appear for this warning
    expect(screen.queryByText(/Impact:/)).not.toBeInTheDocument()
  })

  it('uses destructive variant for critical warnings', () => {
    const critical = makeWarning({
      severity: 'critical',
      message: 'DTI exceeds maximum',
      category: 'lending',
    })

    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        scenarioB: [critical],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    const alerts = screen.getAllByRole('alert')
    const criticalAlert = alerts.find((a) =>
      a.textContent?.includes('DTI exceeds maximum')
    )
    expect(criticalAlert).toBeDefined()
    // shadcn destructive variant applies the text-destructive class
    expect(criticalAlert!.className).toMatch(/destructive/)
  })

  it('uses muted styling for info warnings', () => {
    const info = makeWarning({
      severity: 'info',
      message: 'Commute savings are an estimate',
      category: 'market',
    })

    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        baseline: [info],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    const alerts = screen.getAllByRole('alert')
    const infoAlert = alerts.find((a) =>
      a.textContent?.includes('Commute savings are an estimate')
    )
    expect(infoAlert).toBeDefined()
    // Info variant should have muted/border-muted styling
    expect(infoAlert!.className).toMatch(/muted|border-muted/)
  })

  it('tags each warning with its scenario name', () => {
    const baselineWarning = makeWarning({
      severity: 'info',
      message: 'Baseline specific note',
      category: 'market',
    })
    const scenarioBWarning = makeWarning({
      severity: 'warning',
      message: 'Scenario B specific note',
      category: 'landlord',
    })

    mockModelOutputValue = {
      modelOutput: makeModelOutputWithWarnings({
        baseline: [baselineWarning],
        scenarioB: [scenarioBWarning],
      }),
      isComputing: false,
    }

    render(<WarningsList />)

    // The scenario name should appear as a heading — sourced from the model output
    // rather than hardcoded, so tests stay valid if home names change.
    const modelOutput = mockModelOutputValue.modelOutput!
    expect(screen.getByText(modelOutput.baseline.name)).toBeInTheDocument()
    expect(screen.getByText(modelOutput.scenarioB.name)).toBeInTheDocument()
  })

  it('renders warnings from real model output with default values', () => {
    // Run the actual model with default inputs to verify integration
    const realOutput = runModel(defaultValues)
    mockModelOutputValue = { modelOutput: realOutput, isComputing: false }

    const allWarnings = [
      ...realOutput.baseline.warnings,
      ...realOutput.scenarioA.warnings,
      ...realOutput.scenarioB.warnings,
    ]

    const { container } = render(<WarningsList />)

    if (allWarnings.length === 0) {
      // If the default inputs produce no warnings, the component renders nothing
      expect(container.innerHTML).toBe('')
    } else {
      // If there are warnings, we should see alert elements
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBe(allWarnings.length)
    }
  })
})
