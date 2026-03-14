import type { ReactNode } from "react"

interface DesktopLayoutProps {
  /** The input panel content (left column, ~40% width) */
  inputs: ReactNode
  /** The results panel content (right column, ~60% width) */
  results: ReactNode
}

/**
 * Two-column desktop layout for viewports >= 768px.
 * Left column (~40%) contains the input accordion panel.
 * Right column (~60%) contains live-updating results.
 * Both columns scroll independently so the user can reference inputs
 * while viewing results without losing their scroll position.
 */
export function DesktopLayout({ inputs, results }: DesktopLayoutProps) {
  return (
    <div className="grid h-screen grid-cols-[2fr_3fr]">
      <div className="overflow-y-auto border-r border-border p-4">
        {inputs}
      </div>
      <div className="overflow-y-auto p-4">
        {results}
      </div>
    </div>
  )
}
