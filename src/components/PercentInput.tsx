import { useState, useEffect } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PercentInputProps<T extends FieldValues> {
  /** Field name — must match a key in the form's schema */
  name: Path<T>
  /** Human-readable label displayed above the input */
  label: string
  /** react-hook-form control object from useForm() */
  control: Control<T>
  /** Optional helper text displayed below the input */
  description?: string
  /** Optional className for the wrapper div */
  className?: string
  /** Optional placeholder text */
  placeholder?: string
}

/**
 * PercentInput handles the conversion between engine decimal values and
 * user-friendly percentage display.
 *
 * - Engine/form stores: 0.06 (for 6%)
 * - User sees and types: 6
 *
 * This conversion is critical because the financial engine expects decimals
 * (e.g., 0.02 for a 2% interest rate), but users naturally think in
 * percentages. The component handles this translation internally so neither
 * the engine nor the form schema needs to worry about it.
 */

/** Multiplier to convert between decimal and percentage display */
const PERCENT_DISPLAY_MULTIPLIER = 100

function PercentInput<T extends FieldValues>({
  name,
  label,
  control,
  description,
  className,
  placeholder,
}: PercentInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // Convert decimal form value to percentage for display
        // e.g., 0.06 -> "6", 0.025 -> "2.5"
        const computeDisplay = (val: unknown) =>
          val === '' || val === undefined || val === null
            ? ''
            : parseFloat((Number(val) * PERCENT_DISPLAY_MULTIPLIER).toFixed(10)).toString()

        // Local state preserves intermediate typing states like "2." or ".5"
        // that would be lost if we converted to Number on every keystroke
        const [localValue, setLocalValue] = useState(() => computeDisplay(field.value))
        const [isFocused, setIsFocused] = useState(false)

        // Sync from form state when not actively editing
        useEffect(() => {
          if (!isFocused) {
            setLocalValue(computeDisplay(field.value))
          }
        }, [field.value, isFocused])

        return (
          <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={name}>{label}</Label>
            <div className="relative flex items-center">
              <Input
                id={name}
                inputMode="decimal"
                placeholder={placeholder}
                className="pr-7"
                value={localValue}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false)
                  // Normalize display on blur
                  const trimmed = localValue.trim()
                  if (trimmed === '') {
                    field.onChange('')
                  } else {
                    const parsed = Number(trimmed)
                    if (!isNaN(parsed)) {
                      setLocalValue(parsed.toString())
                      field.onChange(parsed / PERCENT_DISPLAY_MULTIPLIER)
                    }
                  }
                  field.onBlur()
                }}
                ref={field.ref}
                name={field.name}
                onChange={(e) => {
                  const rawValue = e.target.value
                  setLocalValue(rawValue)
                  if (rawValue === '') {
                    field.onChange('')
                    return
                  }
                  const parsed = Number(rawValue)
                  if (!isNaN(parsed)) {
                    // Convert percentage input back to decimal for form state
                    // e.g., user types "3" -> store 0.03
                    field.onChange(parsed / PERCENT_DISPLAY_MULTIPLIER)
                  }
                }}
              />
              <span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
                %
              </span>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {fieldState.error?.message && (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )
      }}
    />
  )
}

export { PercentInput }
export type { PercentInputProps }
