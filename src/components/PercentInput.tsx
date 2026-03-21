import { useState, useEffect, useRef } from 'react'
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type ControllerFieldState,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { Info } from 'lucide-react'
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
  /** Optional info tooltip */
  info?: string
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

/**
 * Convert decimal form value to percentage for display.
 * e.g., 0.06 -> "6", 0.025 -> "2.5"
 */
function computeDisplay(val: unknown): string {
  return val === '' || val === undefined || val === null
    ? ''
    : parseFloat((Number(val) * PERCENT_DISPLAY_MULTIPLIER).toFixed(10)).toString()
}

/**
 * Inner component that holds the hooks (useState, useEffect) at the
 * top level of a React component — not inside a render callback.
 * This satisfies the Rules of Hooks while still working with Controller.
 */
function PercentInputInner({
  field,
  fieldState,
  name,
  label,
  description,
  info,
  className,
  placeholder,
}: {
  field: ControllerRenderProps<FieldValues, string>
  fieldState: ControllerFieldState
  name: string
  label: string
  description?: string
  info?: string
  className?: string
  placeholder?: string
}) {
  // Local state preserves intermediate typing states like "2." or ".5"
  // that would be lost if we converted to Number on every keystroke
  const [localValue, setLocalValue] = useState(() => computeDisplay(field.value))
  const [isFocused, setIsFocused] = useState(false)
  const lastOnChangeValue = useRef<unknown>(field.value)

  // Sync from form state only for EXTERNAL changes (form reset, localStorage load).
  useEffect(() => {
    if (!isFocused && field.value !== lastOnChangeValue.current) {
      setLocalValue(computeDisplay(field.value))
      lastOnChangeValue.current = field.value
    }
  }, [field.value, isFocused])

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        {info && (
          <span className="group relative">
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" aria-hidden="true" />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {info}
            </span>
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <Input
          id={name}
          inputMode="decimal"
          placeholder={placeholder}
          className="pr-7"
          value={localValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            const trimmed = localValue.trim()
            if (trimmed === '') {
              setLocalValue('')
              lastOnChangeValue.current = undefined
              field.onChange(undefined)
            } else {
              const parsed = Number(trimmed)
              if (!isNaN(parsed)) {
                setLocalValue(parsed.toString())
                const decimal = parsed / PERCENT_DISPLAY_MULTIPLIER
                lastOnChangeValue.current = decimal
                field.onChange(decimal)
              }
            }
            setIsFocused(false)
            field.onBlur()
          }}
          ref={field.ref}
          name={field.name}
          onChange={(e) => {
            const rawValue = e.target.value
            setLocalValue(rawValue)
            if (rawValue === '') {
              lastOnChangeValue.current = undefined
              field.onChange(undefined)
              return
            }
            const parsed = Number(rawValue)
            if (!isNaN(parsed)) {
              const decimal = parsed / PERCENT_DISPLAY_MULTIPLIER
              lastOnChangeValue.current = decimal
              field.onChange(decimal)
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
}

function PercentInput<T extends FieldValues>({
  name,
  label,
  control,
  description,
  info,
  className,
  placeholder,
}: PercentInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <PercentInputInner
          field={field as unknown as ControllerRenderProps<FieldValues, string>}
          fieldState={fieldState}
          name={name}
          label={label}
          description={description}
          info={info}
          className={className}
          placeholder={placeholder}
        />
      )}
    />
  )
}

export { PercentInput }
export type { PercentInputProps }
