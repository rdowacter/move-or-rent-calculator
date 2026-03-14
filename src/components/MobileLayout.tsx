import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MobileLayoutProps {
  /** The input panel content */
  inputs: ReactNode
  /** The results panel content */
  results: ReactNode
}

/**
 * Full-width mobile layout for viewports < 768px.
 * Uses tabs to switch between the Inputs view and the Results view,
 * since there isn't enough horizontal space for a side-by-side layout.
 * The Inputs tab is shown by default so the user starts by entering data.
 */
export function MobileLayout({ inputs, results }: MobileLayoutProps) {
  return (
    <Tabs defaultValue="inputs" className="w-full">
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
  )
}
