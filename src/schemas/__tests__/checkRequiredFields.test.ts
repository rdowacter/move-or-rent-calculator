// ---------------------------------------------------------------------------
// checkRequiredFields.test.ts — Tests for the required field validation gate
//
// This function prevents the engine from running with undefined/NaN values.
// If it incorrectly reports isReady: true, the engine will produce NaN results.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  checkRequiredFields,
  REQUIRED_FIELDS,
  formDefaultValues,
  defaultValues,
} from '../scenarioInputs'

describe('checkRequiredFields', () => {
  it('returns isReady: true when all required fields are filled', () => {
    const result = checkRequiredFields(defaultValues)
    expect(result.isReady).toBe(true)
    expect(result.filledCount).toBe(result.totalRequired)
  })

  it('returns isReady: false when all personal fields are blank', () => {
    const result = checkRequiredFields(formDefaultValues)
    expect(result.isReady).toBe(false)
    expect(result.filledCount).toBe(0)
  })

  it('totalRequired matches REQUIRED_FIELDS length', () => {
    const result = checkRequiredFields({})
    expect(result.totalRequired).toBe(REQUIRED_FIELDS.length)
  })

  it('counts 0 as a filled value (not missing)', () => {
    // A user might legitimately enter 0 for some fields (e.g. liquid savings)
    const values = { ...structuredClone(defaultValues), personal: { ...defaultValues.personal, liquidSavings: 0 } }
    const result = checkRequiredFields(values)
    expect(result.isReady).toBe(true)
  })

  it('counts NaN as missing', () => {
    const values = structuredClone(defaultValues)
    values.personal.annualGrossIncome = NaN
    const result = checkRequiredFields(values)
    expect(result.isReady).toBe(false)
    expect(result.filledCount).toBe(REQUIRED_FIELDS.length - 1)
  })

  it('counts null as missing', () => {
    const values = structuredClone(defaultValues) as unknown as Record<string, unknown>
    ;(values.personal as Record<string, unknown>).annualGrossIncome = null
    const result = checkRequiredFields(values)
    expect(result.isReady).toBe(false)
  })

  it('handles completely empty input', () => {
    const result = checkRequiredFields({})
    expect(result.isReady).toBe(false)
    expect(result.filledCount).toBe(0)
  })

  it('handles null input', () => {
    const result = checkRequiredFields(null)
    expect(result.isReady).toBe(false)
    expect(result.filledCount).toBe(0)
  })

  it('correctly counts partially filled fields', () => {
    // Fill only the first 5 required fields
    const values = structuredClone(formDefaultValues) as Record<string, Record<string, unknown>>
    values.personal.annualGrossIncome = 100_000
    values.personal.filingStatus = 'single'
    values.personal.liquidSavings = 10_000
    values.personal.monthlyLivingExpenses = 3_000
    values.personal.monthlyDebtPayments = 500
    const result = checkRequiredFields(values)
    expect(result.filledCount).toBe(5)
    expect(result.isReady).toBe(false)
  })
})

describe('REQUIRED_FIELDS consistency with formDefaultValues', () => {
  it('every undefined field in formDefaultValues has a REQUIRED_FIELDS entry', () => {
    // Walk formDefaultValues and collect all paths that are undefined
    const undefinedPaths: string[] = []

    for (const [section, fields] of Object.entries(formDefaultValues)) {
      if (typeof fields !== 'object' || fields === null) continue
      for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
        if (value === undefined) {
          undefinedPaths.push(`${section}.${field}`)
        }
      }
    }

    // Every undefined path should be in REQUIRED_FIELDS
    for (const path of undefinedPaths) {
      expect(REQUIRED_FIELDS).toContain(path)
    }

    // Every REQUIRED_FIELDS entry should be undefined in formDefaultValues
    for (const path of REQUIRED_FIELDS) {
      const [section, field] = path.split('.')
      const value = (formDefaultValues as Record<string, Record<string, unknown>>)[section]?.[field]
      expect(value).toBeUndefined()
    }
  })

  it('REQUIRED_FIELDS count matches undefined fields in formDefaultValues', () => {
    let undefinedCount = 0
    for (const fields of Object.values(formDefaultValues)) {
      if (typeof fields !== 'object' || fields === null) continue
      for (const value of Object.values(fields as Record<string, unknown>)) {
        if (value === undefined) undefinedCount++
      }
    }
    expect(REQUIRED_FIELDS.length).toBe(undefinedCount)
  })
})
