import { useState } from "react"
import type { ReactNode } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"

interface DesktopLayoutProps {
  /** The input panel content (left column, ~40% width) */
  inputs: ReactNode
  /** The results panel content (right column, ~60% width) */
  results: ReactNode
}

/**
 * Two-column desktop layout for viewports >= 768px.
 * Left column (~40%) contains the input accordion panel and can be collapsed
 * to give the results panel full width.
 * Right column (~60%) contains live-updating results.
 * Both columns scroll independently so the user can reference inputs
 * while viewing results without losing their scroll position.
 */
export function DesktopLayout({ inputs, results }: DesktopLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 min-h-0">
        {/* Inputs column — collapses to 48px, expands to 40% */}
        <div
          className="flex-shrink-0 border-r border-border transition-all duration-300"
          style={{ width: collapsed ? "48px" : "40%" }}
        >
          <div className="flex h-full flex-col">
            {/* Collapse/expand toggle */}
            <div className={`flex ${collapsed ? "justify-center" : "justify-end"} p-2`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? "Show inputs" : "Hide inputs"}
                title={collapsed ? "Show inputs" : "Hide inputs"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Input content — hidden via overflow when collapsed */}
            <div
              className={`flex-1 overflow-hidden transition-opacity duration-300 ${
                collapsed ? "opacity-0" : "opacity-100 overflow-y-auto"
              }`}
            >
              <div className="p-4 pt-0">{inputs}</div>
            </div>
          </div>
        </div>

        {/* Results column — takes remaining space */}
        <div className="flex-1 overflow-y-auto p-4">
          {results}
        </div>
      </div>

      <Footer />
    </div>
  )
}
