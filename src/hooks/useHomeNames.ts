// ---------------------------------------------------------------------------
// useHomeNames.ts — Reads user-configurable home names from form state
//
// Returns the home names with fallback defaults. Used by any component that
// needs to display home-specific labels (accordion titles, chart legends,
// table headers, breakdown sections).
// ---------------------------------------------------------------------------

import { useWatch } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'

interface HomeNames {
  currentHomeName: string
  newHomeName: string
}

/**
 * Reads the user's home names from react-hook-form state.
 * Returns "Current Home" / "New Home" as fallbacks if names are empty or
 * the form hasn't hydrated yet.
 *
 * Must be used inside a react-hook-form FormProvider.
 */
export function useHomeNames(): HomeNames {
  const currentHomeName = useWatch<ScenarioInputs, 'homeNames.currentHomeName'>({
    name: 'homeNames.currentHomeName',
  }) || 'Current Home'

  const newHomeName = useWatch<ScenarioInputs, 'homeNames.newHomeName'>({
    name: 'homeNames.newHomeName',
  }) || 'New Home'

  return { currentHomeName, newHomeName }
}
