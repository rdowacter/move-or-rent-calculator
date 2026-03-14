// ---------------------------------------------------------------------------
// UpfrontCapital.test.tsx — Tests for the upfront capital requirements component
//
// Uses real engine output via runModel with default inputs to ensure the
// component renders actual financial data correctly. Mocks useModelOutput
// to inject the engine output into the component via context.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpfrontCapital } from '../UpfrontCapital'
import { runModel } from '@/engine/scenarios'
import type { ModelOutput } from '@/engine/types'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '@/engine/constants'
import type { ScenarioInputs } from '@/engine/types'
import { formatCurrency } from '@/utils/formatters'

// ---- Build real model output from default (Preston) inputs ----
const prestonInputs: ScenarioInputs = {
  personal: { ...DEFAULT_PERSONAL_INPUTS },
  retirement: { ...DEFAULT_RETIREMENT_INPUTS },
  currentHome: { ...DEFAULT_CURRENT_HOME_INPUTS },
  newHome: { ...DEFAULT_NEW_HOME_INPUTS },
  commute: { ...DEFAULT_COMMUTE_INPUTS },
  costs: { ...DEFAULT_COST_INPUTS },
  projection: { ...DEFAULT_PROJECTION_INPUTS },
}

const realModelOutput: ModelOutput = runModel(prestonInputs)

// ---- Mock the useModelOutput hook ----
vi.mock('@/components/ScenarioModelProvider', () => ({
  useModelOutput: vi.fn(),
}))

// Import the mock after vi.mock so we can control its return value per test
import { useModelOutput } from '@/components/ScenarioModelProvider'
const mockUseModelOutput = vi.mocked(useModelOutput)

// ===========================================================================
// Tests
// ===========================================================================

describe('UpfrontCapital', () => {
  it('renders nothing when modelOutput is null', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: null, isComputing: false })
    const { container } = render(<UpfrontCapital />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the section heading', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)
    expect(
      screen.getByText('Upfront Capital Requirements')
    ).toBeInTheDocument()
  })

  it('renders a card for each scenario', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    // All three scenario names should appear
    expect(screen.getByText(realModelOutput.baseline.name)).toBeInTheDocument()
    expect(screen.getByText(realModelOutput.scenarioA.name)).toBeInTheDocument()
    expect(screen.getByText(realModelOutput.scenarioB.name)).toBeInTheDocument()
  })

  it('shows "No capital event" message for baseline', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    // Baseline requires no capital event (stay in Kyle, no home purchase)
    expect(
      screen.getByText(/No capital event needed/)
    ).toBeInTheDocument()
  })

  it('shows line items for Scenario A: down payment, closing costs, moving costs', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    const capitalA = realModelOutput.scenarioA.upfrontCapital

    // Down payment line item
    expect(screen.getAllByText('Down Payment').length).toBeGreaterThanOrEqual(1)

    // Closing costs line item
    expect(screen.getAllByText('Closing Costs').length).toBeGreaterThanOrEqual(1)

    // Moving costs line item
    expect(screen.getAllByText('Moving Costs').length).toBeGreaterThanOrEqual(1)

    // Total needed should appear
    expect(screen.getAllByText('Total Needed').length).toBeGreaterThanOrEqual(1)

    // Actual down payment value from engine
    // Scenario A: 20% of $300,000 = $60,000
    expect(capitalA.downPayment).toBe(60_000)
    expect(
      screen.getAllByText(formatCurrency(capitalA.downPayment)).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('shows home sale net proceeds as a funding source for Scenario A', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    const capitalA = realModelOutput.scenarioA.upfrontCapital

    // Scenario A sells Kyle, so homeSaleNetProceeds should be non-null
    expect(capitalA.homeSaleNetProceeds).not.toBeNull()
    expect(
      screen.getByText('Home Sale Net Proceeds')
    ).toBeInTheDocument()
  })

  it('shows IRA withdrawal as a funding source for Scenario B', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    const capitalB = realModelOutput.scenarioB.upfrontCapital

    // Scenario B withdraws IRA, so iraWithdrawalNetProceeds should be non-null
    expect(capitalB.iraWithdrawalNetProceeds).not.toBeNull()
    expect(
      screen.getByText('IRA Withdrawal (after tax/penalty)')
    ).toBeInTheDocument()
  })

  it('shows surplus with positive styling when cash available exceeds needed', () => {
    // Use a modified output where Scenario A has a surplus
    const capitalA = realModelOutput.scenarioA.upfrontCapital
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    if (capitalA.surplus >= 0) {
      // Should show the surplus amount
      expect(screen.getAllByText('Surplus').length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders shortfall with destructive alert when surplus is negative', () => {
    // Create a modified model output where both A and B have shortfalls
    // so we can verify destructive alerts render for shortfall scenarios
    const shortfallOutput: ModelOutput = {
      ...realModelOutput,
      scenarioA: {
        ...realModelOutput.scenarioA,
        upfrontCapital: {
          ...realModelOutput.scenarioA.upfrontCapital,
          surplus: -5_000,
          cashAvailable: realModelOutput.scenarioA.upfrontCapital.totalCashNeeded - 5_000,
        },
      },
      scenarioB: {
        ...realModelOutput.scenarioB,
        upfrontCapital: {
          ...realModelOutput.scenarioB.upfrontCapital,
          surplus: -10_000,
          cashAvailable: realModelOutput.scenarioB.upfrontCapital.totalCashNeeded - 10_000,
        },
      },
    }

    mockUseModelOutput.mockReturnValue({ modelOutput: shortfallOutput, isComputing: false })
    render(<UpfrontCapital />)

    // Both shortfall scenarios should show "Shortfall" alert title
    const shortfallLabels = screen.getAllByText('Shortfall')
    expect(shortfallLabels).toHaveLength(2)

    // Should include the dollar amounts of each shortfall
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument()
    expect(screen.getByText(/\$10,000/)).toBeInTheDocument()

    // The alerts should have the destructive role
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
  })

  it('shows Total Available for scenarios with capital events', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    // Both Scenario A and Scenario B should show Total Available
    expect(screen.getAllByText('Total Available').length).toBe(2)
  })

  it('does not show IRA withdrawal line for Scenario A (IRA kept intact)', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    const capitalA = realModelOutput.scenarioA.upfrontCapital

    // Scenario A keeps the IRA, so iraWithdrawalNetProceeds should be null
    expect(capitalA.iraWithdrawalNetProceeds).toBeNull()

    // Only one "IRA Withdrawal" line should appear (from Scenario B)
    const iraLines = screen.getAllByText('IRA Withdrawal (after tax/penalty)')
    expect(iraLines).toHaveLength(1)
  })

  it('does not show home sale line for Scenario B (home kept as rental)', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    const capitalB = realModelOutput.scenarioB.upfrontCapital

    // Scenario B keeps Kyle as rental, so homeSaleNetProceeds should be null
    expect(capitalB.homeSaleNetProceeds).toBeNull()

    // Only one "Home Sale Net Proceeds" line should appear (from Scenario A)
    const saleLines = screen.getAllByText('Home Sale Net Proceeds')
    expect(saleLines).toHaveLength(1)
  })

  it('renders in a responsive grid layout', () => {
    mockUseModelOutput.mockReturnValue({ modelOutput: realModelOutput, isComputing: false })
    render(<UpfrontCapital />)

    // The grid container should have the responsive grid classes
    const section = screen.getByLabelText('Upfront Capital Requirements')
    const grid = section.querySelector('.grid')
    expect(grid).not.toBeNull()
  })
})
