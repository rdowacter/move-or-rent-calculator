import { render, screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { describe, it, expect } from 'vitest'
import { scenarioInputsSchema, defaultValues } from '@/schemas/scenarioInputs'
import { InputAccordion, ALL_SECTIONS } from '../InputAccordion'

/**
 * Wrapper that provides react-hook-form context with the full scenario schema.
 * All accordion sections rely on useFormContext() internally.
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm({
    resolver: zodResolver(scenarioInputsSchema),
    defaultValues,
  })
  return <FormProvider {...methods}>{children}</FormProvider>
}

describe('InputAccordion', () => {
  it('renders all 6 section headers', () => {
    render(
      <TestWrapper>
        <InputAccordion />
      </TestWrapper>
    )

    expect(screen.getByText('About You')).toBeInTheDocument()
    expect(screen.getByText('Retirement')).toBeInTheDocument()
    expect(screen.getByText('Current Home (Kyle)')).toBeInTheDocument()
    expect(screen.getByText('New Home (Austin)')).toBeInTheDocument()
    expect(screen.getByText('Commute')).toBeInTheDocument()
    expect(screen.getByText('Costs & Projection')).toBeInTheDocument()
  })

  it('renders "About You" primary fields when section is open', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['about-you']} />
      </TestWrapper>
    )

    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByText('Annual Gross Income')).toBeInTheDocument()
    expect(screen.getByText('Filing Status')).toBeInTheDocument()
    expect(screen.getByText('Monthly Living Expenses')).toBeInTheDocument()
    expect(screen.getByText('Liquid Savings')).toBeInTheDocument()
  })

  it('renders "Retirement" primary fields when section is open', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['retirement']} />
      </TestWrapper>
    )

    expect(screen.getByText('IRA Balance')).toBeInTheDocument()
    expect(screen.getByText('IRA Type')).toBeInTheDocument()
    expect(screen.getByText('Annual Contribution — Scenario A')).toBeInTheDocument()
    expect(screen.getByText('Annual Contribution — Scenario B')).toBeInTheDocument()
  })

  it('renders "Current Home (Kyle)" primary fields when section is open', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['current-home']} />
      </TestWrapper>
    )

    expect(screen.getByText('Home Value')).toBeInTheDocument()
    expect(screen.getByText('Mortgage Balance')).toBeInTheDocument()
    expect(screen.getByText('Interest Rate')).toBeInTheDocument()
    expect(screen.getByText('Years Into Loan')).toBeInTheDocument()
    expect(screen.getByText('Expected Monthly Rent')).toBeInTheDocument()
  })

  it('renders "New Home (Austin)" primary fields when section is open', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['new-home']} />
      </TestWrapper>
    )

    expect(screen.getByText('Purchase Price')).toBeInTheDocument()
    expect(screen.getByText('Down Payment % — Scenario A')).toBeInTheDocument()
    expect(screen.getByText('Down Payment % — Scenario B')).toBeInTheDocument()
  })

  it('renders "Commute" primary fields when section is open', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['commute']} />
      </TestWrapper>
    )

    expect(screen.getByText('Current Round-Trip Miles')).toBeInTheDocument()
    expect(screen.getByText('Daily Time Saved (Hours)')).toBeInTheDocument()
    expect(screen.getByText('Current Monthly Tolls')).toBeInTheDocument()
  })

  it('renders multiple sections open simultaneously', () => {
    render(
      <TestWrapper>
        <InputAccordion defaultOpenSections={['about-you', 'retirement']} />
      </TestWrapper>
    )

    // Both sections should have their primary fields visible
    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByText('IRA Balance')).toBeInTheDocument()
  })

  it('exports ALL_SECTIONS constant with all 6 section values', () => {
    expect(ALL_SECTIONS).toEqual([
      'about-you',
      'retirement',
      'current-home',
      'new-home',
      'commute',
      'costs-projection',
    ])
  })
})
