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
import { useForm, FormProvider } from 'react-hook-form'
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

// Mock useWatch for VerdictSection — it needs form values to call generateVerdict.
// We must preserve the real useForm, FormProvider, and useFormContext because
// ResultsSections uses useFormContext for the time horizon control, and the
// FormWrapper needs useForm + FormProvider to provide form context.
vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hook-form')>()
  return {
    ...actual,
    useWatch: () => defaultValues,
  }
})

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

function FormWrapper({ children }: { children: ReactNode }) {
  const methods = useForm({ defaultValues })
  return <FormProvider {...methods}>{children}</FormProvider>
}

describe('ResultsSections integration', () => {
  it('renders the results-sections wrapper', () => {
    mockReturnValue = { modelOutput: mockModelOutput, isComputing: false }
    render(<FormWrapper><ResultsSections /></FormWrapper>)
    expect(screen.getByTestId('results-sections')).toBeInTheDocument()
  })

  it('renders all six results sections when model output is available', () => {
    mockReturnValue = { modelOutput: mockModelOutput, isComputing: false }
    render(<FormWrapper><ResultsSections /></FormWrapper>)

    // ResultSection wrapper renders "Net Worth Over Time" heading
    expect(screen.getByText('Net Worth Over Time')).toBeInTheDocument()

    // ResultSection wrapper renders "Retirement Account Trajectory" heading
    expect(screen.getByText('Retirement Account Trajectory')).toBeInTheDocument()

    // ResultSection wrapper renders "Warnings & Risks" heading
    expect(screen.getByText('Warnings & Risks')).toBeInTheDocument()

    // StressTests section heading
    expect(screen.getByText('What-If Stress Tests')).toBeInTheDocument()

    // UpfrontCapital renders its section with aria-label
    expect(
      screen.getByLabelText('Upfront Capital Requirements')
    ).toBeInTheDocument()

    // MonthlyCashFlow renders scenario cards with "Baseline" label
    // (also appears in VerdictSection key metrics and NetWorthBreakdown, so use getAllByText)
    expect(screen.getAllByText('Baseline').length).toBeGreaterThanOrEqual(1)
  })

  it('renders gracefully when model output is null', () => {
    mockReturnValue = { modelOutput: null, isComputing: true }
    render(<FormWrapper><ResultsSections /></FormWrapper>)

    // The wrapper should still render
    expect(screen.getByTestId('results-sections')).toBeInTheDocument()

    // ResultSection headings are always rendered (they wrap child components),
    // but child content should not render when modelOutput is null.
    // The wrapper headings like "Net Worth Over Time" will still be in the DOM.
    // Verify that child-specific content (e.g., chart containers) is absent.
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stress-tests')).not.toBeInTheDocument()
  })
})
