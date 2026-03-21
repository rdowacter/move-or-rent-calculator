import { useState, useCallback, type ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileTabProvider } from "@/components/MobileTabContext"
import { Footer } from "@/components/Footer"

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
      <div className="flex flex-col h-screen">
        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="inputs" className="p-4 overflow-y-auto">
              {inputs}
            </TabsContent>
            <TabsContent value="results" className="p-4 overflow-y-auto">
              {results}
            </TabsContent>
          </Tabs>
        </div>

        <Footer />
      </div>
    </MobileTabProvider>
  )
}
