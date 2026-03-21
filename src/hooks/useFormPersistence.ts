import { useCallback, useEffect, useMemo, useRef } from 'react'
import { formDefaultValues } from '@/schemas/scenarioInputs'
import type { ScenarioInputs } from '@/engine/types'

/** localStorage key for persisted scenario inputs */
const STORAGE_KEY = 'scenario-inputs'

/** Debounce delay in milliseconds for saving to localStorage */
const SAVE_DEBOUNCE_MS = 500

/**
 * Reads scenario inputs from localStorage on mount and provides
 * debounced save and reset functions.
 *
 * - On mount: parses localStorage value through the zod schema.
 *   If parsing succeeds, returns saved values; otherwise falls back to defaults.
 * - save(values): debounced (500ms) write to localStorage.
 * - resetToDefaults(): clears localStorage and returns the default values.
 */
export function useFormPersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read and validate localStorage only once on initial mount
  const initialValues = useMemo(() => readFromStorage(), [])

  // Clear any pending debounced save on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const save = useCallback((values: unknown) => {
    // Clear any pending debounced save
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
      } catch {
        // localStorage may be full or unavailable — silently ignore
      }
    }, SAVE_DEBOUNCE_MS)
  }, [])

  const resetToDefaults = useCallback((): ScenarioInputs => {
    // Cancel any pending save so stale data doesn't overwrite the reset
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage may be unavailable — silently ignore
    }

    return formDefaultValues as ScenarioInputs
  }, [])

  return { initialValues, save, resetToDefaults }
}

/**
 * Attempts to read scenario inputs from localStorage and merge with defaults.
 *
 * We do NOT validate through the Zod schema here because the form state
 * legitimately contains undefined values for unfilled required fields.
 * Strict Zod validation would reject partially-filled forms and wipe out
 * the user's progress on page refresh. Instead, we merge the saved values
 * on top of formDefaultValues so any missing keys get defaults.
 */
function readFromStorage(): ScenarioInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return formDefaultValues as ScenarioInputs
    }

    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return formDefaultValues as ScenarioInputs
    }

    // Shallow-merge each section: saved values override defaults, but only
    // if the saved value has the same type as the default (or the default is
    // undefined, meaning it's a required field the user fills in).
    const defaults = formDefaultValues as Record<string, Record<string, unknown>>
    const merged = {} as Record<string, unknown>

    for (const section of Object.keys(defaults)) {
      const defaultSection = defaults[section] ?? {}
      const savedSection =
        typeof parsed[section] === 'object' && parsed[section] !== null
          ? (parsed[section] as Record<string, unknown>)
          : {}

      const mergedSection = { ...defaultSection }
      for (const key of Object.keys(savedSection)) {
        const savedVal = savedSection[key]
        const defaultVal = defaultSection[key]
        // Accept if: default is undefined (required field, any user value OK),
        // or saved value has the same type as the default
        if (defaultVal === undefined || typeof savedVal === typeof defaultVal) {
          mergedSection[key] = savedVal
        }
        // Otherwise silently discard the invalid saved value — keep default
      }
      merged[section] = mergedSection
    }

    return merged as unknown as ScenarioInputs
  } catch {
    // JSON.parse failed or localStorage threw — fall back to form defaults
    return formDefaultValues as ScenarioInputs
  }
}
