import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { scenarioInputsSchema } from '@/schemas/scenarioInputs'
import type { ScenarioInputs } from '@/engine/types'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { DesktopLayout } from '@/components/DesktopLayout'
import { MobileLayout } from '@/components/MobileLayout'
import { InputAccordion } from '@/components/InputAccordion'
import { Button } from '@/components/ui/button'

function App() {
  const { initialValues, save, resetToDefaults } = useFormPersistence()

  const methods = useForm<ScenarioInputs>({
    resolver: zodResolver(scenarioInputsSchema),
    defaultValues: initialValues,
  })

  const isDesktop = useMediaQuery(768)

  // Persist form values to localStorage on every change (debounced in save)
  useEffect(() => {
    const subscription = methods.watch((values) => {
      save(values as ScenarioInputs)
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

  const resultsContent = (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <p>Results will appear here once the financial engine is wired up.</p>
    </div>
  )

  return (
    <FormProvider {...methods}>
      {isDesktop ? (
        <DesktopLayout inputs={inputsContent} results={resultsContent} />
      ) : (
        <MobileLayout inputs={inputsContent} results={resultsContent} />
      )}
    </FormProvider>
  )
}

export default App
