import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import type { ReactNode } from 'react'
import type { ScenarioInputs } from '@/engine/types'
import { defaultValues } from '@/schemas/scenarioInputs'
import { useScenarioModel } from '../useScenarioModel'
import {
  ScenarioModelProvider,
  useModelOutput,
} from '@/components/ScenarioModelProvider'

/**
 * Test wrapper that provides a FormProvider with default values,
 * matching the App.tsx setup.
 */
function createFormWrapper() {
  function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ScenarioInputs>({
      defaultValues,
    })
    return <FormProvider {...methods}>{children}</FormProvider>
  }
  return Wrapper
}

/**
 * Test wrapper that provides both FormProvider and ScenarioModelProvider,
 * matching the full App.tsx provider tree.
 */
function createFullWrapper() {
  function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ScenarioInputs>({
      defaultValues,
    })
    return (
      <FormProvider {...methods}>
        <ScenarioModelProvider>{children}</ScenarioModelProvider>
      </FormProvider>
    )
  }
  return Wrapper
}

describe('useScenarioModel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns modelOutput with baseline, scenarioA, scenarioB for valid default inputs', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScenarioModel(), {
      wrapper: createFormWrapper(),
    })

    // Flush the initial immediate computation
    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.modelOutput).not.toBeNull()
    expect(result.current.modelOutput!.baseline).toBeDefined()
    expect(result.current.modelOutput!.scenarioA).toBeDefined()
    expect(result.current.modelOutput!.scenarioB).toBeDefined()
  })

  it('has an isComputing flag in the return value', () => {
    const { result } = renderHook(() => useScenarioModel(), {
      wrapper: createFormWrapper(),
    })

    expect(result.current).toHaveProperty('isComputing')
    expect(typeof result.current.isComputing).toBe('boolean')
  })

  it('produces yearlySnapshots arrays with length matching timeHorizonYears', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScenarioModel(), {
      wrapper: createFormWrapper(),
    })

    act(() => {
      vi.runAllTimers()
    })

    const output = result.current.modelOutput!
    const expectedLength = defaultValues.projection.timeHorizonYears

    expect(output.baseline.yearlySnapshots).toHaveLength(expectedLength)
    expect(output.scenarioA.yearlySnapshots).toHaveLength(expectedLength)
    expect(output.scenarioB.yearlySnapshots).toHaveLength(expectedLength)
  })

  it('each scenario output has warnings, upfrontCapital, and dtiResult', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScenarioModel(), {
      wrapper: createFormWrapper(),
    })

    act(() => {
      vi.runAllTimers()
    })

    const output = result.current.modelOutput!

    for (const scenario of [
      output.baseline,
      output.scenarioA,
      output.scenarioB,
    ]) {
      expect(scenario.warnings).toBeDefined()
      expect(Array.isArray(scenario.warnings)).toBe(true)
      expect(scenario.upfrontCapital).toBeDefined()
      expect(scenario.upfrontCapital).toHaveProperty('totalCashNeeded')
      expect(scenario.upfrontCapital).toHaveProperty('cashAvailable')
      expect(scenario.upfrontCapital).toHaveProperty('surplus')
      expect(scenario.dtiResult).toBeDefined()
      expect(scenario.dtiResult).toHaveProperty('frontEndDTI')
      expect(scenario.dtiResult).toHaveProperty('backEndDTI')
      expect(scenario.dtiResult).toHaveProperty('passesLenderThreshold')
    }
  })
})

describe('ScenarioModelProvider + useModelOutput', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('provides modelOutput and isComputing via context', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useModelOutput(), {
      wrapper: createFullWrapper(),
    })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.modelOutput).not.toBeNull()
    expect(result.current.modelOutput!.baseline).toBeDefined()
    expect(typeof result.current.isComputing).toBe('boolean')
  })

  it('throws if useModelOutput is used outside ScenarioModelProvider', () => {
    // Suppress console.error for the expected React error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useModelOutput(), {
        wrapper: createFormWrapper(), // No ScenarioModelProvider
      })
    }).toThrow()

    spy.mockRestore()
  })
})
