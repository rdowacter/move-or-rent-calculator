import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
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
 * FormField wraps a shadcn Label + Input with react-hook-form Controller.
 * It handles label association (htmlFor/id), error display, and optional
 * prefix/suffix adornments for currency and percentage inputs.
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
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
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
              onChange={(e) => {
                const rawValue = e.target.value
                if (type === 'number' || inputMode === 'decimal') {
                  if (rawValue === '') {
                    field.onChange(undefined)
                  } else if (rawValue.endsWith('.')) {
                    // User still typing a decimal — keep raw string
                    field.onChange(rawValue)
                  } else {
                    // Strip commas so users can type "1,100,000" and get 1100000
                    const cleaned = rawValue.replace(/,/g, '')
                    const parsed = Number(cleaned)
                    if (!isNaN(parsed)) {
                      field.onChange(parsed)
                    }
                    // If still NaN after stripping commas, ignore the keystroke
                  }
                } else {
                  field.onChange(rawValue)
                }
              }}
              onBlur={(e) => {
                // Let react-hook-form know the field was touched
                field.onBlur()

                // For numeric fields, convert the final string to a Number
                // so the form value is the correct type for the engine.
                if (type === 'number' || inputMode === 'decimal') {
                  const rawValue = e.target.value.trim().replace(/,/g, '')
                  if (rawValue === '') {
                    field.onChange(undefined)
                    return
                  }
                  const parsed = Number(rawValue)
                  if (!isNaN(parsed)) {
                    field.onChange(parsed)
                  }
                }
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
      }}
    />
  )
}

export { FormField }
export type { FormFieldProps }
