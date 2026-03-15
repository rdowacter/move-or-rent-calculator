import { type Control, type FieldValues, type Path } from 'react-hook-form'
import { FormField } from './FormField'

interface CurrencyInputProps<T extends FieldValues> {
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
 * CurrencyInput renders a FormField with a "$" prefix and decimal inputMode.
 * Values are stored as numbers in the form state.
 *
 * USD-only by design — this tool is built for US real estate scenarios.
 */
function CurrencyInput<T extends FieldValues>({
  name,
  label,
  control,
  description,
  info,
  className,
  placeholder,
}: CurrencyInputProps<T>) {
  return (
    <FormField
      name={name}
      label={label}
      control={control}
      description={description}
      info={info}
      className={className}
      placeholder={placeholder}
      inputMode="decimal"
      prefix="$"
    />
  )
}

export { CurrencyInput }
export type { CurrencyInputProps }
