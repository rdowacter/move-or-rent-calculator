import { useState, useCallback, type ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileTabProvider } from "@/components/MobileTabContext"

interface MobileLayoutProps {
  /** The input panel content */
  inputs: ReactNode
  /** The results panel content */
  results: ReactNode
}

/**
 * Full-width mobile layout for viewports < 768px.
 * Uses controlled tabs to switch between the Inputs view and the Results view.
 * Provides a context so child components (like ResultsGate) can
 * programmatically switch back to the Inputs tab.
 */
export function MobileLayout({ inputs, results }: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<string | number | null>("inputs")

  const switchToInputs = useCallback(() => {
    setActiveTab("inputs")
  }, [])

  return (
    <MobileTabProvider value={switchToInputs}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="inputs" className="p-4">
          {inputs}
        </TabsContent>
        <TabsContent value="results" className="p-4">
          {results}
        </TabsContent>
      </Tabs>
    </MobileTabProvider>
  )
}
