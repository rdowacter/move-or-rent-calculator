// ---------------------------------------------------------------------------
// ResultsGate.tsx — Gates the results panel behind required field validation.
//
// Shows a progress indicator until all required personal/financial fields
// are filled. Once ready, renders its children (the actual result sections).
// This prevents the engine from running with undefined/NaN values.
// On mobile, includes a button to switch back to the Inputs tab.
// ---------------------------------------------------------------------------

import { useModelOutput } from '@/components/ScenarioModelProvider'
import { useSwitchToInputs } from '@/components/MobileTabContext'
import { Button } from '@/components/ui/button'

interface ResultsGateProps {
  children: React.ReactNode
}

/**
 * Wrapper that only renders children when all required fields are filled.
 * When fields are missing, displays a progress bar showing completion status.
 * On mobile, includes a button to switch back to the Inputs tab.
 */
export function ResultsGate({ children }: ResultsGateProps) {
  const { isReady, filledCount, totalRequired } = useModelOutput()
  const switchToInputs = useSwitchToInputs()

  return (
    <>
      {!isReady && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Fill in your details to see your analysis
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {filledCount} of {totalRequired} required fields completed
          </p>
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(filledCount / totalRequired) * 100}%` }}
            />
          </div>
          {switchToInputs && (
            <Button variant="outline" size="sm" onClick={switchToInputs}>
              Go to Inputs
            </Button>
          )}
        </div>
      )}
      {/* Always render children so hooks are called consistently.
          Hide visually when not ready to prevent layout shift. */}
      <div className={isReady ? undefined : 'hidden'}>
        {children}
      </div>
    </>
  )
}
