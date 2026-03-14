import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
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
      render={({ field, fieldState }) => (
        <div className={cn('space-y-1.5', className)}>
          <Label htmlFor={name}>{label}</Label>
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
              className={cn(
                prefix && 'pl-7',
                suffix && 'pr-7',
              )}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => {
                // Always pass the raw string during typing so intermediate
                // states like "12." or "0.0" are preserved. Conversion to
                // Number happens on blur.
                field.onChange(e.target.value)
              }}
              onBlur={(e) => {
                // Let react-hook-form know the field was touched
                field.onBlur()

                // For numeric fields, convert the final string to a Number
                // so the form value is the correct type for the engine.
                if (type === 'number' || inputMode === 'decimal') {
                  const rawValue = e.target.value.trim()
                  if (rawValue === '') return
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
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {fieldState.error?.message && (
            <p className="text-xs text-destructive" role="alert">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  )
}

export { FormField }
export type { FormFieldProps }
