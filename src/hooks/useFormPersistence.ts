import { useCallback, useEffect, useMemo, useRef } from 'react'
import { scenarioInputsSchema, formDefaultValues } from '@/schemas/scenarioInputs'
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
 * Attempts to read and validate scenario inputs from localStorage.
 * Returns defaultValues if localStorage is empty, unparseable, or invalid.
 */
function readFromStorage(): ScenarioInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return formDefaultValues as ScenarioInputs
    }

    const parsed = JSON.parse(raw)
    const result = scenarioInputsSchema.safeParse(parsed)

    if (result.success) {
      // User has previously saved valid data — use it as-is
      return result.data
    }

    return formDefaultValues as ScenarioInputs
  } catch {
    // JSON.parse failed or localStorage threw — fall back to form defaults
    return formDefaultValues as ScenarioInputs
  }
}
