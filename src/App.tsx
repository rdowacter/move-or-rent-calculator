import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { scenarioInputsSchema } from '@/schemas/scenarioInputs'
import type { ScenarioInputs } from '@/engine/types'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ScenarioModelProvider } from '@/components/ScenarioModelProvider'
import { DesktopLayout } from '@/components/DesktopLayout'
import { MobileLayout } from '@/components/MobileLayout'
import { InputAccordion } from '@/components/InputAccordion'
import { ResultsSections } from '@/components/results/ResultsSections'
import { Button } from '@/components/ui/button'

function App() {
  const { initialValues, save, resetToDefaults } = useFormPersistence()

  const methods = useForm<ScenarioInputs>({
    resolver: zodResolver(scenarioInputsSchema),
    defaultValues: initialValues,
  })

  const isDesktop = useMediaQuery(768)

  // Persist form values to localStorage on every change (debounced in save).
  // Use getValues() instead of watch() callback values because watch() emits
  // DeepPartial where cleared fields are undefined, which fails zod validation
  // on reload. getValues() returns the complete current form state.
  useEffect(() => {
    const subscription = methods.watch(() => {
      save(methods.getValues())
    })
    return () => subscription.unsubscribe()
  }, [methods, save])

  const inputsContent = (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-xl font-bold text-foreground">
          Move or Rent Calculator
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const defaults = resetToDefaults()
            methods.reset(defaults)
          }}
        >
          Reset to Defaults
        </Button>
      </div>
      <InputAccordion />
    </div>
  )

  const resultsContent = <ResultsSections />

  return (
    <FormProvider {...methods}>
      <ScenarioModelProvider>
        {isDesktop ? (
          <DesktopLayout inputs={inputsContent} results={resultsContent} />
        ) : (
          <MobileLayout inputs={inputsContent} results={resultsContent} />
        )}
      </ScenarioModelProvider>
    </FormProvider>
  )
}

export default App
