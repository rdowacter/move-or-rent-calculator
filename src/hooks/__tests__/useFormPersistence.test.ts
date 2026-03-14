import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormPersistence } from '../useFormPersistence'
import { defaultValues } from '@/schemas/scenarioInputs'

const STORAGE_KEY = 'scenario-inputs'

/**
 * Create a mock localStorage that we can fully control.
 * jsdom's localStorage implementation doesn't support vi.spyOn, so we
 * replace the entire object with a mock for these tests.
 */
function createMockStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

describe('useFormPersistence', () => {
  let mockStorage: ReturnType<typeof createMockStorage>
  let originalLocalStorage: Storage

  beforeEach(() => {
    mockStorage = createMockStorage()
    originalLocalStorage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns default values when localStorage is empty', () => {
    const { result } = renderHook(() => useFormPersistence())

    expect(result.current.initialValues).toEqual(defaultValues)
    expect(mockStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  it('returns saved values when localStorage has valid data', () => {
    const savedValues = {
      ...defaultValues,
      personal: {
        ...defaultValues.personal,
        age: 42,
        annualGrossIncome: 150_000,
      },
    }
    mockStorage.getItem.mockReturnValue(JSON.stringify(savedValues))

    const { result } = renderHook(() => useFormPersistence())

    expect(result.current.initialValues).toEqual(savedValues)
    expect(result.current.initialValues.personal.age).toBe(42)
    expect(result.current.initialValues.personal.annualGrossIncome).toBe(150_000)
  })

  it('falls back to defaults when localStorage has invalid JSON', () => {
    mockStorage.getItem.mockReturnValue('not valid json {{{')

    const { result } = renderHook(() => useFormPersistence())

    expect(result.current.initialValues).toEqual(defaultValues)
  })

  it('falls back to defaults when localStorage has valid JSON but invalid schema', () => {
    const invalidData = {
      personal: { age: 'not a number' },
    }
    mockStorage.getItem.mockReturnValue(JSON.stringify(invalidData))

    const { result } = renderHook(() => useFormPersistence())

    expect(result.current.initialValues).toEqual(defaultValues)
  })

  it('falls back to defaults when localStorage throws an error', () => {
    mockStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage is not available')
    })

    const { result } = renderHook(() => useFormPersistence())

    expect(result.current.initialValues).toEqual(defaultValues)
  })

  it('writes values to localStorage when save is called (debounced 500ms)', () => {
    const { result } = renderHook(() => useFormPersistence())

    const updatedValues = {
      ...defaultValues,
      personal: {
        ...defaultValues.personal,
        age: 40,
      },
    }

    act(() => {
      result.current.save(updatedValues)
    })

    // Should NOT have written yet (debounced)
    expect(mockStorage.setItem).not.toHaveBeenCalled()

    // Advance timers past the debounce window
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(updatedValues)
    )
  })

  it('debounces multiple rapid save calls', () => {
    const { result } = renderHook(() => useFormPersistence())

    const values1 = { ...defaultValues, personal: { ...defaultValues.personal, age: 38 } }
    const values2 = { ...defaultValues, personal: { ...defaultValues.personal, age: 39 } }
    const values3 = { ...defaultValues, personal: { ...defaultValues.personal, age: 40 } }

    act(() => {
      result.current.save(values1)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.save(values2)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.save(values3)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Only the last value should have been saved, and only once
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(values3)
    )
  })

  it('resetToDefaults clears localStorage and returns defaults', () => {
    const { result } = renderHook(() => useFormPersistence())

    let resetResult: typeof defaultValues | undefined
    act(() => {
      resetResult = result.current.resetToDefaults()
    })

    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(resetResult).toEqual(defaultValues)
  })
})
