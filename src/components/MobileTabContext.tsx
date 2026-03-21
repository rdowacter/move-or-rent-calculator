import { createContext, useContext } from 'react'

/**
 * Context for programmatic mobile tab switching.
 * Allows child components (like ResultsGate) to switch back to the Inputs tab.
 * Only provided by MobileLayout — on desktop this context is null.
 */
const MobileTabContext = createContext<(() => void) | null>(null)

export const MobileTabProvider = MobileTabContext.Provider

/**
 * Returns a function to switch to the Inputs tab, or null on desktop.
 */
export function useSwitchToInputs(): (() => void) | null {
  return useContext(MobileTabContext)
}
