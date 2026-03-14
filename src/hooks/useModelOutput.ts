// ---------------------------------------------------------------------------
// useModelOutput.ts — Hook to consume scenario model output from context
//
// Separated from ScenarioModelProvider to satisfy react-refresh lint rule
// (files with components must only export components).
// ---------------------------------------------------------------------------

import { useContext } from 'react'
import {
  ScenarioModelContext,
  type ScenarioModelContextValue,
} from '@/hooks/ScenarioModelContext'

/**
 * Hook to consume the model output from ScenarioModelProvider.
 * Returns { modelOutput } which may be null if no inputs have been provided.
 */
export function useModelOutput(): ScenarioModelContextValue {
  return useContext(ScenarioModelContext)
}
