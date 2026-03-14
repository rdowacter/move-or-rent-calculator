// ---------------------------------------------------------------------------
// ScenarioModelProvider.tsx — React context provider that makes the
// financial model output available to any descendant component.
//
// Sits between FormProvider and the layout components in the component tree.
// Uses useScenarioModel() internally and exposes the result via context,
// so individual result components can consume model output without prop drilling.
// ---------------------------------------------------------------------------

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import {
  useScenarioModel,
  type UseScenarioModelResult,
} from '@/hooks/useScenarioModel'

const ScenarioModelContext = createContext<UseScenarioModelResult | null>(null)

interface ScenarioModelProviderProps {
  children: ReactNode
}

/**
 * Provider component that computes the financial model from form values
 * and makes the result available via useModelOutput().
 *
 * Must be rendered inside a react-hook-form FormProvider.
 */
export function ScenarioModelProvider({
  children,
}: ScenarioModelProviderProps) {
  const scenarioModel = useScenarioModel()

  return (
    <ScenarioModelContext.Provider value={scenarioModel}>
      {children}
    </ScenarioModelContext.Provider>
  )
}

/**
 * Consumer hook for accessing the financial model output.
 * Must be used inside a ScenarioModelProvider.
 *
 * @returns { modelOutput, isComputing } — the complete model output
 *   (null before first computation) and a loading flag.
 * @throws If called outside of a ScenarioModelProvider.
 */
export function useModelOutput(): UseScenarioModelResult {
  const context = useContext(ScenarioModelContext)
  if (context === null) {
    throw new Error(
      'useModelOutput must be used within a ScenarioModelProvider. ' +
        'Wrap your component tree with <ScenarioModelProvider>.'
    )
  }
  return context
}
