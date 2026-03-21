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

interface FormFieldProps<T extends FieldValues> {
  /** Field name — must match a key in the form's schema */
  name: Path<T>
  /** Human-readable label displayed above the input */
  label: string
  /** react-hook-form control object from useForm() */
  control: Control<T>
  /** Optional helper text displayed below the input */
  description?: string
  /** Optional info tooltip — explains what this input means and how it's used */
  info?: string
  /** Optional className for the wrapper div */
  className?: string
  /** Optional input type (defaults to "text") */
  type?: string
  /** Optional inputMode for mobile keyboard hint */
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  /** Optional prefix element (e.g., "$") rendered inside the input container */
  prefix?: React.ReactNode
  /** Optional suffix element (e.g., "%") rendered inside the input container */
  suffix?: React.ReactNode
  /** Optional placeholder text */
  placeholder?: string
}

/**
 * Format a number with comma thousands separators.
 * e.g., 1100000 -> "1,100,000", 2400 -> "2,400"
 * Handles decimals: 1234.56 -> "1,234.56"
 */
function formatWithCommas(val: unknown): string {
  if (val === '' || val === undefined || val === null) return ''
  const num = Number(val)
  if (isNaN(num)) return String(val)
  // Use toLocaleString for proper comma formatting
  return num.toLocaleString('en-US', { maximumFractionDigits: 10 })
}

/**
 * Strip commas and parse a string to a number.
 * Returns undefined if empty, the parsed number if valid, or undefined if NaN.
 */
function parseNumericInput(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '') return undefined
  const parsed = Number(cleaned)
  return isNaN(parsed) ? undefined : parsed
}

/**
 * Inner component for numeric fields that need comma formatting.
 * Uses local state to preserve intermediate typing states (like trailing
 * decimal points) while keeping the form value as a clean number.
 */
function NumericFieldInner({
  field,
  fieldState,
  name,
  label,
  description,
  info,
  className,
  prefix,
  suffix,
  placeholder,
  inputMode,
}: {
  field: ControllerRenderProps<FieldValues, string>
  fieldState: ControllerFieldState
  name: string
  label: string
  description?: string
  info?: string
  className?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [localValue, setLocalValue] = useState(() => formatWithCommas(field.value))
  const [isFocused, setIsFocused] = useState(false)
  // Track the last value we sent to the form via field.onChange so the
  // sync effect can distinguish external changes (form reset, localStorage)
  // from our own updates echoing back.
  const lastOnChangeValue = useRef<unknown>(field.value)

  // Sync from form state only for EXTERNAL changes (form reset, localStorage load).
  // Skip when the field.value matches what we last set via onChange — that's just
  // our own update echoing back through react-hook-form.
  useEffect(() => {
    if (!isFocused && field.value !== lastOnChangeValue.current) {
      setLocalValue(formatWithCommas(field.value))
      lastOnChangeValue.current = field.value
    }
  }, [field.value, isFocused])

  const descriptionId = description ? `${name}-description` : undefined

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
        {prefix && (
          <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={name}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-describedby={descriptionId}
          className={cn(
            prefix && 'pl-7',
            suffix && 'pr-7',
          )}
          value={localValue}
          ref={field.ref}
          name={field.name}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            const rawValue = e.target.value
            setLocalValue(rawValue)

            if (rawValue === '') {
              lastOnChangeValue.current = undefined
              field.onChange(undefined)
              return
            }
            // Allow trailing decimal point while typing
            if (rawValue.endsWith('.') || rawValue.endsWith(',.')) {
              return
            }
            const parsed = parseNumericInput(rawValue)
            if (parsed !== undefined) {
              lastOnChangeValue.current = parsed
              field.onChange(parsed)
            }
          }}
          onBlur={() => {
            // Normalize: parse the final value, format with commas, update form
            const parsed = parseNumericInput(localValue)
            if (parsed !== undefined) {
              setLocalValue(formatWithCommas(parsed))
              lastOnChangeValue.current = parsed
              field.onChange(parsed)
            } else {
              setLocalValue('')
              lastOnChangeValue.current = undefined
              field.onChange(undefined)
            }
            setIsFocused(false)
            field.onBlur()
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground md:text-xs">{description}</p>
      )}
      {fieldState.error?.message && (
        <p className="text-xs text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  )
}

/**
 * FormField wraps a shadcn Label + Input with react-hook-form Controller.
 * It handles label association (htmlFor/id), error display, and optional
 * prefix/suffix adornments for currency and percentage inputs.
 *
 * For numeric fields (type="number" or inputMode="decimal"), displays
 * values with comma separators (e.g., 1,100,000) while storing raw
 * numbers in form state.
 */
function FormField<T extends FieldValues>({
  name,
  label,
  control,
  description,
  info,
  className,
  type = 'text',
  inputMode,
  prefix,
  suffix,
  placeholder,
}: FormFieldProps<T>) {
  const isNumeric = type === 'number' || inputMode === 'decimal'

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        if (isNumeric) {
          return (
            <NumericFieldInner
              field={field as unknown as ControllerRenderProps<FieldValues, string>}
              fieldState={fieldState}
              name={name}
              label={label}
              description={description}
              info={info}
              className={className}
              prefix={prefix}
              suffix={suffix}
              placeholder={placeholder}
              inputMode={inputMode}
            />
          )
        }

        const descriptionId = description ? `${name}-description` : undefined
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
            {prefix && (
              <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
                {prefix}
              </span>
            )}
            <Input
              id={name}
              type={type}
              inputMode={inputMode}
              placeholder={placeholder}
              aria-describedby={descriptionId}
              className={cn(
                prefix && 'pl-7',
                suffix && 'pr-7',
              )}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
            {suffix && (
              <span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
          {description && (
            <p id={descriptionId} className="text-sm text-muted-foreground md:text-xs">{description}</p>
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

export { FormField }
export type { FormFieldProps }
