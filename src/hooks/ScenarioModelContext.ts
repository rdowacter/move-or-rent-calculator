// ---------------------------------------------------------------------------
// ScenarioModelContext.ts — React context definition for scenario model output
//
// Separated from ScenarioModelProvider to satisfy react-refresh lint rule
// (component files must only export components).
// ---------------------------------------------------------------------------

import { createContext } from 'react'
import type { ModelOutput } from '@/engine/types'

export interface ScenarioModelContextValue {
  modelOutput: ModelOutput | null
}

export const ScenarioModelContext = createContext<ScenarioModelContextValue>({
  modelOutput: null,
})
