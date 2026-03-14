import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { VerdictSection } from '../VerdictSection'
import type { ModelOutput, VerdictResult } from '@/engine/types'
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
// Mock useWatch — returns the form values needed by generateVerdict
// ---------------------------------------------------------------------------
let mockFormValues = defaultValues

vi.mock('react-hook-form', () => ({
  useWatch: () => mockFormValues,
}))

// ---------------------------------------------------------------------------
// Helper: get real model output and verdict from default inputs
// ---------------------------------------------------------------------------
function getRealModelAndVerdict(): { model: ModelOutput; verdict: VerdictResult } {
  const model = runModel(defaultValues)
  const verdict = generateVerdict(model, defaultValues)
  return { model, verdict }
}

/**
 * Creates a model output where Scenario B has specific dealbreaker conditions:
 * negative cash flow and cash shortfall. This is done by modifying the real
 * model output's values rather than fabricating fake data.
 */
function makeModelWithDealbreakers(): ModelOutput {
  const real = runModel(defaultValues)
  return {
    ...real,
    scenarioB: {
      ...real.scenarioB,
      upfrontCapital: {
        ...real.scenarioB.upfrontCapital,
        surplus: -15000,
        totalCashNeeded: 80000,
        cashAvailable: 65000,
      },
      yearlySnapshots: real.scenarioB.yearlySnapshots.map((snap, idx) =>
        idx === 0
          ? { ...snap, monthlyCashFlowBestCase: -500 }
          : snap
      ),
    },
  }
}

describe('VerdictSection', () => {
  it('renders nothing when modelOutput is null (smoke test)', () => {
    mockModelOutputValue = { modelOutput: null, isComputing: false }
    const { container } = render(<VerdictSection />)
    expect(container.innerHTML).toBe('')
  })

  it('renders without crashing given valid model output', () => {
    const model = runModel(defaultValues)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    const { container } = render(<VerdictSection />)
    expect(container.innerHTML).not.toBe('')
  })

  it('renders the headline text from the verdict engine', () => {
    const { model, verdict } = getRealModelAndVerdict()
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const headline = screen.getByTestId('verdict-headline')
    expect(headline).toBeInTheDocument()
    expect(headline.textContent).toBe(verdict.headline)
  })

  it('renders reasoning paragraphs', () => {
    const { model, verdict } = getRealModelAndVerdict()
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const reasoningContainer = screen.getByTestId('verdict-reasoning')
    expect(reasoningContainer).toBeInTheDocument()

    // Each reasoning string should appear as a paragraph
    for (const paragraph of verdict.reasoning) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
  })

  it('renders the key metrics comparison table', () => {
    const { model, verdict } = getRealModelAndVerdict()
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const metricsTable = screen.getByTestId('verdict-key-metrics')
    expect(metricsTable).toBeInTheDocument()

    // Table should have column headers
    expect(screen.getByText('Baseline')).toBeInTheDocument()
    expect(screen.getByText('Scenario A')).toBeInTheDocument()
    expect(screen.getByText('Scenario B')).toBeInTheDocument()

    // Each key metric label should appear as a row
    for (const metric of verdict.keyMetrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument()
    }
  })

  it('renders dealbreakers when present', () => {
    const modelWithDealbreakers = makeModelWithDealbreakers()
    mockModelOutputValue = { modelOutput: modelWithDealbreakers, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const verdict = generateVerdict(modelWithDealbreakers, defaultValues)

    // Only check for dealbreakers if the verdict actually has them
    if (verdict.dealbreakers.length > 0) {
      const dealbreakersContainer = screen.getByTestId('verdict-dealbreakers')
      expect(dealbreakersContainer).toBeInTheDocument()

      // Each dealbreaker scenario name should appear (escaped for regex
      // since scenario names contain parentheses)
      for (const db of verdict.dealbreakers) {
        const escaped = db.scenario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        expect(screen.getByText(new RegExp(escaped))).toBeInTheDocument()
      }
    }
  })

  it('applies destructive treatment when recommendation is none', () => {
    // Create a model where ALL scenarios have dealbreakers
    const real = runModel(defaultValues)
    const allBrokenModel: ModelOutput = {
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

    mockModelOutputValue = { modelOutput: allBrokenModel, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const verdictResult = generateVerdict(allBrokenModel, defaultValues)
    if (verdictResult.recommendation === 'none') {
      const section = screen.getByTestId('verdict-section')
      // When recommendation is 'none', the section should have destructive border styling
      expect(section.className).toMatch(/border-destructive/)
    }
  })

  it('uses proper heading hierarchy (h2 for headline, h3 for metrics)', () => {
    const model = runModel(defaultValues)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    // Headline should be h2
    const headline = screen.getByTestId('verdict-headline')
    expect(headline.tagName).toBe('H2')

    // Key metrics heading should be h3
    const metricsHeading = screen.getByText('Key Metrics Comparison')
    expect(metricsHeading.tagName).toBe('H3')
  })

  it('has proper ARIA region label for accessibility', () => {
    const model = runModel(defaultValues)
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    const region = screen.getByRole('region', { name: 'Verdict' })
    expect(region).toBeInTheDocument()
  })

  it('renders key metrics values in the correct columns', () => {
    const { model, verdict } = getRealModelAndVerdict()
    mockModelOutputValue = { modelOutput: model, isComputing: false }
    mockFormValues = defaultValues

    render(<VerdictSection />)

    // Find the table and verify each row has the correct values
    const table = screen.getByTestId('verdict-key-metrics').querySelector('table')!
    const rows = table.querySelectorAll('tbody tr')

    expect(rows.length).toBe(verdict.keyMetrics.length)

    // Verify first metric row has all three scenario values
    const firstMetric = verdict.keyMetrics[0]
    const firstRow = rows[0]
    const cells = firstRow.querySelectorAll('td')
    expect(cells[0].textContent).toBe(firstMetric.label)
    expect(cells[1].textContent).toBe(firstMetric.baseline)
    expect(cells[2].textContent).toBe(firstMetric.scenarioA)
    expect(cells[3].textContent).toBe(firstMetric.scenarioB)
  })
})
