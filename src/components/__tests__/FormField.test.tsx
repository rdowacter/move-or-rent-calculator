import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { describe, it, expect } from 'vitest'
import { FormField } from '../FormField'
import { CurrencyInput } from '../CurrencyInput'
import { PercentInput } from '../PercentInput'

/**
 * Test wrapper that provides react-hook-form context.
 * All form field components require a FormProvider ancestor
 * because they use Controller internally.
 */
interface WrapperProps {
  defaultValues?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (props: { control: any }) => ReactNode
}

function FormWrapper({ defaultValues = {}, children }: WrapperProps) {
  const methods = useForm({ defaultValues })
  return (
    <FormProvider {...methods}>
      {children({ control: methods.control })}
    </FormProvider>
  )
}

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------
describe('FormField', () => {
  it('renders a label and input associated via htmlFor/id', () => {
    render(
      <FormWrapper defaultValues={{ testField: '' }}>
        {({ control }) => (
          <FormField name="testField" label="Test Label" control={control} />
        )}
      </FormWrapper>
    )

    const label = screen.getByText('Test Label')
    const input = screen.getByRole('textbox')

    // Label's htmlFor should match input's id
    expect(label).toHaveAttribute('for', 'testField')
    expect(input).toHaveAttribute('id', 'testField')
  })

  it('renders an optional description when provided', () => {
    render(
      <FormWrapper defaultValues={{ testField: '' }}>
        {({ control }) => (
          <FormField
            name="testField"
            label="Test Label"
            control={control}
            description="Helpful context"
          />
        )}
      </FormWrapper>
    )

    expect(screen.getByText('Helpful context')).toBeInTheDocument()
  })

  it('displays error messages from react-hook-form validation', async () => {
    function ErrorFormField() {
      const methods = useForm({
        defaultValues: { testField: '' },
        mode: 'onChange',
      })

      // Manually set an error to simulate react-hook-form validation
      React.useEffect(() => {
        methods.setError('testField', {
          type: 'manual',
          message: 'This field is required',
        })
      }, [methods])

      return (
        <FormProvider {...methods}>
          <FormField
            name="testField"
            label="Test Label"
            control={methods.control}
          />
        </FormProvider>
      )
    }

    // Need React for the useEffect in ErrorFormField
    const React = await import('react')
    render(<ErrorFormField />)

    expect(await screen.findByText('This field is required')).toBeInTheDocument()
  })

  it('calls onChange when the input value changes', () => {
    render(
      <FormWrapper defaultValues={{ testField: '' }}>
        {({ control }) => (
          <FormField name="testField" label="Test Label" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(input).toHaveValue('hello')
  })
})

// ---------------------------------------------------------------------------
// CurrencyInput
// ---------------------------------------------------------------------------
describe('CurrencyInput', () => {
  it('renders with a $ prefix', () => {
    render(
      <FormWrapper defaultValues={{ price: 0 }}>
        {({ control }) => (
          <CurrencyInput name="price" label="Home Price" control={control} />
        )}
      </FormWrapper>
    )

    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('sets inputMode to decimal for numeric keyboard on mobile', () => {
    render(
      <FormWrapper defaultValues={{ price: 0 }}>
        {({ control }) => (
          <CurrencyInput name="price" label="Home Price" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('updates form value when user types a number', () => {
    render(
      <FormWrapper defaultValues={{ price: 0 }}>
        {({ control }) => (
          <CurrencyInput name="price" label="Home Price" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '270000' } })
    expect(input).toHaveValue('270000')
  })

  it('displays the initial value from defaultValues', () => {
    render(
      <FormWrapper defaultValues={{ price: 270000 }}>
        {({ control }) => (
          <CurrencyInput name="price" label="Home Price" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('270000')
  })
})

// ---------------------------------------------------------------------------
// PercentInput
// ---------------------------------------------------------------------------
describe('PercentInput', () => {
  it('renders with a % suffix', () => {
    render(
      <FormWrapper defaultValues={{ rate: 0.06 }}>
        {({ control }) => (
          <PercentInput name="rate" label="Interest Rate" control={control} />
        )}
      </FormWrapper>
    )

    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('sets inputMode to decimal for numeric keyboard on mobile', () => {
    render(
      <FormWrapper defaultValues={{ rate: 0.06 }}>
        {({ control }) => (
          <PercentInput name="rate" label="Interest Rate" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('displays decimal value as a percentage (0.06 -> 6)', () => {
    // Engine stores 0.06 for 6%, but the user should see "6" in the input
    render(
      <FormWrapper defaultValues={{ rate: 0.06 }}>
        {({ control }) => (
          <PercentInput name="rate" label="Interest Rate" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('6')
  })

  it('converts user-entered percentage to decimal on change (3 -> 0.03)', () => {
    // When user types "3", the form value should be 0.03
    function CaptureControl() {
      const methods = useForm({ defaultValues: { rate: 0 } })
      return (
        <FormProvider {...methods}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <PercentInput name="rate" label="Interest Rate" control={methods.control as any} />
          <TestValueDisplay />
        </FormProvider>
      )
    }

    function TestValueDisplay() {
      const value = useWatch({ name: 'rate' })
      return <span data-testid="form-value">{String(value)}</span>
    }

    render(<CaptureControl />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '3' } })

    // The displayed value should be "3" (what the user typed)
    expect(input).toHaveValue('3')

    // The underlying form value should be 0.03 (decimal conversion)
    const formValue = screen.getByTestId('form-value')
    expect(formValue.textContent).toBe('0.03')
  })

  it('handles zero value correctly (0 -> displays 0)', () => {
    render(
      <FormWrapper defaultValues={{ rate: 0 }}>
        {({ control }) => (
          <PercentInput name="rate" label="Interest Rate" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('0')
  })

  it('handles small decimal percentages (0.025 -> displays 2.5)', () => {
    render(
      <FormWrapper defaultValues={{ rate: 0.025 }}>
        {({ control }) => (
          <PercentInput name="rate" label="Interest Rate" control={control} />
        )}
      </FormWrapper>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('2.5')
  })
})
