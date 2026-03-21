// ---------------------------------------------------------------------------
// useScenarioModel.ts — Bridge between react-hook-form state and the
// financial calculation engine.
//
// Watches all form values via useWatch(), debounces changes (150ms),
// and calls runModel() to produce year-by-year scenario projections.
// The engine is synchronous and runs in microseconds, so no async handling
// is needed — the debounce exists only to avoid thrashing on rapid keystrokes.
//
// Includes a validation gate: the engine only runs when all required personal/
// financial fields are filled. Until then, modelOutput is null.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react'
import { useWatch } from 'react-hook-form'
import type { ScenarioInputs, ModelOutput } from '@/engine/types'
import { runModel } from '@/engine/scenarios'
import { checkRequiredFields } from '@/schemas/scenarioInputs'

/** Debounce delay in milliseconds — prevents recalculation on every keystroke. */
const DEBOUNCE_MS = 150

export interface UseScenarioModelResult {
  /** The complete model output, or null before required fields are filled. */
  modelOutput: ModelOutput | null
  /** True while waiting for the debounce timer to fire after an input change. */
  isComputing: boolean
  /** True when all required fields have been filled and the engine can run. */
  isReady: boolean
  /** Number of required fields that have been filled so far. */
  filledCount: number
  /** Total number of required fields that must be filled. */
  totalRequired: number
}

/**
 * Hook that watches all form values and runs the financial model engine
 * whenever inputs change (debounced at 150ms).
 *
 * The engine only runs when all required fields are filled. Until then,
 * modelOutput remains null and isReady is false.
 *
 * Must be used inside a react-hook-form FormProvider whose values match
 * the ScenarioInputs shape.
 */
export function useScenarioModel(): UseScenarioModelResult {
  const [modelOutput, setModelOutput] = useState<ModelOutput | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRun = useRef(true)

  // useWatch() with no `name` argument subscribes to all form fields.
  // Returns the full form values object whenever any field changes.
  const formValues = useWatch<ScenarioInputs>()

  const { isReady, filledCount, totalRequired } = checkRequiredFields(formValues)

  useEffect(() => {
    // Don't run the engine if required fields are missing
    if (!isReady) {
      setModelOutput(null)
      setIsComputing(false)
      // Clear any pending timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      isFirstRun.current = true
      return
    }

    // Wrap runModel in a try-catch so a calculation error (e.g., NaN from
    // a race between checkRequiredFields and actual form values) doesn't
    // crash the entire page.
    const safeRunModel = () => {
      try {
        return runModel(formValues as ScenarioInputs)
      } catch {
        return null
      }
    }

    // On the very first render with complete data, compute immediately
    // with no debounce so the user sees results right away.
    if (isFirstRun.current) {
      isFirstRun.current = false
      setModelOutput(safeRunModel())
      return
    }

    // For subsequent changes, debounce to avoid thrashing during rapid input.
    setIsComputing(true)

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setModelOutput(safeRunModel())
      setIsComputing(false)
      timerRef.current = null
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [formValues, isReady])

  return { modelOutput, isComputing, isReady, filledCount, totalRequired }
}
