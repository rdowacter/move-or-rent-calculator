// ---------------------------------------------------------------------------
// scenarioInputs.test.ts — Tests for the zod validation schema
//
// These tests verify that the zod schema correctly validates all ~60 input
// fields, rejects invalid values, and produces output matching the
// ScenarioInputs TypeScript interface from the engine.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { scenarioInputsSchema, defaultValues } from '../scenarioInputs'
import type { ScenarioInputs } from '../../engine/types'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '../../engine/constants'

describe('scenarioInputsSchema', () => {
  // ---- Happy Path: Default values pass validation -------------------------

  describe('default values', () => {
    it('should validate the assembled defaultValues object', () => {
      const result = scenarioInputsSchema.safeParse(defaultValues)
      expect(result.success).toBe(true)
    })

    it('should validate a manually assembled ScenarioInputs from DEFAULT_* constants', () => {
      const input: ScenarioInputs = {
        personal: DEFAULT_PERSONAL_INPUTS,
        retirement: DEFAULT_RETIREMENT_INPUTS,
        currentHome: DEFAULT_CURRENT_HOME_INPUTS,
        newHome: DEFAULT_NEW_HOME_INPUTS,
        commute: DEFAULT_COMMUTE_INPUTS,
        costs: DEFAULT_COST_INPUTS,
        projection: DEFAULT_PROJECTION_INPUTS,
      }
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should produce output matching the ScenarioInputs type shape', () => {
      const result = scenarioInputsSchema.safeParse(defaultValues)
      expect(result.success).toBe(true)
      if (!result.success) return

      const data = result.data

      // Verify all top-level sections exist
      expect(data).toHaveProperty('personal')
      expect(data).toHaveProperty('retirement')
      expect(data).toHaveProperty('currentHome')
      expect(data).toHaveProperty('newHome')
      expect(data).toHaveProperty('commute')
      expect(data).toHaveProperty('costs')
      expect(data).toHaveProperty('projection')

      // Spot-check field types
      expect(typeof data.personal.age).toBe('number')
      expect(typeof data.personal.filingStatus).toBe('string')
      expect(typeof data.retirement.hasEmployerMatch).toBe('boolean')
      expect(typeof data.retirement.iraType).toBe('string')
    })
  })

  // ---- Personal Inputs Validation -----------------------------------------

  describe('personal inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject age below 18', () => {
      const input = validInput()
      input.personal.age = 17
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject age above 80', () => {
      const input = validInput()
      input.personal.age = 81
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept age at boundary values (18 and 80)', () => {
      const input18 = validInput()
      input18.personal.age = 18
      expect(scenarioInputsSchema.safeParse(input18).success).toBe(true)

      const input80 = validInput()
      input80.personal.age = 80
      expect(scenarioInputsSchema.safeParse(input80).success).toBe(true)
    })

    it('should reject negative annual income', () => {
      const input = validInput()
      input.personal.annualGrossIncome = -1
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept zero annual income', () => {
      const input = validInput()
      input.personal.annualGrossIncome = 0
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject salary growth rate above 1 (100%)', () => {
      const input = validInput()
      input.personal.annualSalaryGrowthRate = 1.01
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject negative salary growth rate', () => {
      const input = validInput()
      input.personal.annualSalaryGrowthRate = -0.01
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject invalid filing status', () => {
      const input = validInput()
      ;(input.personal as unknown as Record<string, unknown>).filingStatus = 'invalid_status'
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept all valid filing statuses', () => {
      const statuses = [
        'single',
        'married_filing_jointly',
        'married_filing_separately',
        'head_of_household',
      ] as const
      for (const status of statuses) {
        const input = validInput()
        input.personal.filingStatus = status
        expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
      }
    })

    it('should reject negative state income tax rate', () => {
      const input = validInput()
      input.personal.stateIncomeTaxRate = -0.01
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject state income tax rate above 1', () => {
      const input = validInput()
      input.personal.stateIncomeTaxRate = 1.01
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept zero state income tax rate (e.g. Texas)', () => {
      const input = validInput()
      input.personal.stateIncomeTaxRate = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative monthly living expenses', () => {
      const input = validInput()
      input.personal.monthlyLivingExpenses = -100
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero monthly debt payments', () => {
      const input = validInput()
      input.personal.monthlyDebtPayments = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative monthly debt payments', () => {
      const input = validInput()
      input.personal.monthlyDebtPayments = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative liquid savings', () => {
      const input = validInput()
      input.personal.liquidSavings = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero liquid savings', () => {
      const input = validInput()
      input.personal.liquidSavings = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })
  })

  // ---- Retirement Inputs Validation ---------------------------------------

  describe('retirement inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject negative IRA balance', () => {
      const input = validInput()
      input.retirement.iraBalance = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero IRA balance', () => {
      const input = validInput()
      input.retirement.iraBalance = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject invalid IRA type', () => {
      const input = validInput()
      ;(input.retirement as unknown as Record<string, unknown>).iraType = 'rollover'
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept both traditional and roth IRA types', () => {
      const input1 = validInput()
      input1.retirement.iraType = 'traditional'
      expect(scenarioInputsSchema.safeParse(input1).success).toBe(true)

      const input2 = validInput()
      input2.retirement.iraType = 'roth'
      expect(scenarioInputsSchema.safeParse(input2).success).toBe(true)
    })

    it('should reject negative expected annual return', () => {
      const input = validInput()
      input.retirement.iraExpectedAnnualReturn = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject expected annual return above 1', () => {
      const input = validInput()
      input.retirement.iraExpectedAnnualReturn = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative IRA contributions', () => {
      const input = validInput()
      input.retirement.annualIRAContributionScenarioA = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero IRA contributions (Scenario B default)', () => {
      const input = validInput()
      input.retirement.annualIRAContributionScenarioB = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative employer match percentage', () => {
      const input = validInput()
      input.retirement.employerMatchPercentage = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject employer match percentage above 1', () => {
      const input = validInput()
      input.retirement.employerMatchPercentage = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative other retirement balance', () => {
      const input = validInput()
      input.retirement.otherRetirementBalance = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })
  })

  // ---- Current Home Inputs Validation -------------------------------------

  describe('currentHome inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject negative home value', () => {
      const input = validInput()
      input.currentHome.homeValue = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative mortgage balance', () => {
      const input = validInput()
      input.currentHome.mortgageBalance = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero mortgage balance (paid off home)', () => {
      const input = validInput()
      input.currentHome.mortgageBalance = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative interest rate', () => {
      const input = validInput()
      input.currentHome.interestRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject interest rate above 1', () => {
      const input = validInput()
      input.currentHome.interestRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero interest rate (0% mortgage edge case)', () => {
      const input = validInput()
      input.currentHome.interestRate = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject loan term below 1 year', () => {
      const input = validInput()
      input.currentHome.originalLoanTermYears = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject loan term above 40 years', () => {
      const input = validInput()
      input.currentHome.originalLoanTermYears = 41
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative years into loan', () => {
      const input = validInput()
      input.currentHome.yearsIntoLoan = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero years into loan (brand new mortgage)', () => {
      const input = validInput()
      input.currentHome.yearsIntoLoan = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative vacancy rate', () => {
      const input = validInput()
      input.currentHome.vacancyRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject vacancy rate above 1', () => {
      const input = validInput()
      input.currentHome.vacancyRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative selling costs rate', () => {
      const input = validInput()
      input.currentHome.sellingCostsRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject selling costs rate above 1', () => {
      const input = validInput()
      input.currentHome.sellingCostsRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative property management fee rate', () => {
      const input = validInput()
      input.currentHome.propertyManagementFeeRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero property management fee rate (self-managed)', () => {
      const input = validInput()
      input.currentHome.propertyManagementFeeRate = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative tenant turnover frequency', () => {
      const input = validInput()
      input.currentHome.tenantTurnoverFrequencyYears = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative cost per turnover', () => {
      const input = validInput()
      input.currentHome.costPerTurnover = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative monthly HOA', () => {
      const input = validInput()
      input.currentHome.monthlyHOA = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero monthly HOA', () => {
      const input = validInput()
      input.currentHome.monthlyHOA = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative expected monthly rent', () => {
      const input = validInput()
      input.currentHome.expectedMonthlyRent = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative annual appreciation rate', () => {
      const input = validInput()
      input.currentHome.annualAppreciationRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject annual appreciation rate above 1', () => {
      const input = validInput()
      input.currentHome.annualAppreciationRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })
  })

  // ---- New Home Inputs Validation -----------------------------------------

  describe('newHome inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject negative purchase price', () => {
      const input = validInput()
      input.newHome.purchasePrice = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative interest rate', () => {
      const input = validInput()
      input.newHome.interestRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject interest rate above 1', () => {
      const input = validInput()
      input.newHome.interestRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject loan term below 1 year', () => {
      const input = validInput()
      input.newHome.loanTermYears = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject loan term above 40 years', () => {
      const input = validInput()
      input.newHome.loanTermYears = 41
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative down payment percentages', () => {
      const input = validInput()
      input.newHome.downPaymentPercentScenarioA = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject down payment percentage above 1', () => {
      const input = validInput()
      input.newHome.downPaymentPercentScenarioA = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative PMI rate', () => {
      const input = validInput()
      input.newHome.annualPMIRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject PMI rate above 1', () => {
      const input = validInput()
      input.newHome.annualPMIRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative closing costs rate', () => {
      const input = validInput()
      input.newHome.closingCostsRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject closing costs rate above 1', () => {
      const input = validInput()
      input.newHome.closingCostsRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative annual insurance', () => {
      const input = validInput()
      input.newHome.annualInsurance = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative annual appreciation rate', () => {
      const input = validInput()
      input.newHome.annualAppreciationRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })
  })

  // ---- Commute Inputs Validation ------------------------------------------

  describe('commute inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject negative round trip miles', () => {
      const input = validInput()
      input.commute.currentRoundTripMiles = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero round trip miles (remote work)', () => {
      const input = validInput()
      input.commute.currentRoundTripMiles = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative work days per year', () => {
      const input = validInput()
      input.commute.workDaysPerYear = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject work days per year above 366', () => {
      const input = validInput()
      input.commute.workDaysPerYear = 367
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative IRS mileage rate', () => {
      const input = validInput()
      input.commute.irsMileageRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative monthly tolls', () => {
      const input = validInput()
      input.commute.currentMonthlyTolls = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero monthly tolls', () => {
      const input = validInput()
      input.commute.newMonthlyTolls = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative commute time saved', () => {
      const input = validInput()
      input.commute.commuteTimeSavedPerDayHours = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative landlord hours per month', () => {
      const input = validInput()
      input.commute.landlordHoursPerMonth = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })
  })

  // ---- Cost Inputs Validation ---------------------------------------------

  describe('cost inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject negative moving costs', () => {
      const input = validInput()
      input.costs.movingCosts = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero moving costs', () => {
      const input = validInput()
      input.costs.movingCosts = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })

    it('should reject negative insurance escalation rate', () => {
      const input = validInput()
      input.costs.insuranceEscalationRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject insurance escalation rate above 1', () => {
      const input = validInput()
      input.costs.insuranceEscalationRate = 1.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative property tax escalation rate', () => {
      const input = validInput()
      input.costs.propertyTaxEscalationRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative general inflation rate', () => {
      const input = validInput()
      input.costs.generalInflationRate = -0.01
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative additional tax prep cost', () => {
      const input = validInput()
      input.costs.additionalTaxPrepCost = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject negative umbrella insurance cost', () => {
      const input = validInput()
      input.costs.umbrellaInsuranceAnnualCost = -1
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept zero umbrella insurance cost', () => {
      const input = validInput()
      input.costs.umbrellaInsuranceAnnualCost = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(true)
    })
  })

  // ---- Projection Inputs Validation ---------------------------------------

  describe('projection inputs', () => {
    const validInput = () => structuredClone(defaultValues)

    it('should reject time horizon below 1 year', () => {
      const input = validInput()
      input.projection.timeHorizonYears = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject time horizon above 30 years', () => {
      const input = validInput()
      input.projection.timeHorizonYears = 31
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should accept time horizon at boundaries (1 and 30)', () => {
      const input1 = validInput()
      input1.projection.timeHorizonYears = 1
      expect(scenarioInputsSchema.safeParse(input1).success).toBe(true)

      const input30 = validInput()
      input30.projection.timeHorizonYears = 30
      expect(scenarioInputsSchema.safeParse(input30).success).toBe(true)
    })

    it('should reject planned rental exit year below 1', () => {
      const input = validInput()
      input.projection.plannedRentalExitYear = 0
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })

    it('should reject planned rental exit year above 30', () => {
      const input = validInput()
      input.projection.plannedRentalExitYear = 31
      expect(scenarioInputsSchema.safeParse(input).success).toBe(false)
    })
  })

  // ---- Missing / Extra Fields ---------------------------------------------

  describe('structural validation', () => {
    it('should reject input with missing sections', () => {
      const input = { personal: DEFAULT_PERSONAL_INPUTS }
      const result = scenarioInputsSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject completely empty input', () => {
      const result = scenarioInputsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject non-object input', () => {
      const result = scenarioInputsSchema.safeParse('not an object')
      expect(result.success).toBe(false)
    })

    it('should reject null input', () => {
      const result = scenarioInputsSchema.safeParse(null)
      expect(result.success).toBe(false)
    })
  })

  // ---- defaultValues export -----------------------------------------------

  describe('defaultValues export', () => {
    it('should match the assembled DEFAULT_* constants from the engine', () => {
      expect(defaultValues.personal).toEqual(DEFAULT_PERSONAL_INPUTS)
      expect(defaultValues.retirement).toEqual(DEFAULT_RETIREMENT_INPUTS)
      expect(defaultValues.currentHome).toEqual(DEFAULT_CURRENT_HOME_INPUTS)
      expect(defaultValues.newHome).toEqual(DEFAULT_NEW_HOME_INPUTS)
      expect(defaultValues.commute).toEqual(DEFAULT_COMMUTE_INPUTS)
      expect(defaultValues.costs).toEqual(DEFAULT_COST_INPUTS)
      expect(defaultValues.projection).toEqual(DEFAULT_PROJECTION_INPUTS)
    })
  })
})
