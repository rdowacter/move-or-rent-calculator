// ---------------------------------------------------------------------------
// useScenarioModel.ts — Bridge between react-hook-form state and the
// financial calculation engine.
//
// Watches all form values via useWatch(), debounces changes (150ms),
// and calls runModel() to produce year-by-year scenario projections.
// The engine is synchronous and runs in microseconds, so no async handling
// is needed — the debounce exists only to avoid thrashing on rapid keystrokes.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react'
import { useWatch } from 'react-hook-form'
import type { ScenarioInputs, ModelOutput } from '@/engine/types'
import { runModel } from '@/engine/scenarios'

/** Debounce delay in milliseconds — prevents recalculation on every keystroke. */
const DEBOUNCE_MS = 150

export interface UseScenarioModelResult {
  /** The complete model output, or null before the first computation. */
  modelOutput: ModelOutput | null
  /** True while waiting for the debounce timer to fire after an input change. */
  isComputing: boolean
}

/**
 * Hook that watches all form values and runs the financial model engine
 * whenever inputs change (debounced at 150ms).
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

  useEffect(() => {
    // On the very first render, compute immediately with no debounce
    // so the user sees results as soon as the page loads.
    if (isFirstRun.current) {
      isFirstRun.current = false
      const output = runModel(formValues as ScenarioInputs)
      setModelOutput(output)
      return
    }

    // For subsequent changes, debounce to avoid thrashing during rapid input.
    setIsComputing(true)

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const output = runModel(formValues as ScenarioInputs)
      setModelOutput(output)
      setIsComputing(false)
      timerRef.current = null
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [formValues])

  return { modelOutput, isComputing }
}
