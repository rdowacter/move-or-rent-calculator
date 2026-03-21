// ---------------------------------------------------------------------------
// scenarioInputs.ts — Zod validation schema for ScenarioInputs
//
// This schema mirrors the ScenarioInputs interface from engine/types.ts and
// adds min/max constraints for every field. It is used with react-hook-form
// + @hookform/resolvers/zod to validate all ~60 input fields in the UI.
//
// The schema has ZERO dependencies on React or the DOM — it can be used in
// tests, CLI scripts, or any other context.
// ---------------------------------------------------------------------------

import { z } from 'zod'
import type { ScenarioInputs } from '../engine/types'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
  DEFAULT_HOME_NAMES,
} from '../engine/constants'

// ---- Rate helper: a number between 0 and 1 (inclusive) --------------------
// Used for all percentage-as-decimal fields (interest rates, growth rates, etc.)
const rate = () => z.number().min(0).max(1)

// ---- Non-negative currency: >= 0 ------------------------------------------
const currency = () => z.number().min(0)

// ---- Sub-schemas ----------------------------------------------------------

const personalInputsSchema = z.object({
  /** Current age — used to determine early withdrawal penalty eligibility. */
  age: z.number().int().min(18).max(80),
  /** Annual gross income before taxes. */
  annualGrossIncome: currency(),
  /** Expected annual salary growth rate (e.g. 0.03 for 3%). */
  annualSalaryGrowthRate: rate(),
  /** IRS filing status — drives tax bracket selection. */
  filingStatus: z.enum([
    'single',
    'married_filing_jointly',
    'married_filing_separately',
    'head_of_household',
  ]),
  /** State income tax rate (0 for Texas). */
  stateIncomeTaxRate: rate(),
  /** Monthly non-housing living expenses (food, utilities, etc.). */
  monthlyLivingExpenses: currency(),
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  monthlyDebtPayments: currency(),
  /** Current liquid savings / cash on hand available for upfront costs. */
  liquidSavings: currency(),
})

const retirementInputsSchema = z.object({
  /** Current IRA balance. */
  iraBalance: currency(),
  /** IRA account type — determines tax treatment on withdrawal. */
  iraType: z.enum(['traditional', 'roth']),
  /** Expected annual return on IRA investments (e.g. 0.07 for 7%). */
  iraExpectedAnnualReturn: rate(),
  /** Annual IRA contribution in Scenario A (keep IRA intact). */
  annualIRAContributionScenarioA: currency(),
  /** Annual IRA contribution in Scenario B (IRA withdrawn). */
  annualIRAContributionScenarioB: currency(),
  /** Amount to withdraw from IRA in Scenario B. Defaults to full balance. */
  iraWithdrawalAmountScenarioB: currency(),
  /** Whether the user has an employer 401(k) with matching. */
  hasEmployerMatch: z.boolean(),
  /** Employer 401(k) match percentage (e.g. 0.03 for 3%). */
  employerMatchPercentage: rate(),
  /** Whether the user has other retirement savings beyond the IRA. */
  hasOtherRetirementSavings: z.boolean(),
  /** Balance of other retirement accounts. */
  otherRetirementBalance: currency(),
})

const currentHomeInputsSchema = z.object({
  /** Current estimated market value. */
  homeValue: currency(),
  /** Remaining mortgage principal balance. */
  mortgageBalance: currency(),
  /** Mortgage interest rate (e.g. 0.02 for 2%). */
  interestRate: rate(),
  /** Original loan term in years. */
  originalLoanTermYears: z.number().int().min(1).max(40),
  /** Number of years already into the loan. */
  yearsIntoLoan: z.number().int().min(0).max(40),
  /** Annual property tax rate as a fraction of assessed value (e.g. 0.0215). */
  annualPropertyTaxRate: rate(),
  /** Annual homeowners insurance premium in dollars. */
  annualInsurance: currency(),
  /**
   * Percentage increase in insurance when converting to landlord policy.
   * Landlord insurance is typically 15-25% more than homeowner insurance.
   */
  landlordInsurancePremiumIncrease: rate(),
  /**
   * Annual maintenance reserve as a fraction of home value (e.g. 0.0075).
   * Industry rule of thumb: 1% of home value/year; 0.75% is optimistic.
   */
  maintenanceReserveRate: rate(),
  /** Monthly HOA dues. */
  monthlyHOA: currency(),
  /** Expected monthly rent when used as a rental property. */
  expectedMonthlyRent: currency(),
  /** Annual rent growth rate (e.g. 0.03 for 3%). */
  annualRentGrowthRate: rate(),
  /**
   * Vacancy rate — fraction of the year the property is expected to be
   * unoccupied (e.g. 0.08 for 8%, roughly 1 month/year).
   */
  vacancyRate: rate(),
  /** Property management fee as a fraction of collected rent (e.g. 0.10). */
  propertyManagementFeeRate: rate(),
  /** Average number of years between tenant turnovers. */
  tenantTurnoverFrequencyYears: z.number().min(0),
  /** One-time cost per tenant turnover (cleaning, minor repairs, re-listing). */
  costPerTurnover: currency(),
  /** Selling costs as a fraction of sale price (agent commissions + closing). */
  sellingCostsRate: rate(),
  /** Expected annual home appreciation rate (e.g. 0.03 for 3%). */
  annualAppreciationRate: rate(),
  /** Percentage of home value attributable to land (not depreciable). Default 15%. */
  landValuePercentage: rate(),
  /** Percentage of rental income lenders credit toward DTI. 75% standard, 0% for new landlords. */
  rentalIncomeDTICreditRate: rate(),
})

const newHomeInputsSchema = z.object({
  /** Purchase price. */
  purchasePrice: currency(),
  /** Mortgage interest rate (e.g. 0.06 for 6%). */
  interestRate: rate(),
  /** Loan term in years. */
  loanTermYears: z.number().int().min(1).max(40),
  /**
   * Down payment percentage for Scenario A (sell current home, larger down payment).
   * E.g. 0.20 for 20%.
   */
  downPaymentPercentScenarioA: rate(),
  /**
   * Down payment percentage for Scenario B (keep current home as rental, smaller down payment).
   * E.g. 0.10 for 10%.
   */
  downPaymentPercentScenarioB: rate(),
  /**
   * Annual PMI rate as a fraction of the loan amount (e.g. 0.007 for 0.70%).
   * PMI is required when LTV exceeds 80% and auto-cancels at 78% LTV
   * per the Homeowners Protection Act of 1998.
   */
  annualPMIRate: rate(),
  /** Annual property tax rate as a fraction of assessed value. */
  annualPropertyTaxRate: rate(),
  /** Annual homeowners insurance premium in dollars. */
  annualInsurance: currency(),
  /** Buyer closing costs as a fraction of purchase price (e.g. 0.025 for 2.5%). */
  closingCostsRate: rate(),
  /** Expected annual home appreciation rate (e.g. 0.035 for 3.5%). */
  annualAppreciationRate: rate(),
})

const commuteInputsSchema = z.object({
  /** Current round-trip commute distance in miles. */
  currentRoundTripMiles: z.number().min(0),
  /** Number of work days per year. */
  workDaysPerYear: z.number().int().min(0).max(366),
  /** IRS standard mileage rate in dollars per mile. */
  irsMileageRate: z.number().min(0),
  /** Current monthly toll costs. */
  currentMonthlyTolls: currency(),
  /** New round-trip commute distance in miles (after moving). */
  newRoundTripMiles: z.number().min(0),
  /** New monthly toll costs. */
  newMonthlyTolls: currency(),
  /** Hours of commute time saved per work day by moving closer. */
  commuteTimeSavedPerDayHours: z.number().min(0).max(24),
  /** Hours per month spent on landlord duties (Scenario B only). */
  landlordHoursPerMonth: z.number().min(0),
})

const costInputsSchema = z.object({
  /** One-time moving costs in dollars. */
  movingCosts: currency(),
  /** Annual escalation rate for insurance premiums (e.g. 0.03 for 3%). */
  insuranceEscalationRate: rate(),
  /** Annual escalation rate for property taxes (e.g. 0.02 for 2%). */
  propertyTaxEscalationRate: rate(),
  /** General inflation rate used for expense escalation (e.g. 0.025 for 2.5%). */
  generalInflationRate: rate(),
  /** Additional annual tax preparation cost for filing rental income (Schedule E). */
  additionalTaxPrepCost: currency(),
  /** Annual umbrella insurance cost for landlord liability coverage. */
  umbrellaInsuranceAnnualCost: currency(),
})

const projectionInputsSchema = z.object({
  /** Number of years to project forward (1–30). */
  timeHorizonYears: z.number().int().min(1).max(30),
  /**
   * Year in which the rental property is sold, or null to hold indefinitely.
   * When null, no rental exit event occurs within the projection.
   */
  plannedRentalExitYear: z.number().int().min(1).max(30).nullable(),
})

const homeNamesSchema = z.object({
  /** Display name for the current home. */
  currentHomeName: z.string().min(1).max(50),
  /** Display name for the new home. */
  newHomeName: z.string().min(1).max(50),
})

// ---- Top-level schema -----------------------------------------------------

/**
 * Zod validation schema for ScenarioInputs.
 * Mirrors the structure of the ScenarioInputs interface from engine/types.ts
 * with added min/max constraints per field.
 */
export const scenarioInputsSchema = z.object({
  personal: personalInputsSchema,
  retirement: retirementInputsSchema,
  currentHome: currentHomeInputsSchema,
  newHome: newHomeInputsSchema,
  commute: commuteInputsSchema,
  costs: costInputsSchema,
  projection: projectionInputsSchema,
  homeNames: homeNamesSchema,
})

/** Inferred type from the zod schema — should be identical to ScenarioInputs. */
export type ScenarioInputsFromSchema = z.infer<typeof scenarioInputsSchema>

// Type-level check: ensure the schema output matches the engine interface.
// If these types diverge, this assignment will produce a TypeScript error.
const _typeCheck: ScenarioInputs = {} as ScenarioInputsFromSchema
void _typeCheck

/**
 * Default values for all input fields, assembled from the engine's
 * DEFAULT_* constants. Used by engine tests and as a complete reference.
 * NOT used for form initialization — see formDefaultValues instead.
 */
export const defaultValues: ScenarioInputs = {
  personal: DEFAULT_PERSONAL_INPUTS,
  retirement: DEFAULT_RETIREMENT_INPUTS,
  currentHome: DEFAULT_CURRENT_HOME_INPUTS,
  newHome: DEFAULT_NEW_HOME_INPUTS,
  commute: DEFAULT_COMMUTE_INPUTS,
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
  homeNames: DEFAULT_HOME_NAMES,
}

/**
 * Form default values — personal/financial fields are blank (undefined) so
 * users must enter their own numbers. Structural/assumption fields keep
 * defaults. Used by react-hook-form as initial values for new users.
 *
 * The `as unknown as T` casts are necessary because the Zod schema requires
 * all fields to be present, but we want the form to start with blank fields
 * that the user must fill in before the engine can run.
 */
export const formDefaultValues = {
  personal: {
    age: undefined as unknown as number,
    annualGrossIncome: undefined as unknown as number,
    annualSalaryGrowthRate: DEFAULT_PERSONAL_INPUTS.annualSalaryGrowthRate,
    filingStatus: undefined as unknown as 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household',
    stateIncomeTaxRate: DEFAULT_PERSONAL_INPUTS.stateIncomeTaxRate,
    monthlyLivingExpenses: undefined as unknown as number,
    monthlyDebtPayments: DEFAULT_PERSONAL_INPUTS.monthlyDebtPayments,
    liquidSavings: undefined as unknown as number,
  },
  retirement: {
    iraBalance: undefined as unknown as number,
    iraType: undefined as unknown as 'traditional' | 'roth',
    iraExpectedAnnualReturn: DEFAULT_RETIREMENT_INPUTS.iraExpectedAnnualReturn,
    annualIRAContributionScenarioA: DEFAULT_RETIREMENT_INPUTS.annualIRAContributionScenarioA,
    annualIRAContributionScenarioB: DEFAULT_RETIREMENT_INPUTS.annualIRAContributionScenarioB,
    iraWithdrawalAmountScenarioB: undefined as unknown as number,
    hasEmployerMatch: DEFAULT_RETIREMENT_INPUTS.hasEmployerMatch,
    employerMatchPercentage: DEFAULT_RETIREMENT_INPUTS.employerMatchPercentage,
    hasOtherRetirementSavings: DEFAULT_RETIREMENT_INPUTS.hasOtherRetirementSavings,
    otherRetirementBalance: DEFAULT_RETIREMENT_INPUTS.otherRetirementBalance,
  },
  currentHome: {
    homeValue: undefined as unknown as number,
    mortgageBalance: undefined as unknown as number,
    interestRate: undefined as unknown as number,
    originalLoanTermYears: undefined as unknown as number,
    yearsIntoLoan: undefined as unknown as number,
    annualPropertyTaxRate: undefined as unknown as number,
    annualInsurance: undefined as unknown as number,
    landlordInsurancePremiumIncrease: DEFAULT_CURRENT_HOME_INPUTS.landlordInsurancePremiumIncrease,
    maintenanceReserveRate: DEFAULT_CURRENT_HOME_INPUTS.maintenanceReserveRate,
    monthlyHOA: DEFAULT_CURRENT_HOME_INPUTS.monthlyHOA,
    expectedMonthlyRent: undefined as unknown as number,
    annualRentGrowthRate: DEFAULT_CURRENT_HOME_INPUTS.annualRentGrowthRate,
    vacancyRate: DEFAULT_CURRENT_HOME_INPUTS.vacancyRate,
    propertyManagementFeeRate: DEFAULT_CURRENT_HOME_INPUTS.propertyManagementFeeRate,
    tenantTurnoverFrequencyYears: DEFAULT_CURRENT_HOME_INPUTS.tenantTurnoverFrequencyYears,
    costPerTurnover: DEFAULT_CURRENT_HOME_INPUTS.costPerTurnover,
    sellingCostsRate: DEFAULT_CURRENT_HOME_INPUTS.sellingCostsRate,
    annualAppreciationRate: DEFAULT_CURRENT_HOME_INPUTS.annualAppreciationRate,
    landValuePercentage: DEFAULT_CURRENT_HOME_INPUTS.landValuePercentage,
    rentalIncomeDTICreditRate: DEFAULT_CURRENT_HOME_INPUTS.rentalIncomeDTICreditRate,
  },
  newHome: {
    purchasePrice: undefined as unknown as number,
    interestRate: undefined as unknown as number,
    loanTermYears: DEFAULT_NEW_HOME_INPUTS.loanTermYears,
    downPaymentPercentScenarioA: undefined as unknown as number,
    downPaymentPercentScenarioB: undefined as unknown as number,
    annualPMIRate: DEFAULT_NEW_HOME_INPUTS.annualPMIRate,
    annualPropertyTaxRate: undefined as unknown as number,
    annualInsurance: undefined as unknown as number,
    closingCostsRate: DEFAULT_NEW_HOME_INPUTS.closingCostsRate,
    annualAppreciationRate: DEFAULT_NEW_HOME_INPUTS.annualAppreciationRate,
  },
  commute: {
    currentRoundTripMiles: undefined as unknown as number,
    workDaysPerYear: DEFAULT_COMMUTE_INPUTS.workDaysPerYear,
    irsMileageRate: DEFAULT_COMMUTE_INPUTS.irsMileageRate,
    currentMonthlyTolls: DEFAULT_COMMUTE_INPUTS.currentMonthlyTolls,
    newRoundTripMiles: DEFAULT_COMMUTE_INPUTS.newRoundTripMiles,
    newMonthlyTolls: DEFAULT_COMMUTE_INPUTS.newMonthlyTolls,
    commuteTimeSavedPerDayHours: DEFAULT_COMMUTE_INPUTS.commuteTimeSavedPerDayHours,
    landlordHoursPerMonth: DEFAULT_COMMUTE_INPUTS.landlordHoursPerMonth,
  },
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
  homeNames: DEFAULT_HOME_NAMES,
}

/**
 * Field paths that must be filled before the engine can run.
 * These are the personal/financial fields with no structural defaults.
 */
export const REQUIRED_FIELDS = [
  'personal.age',
  'personal.annualGrossIncome',
  'personal.filingStatus',
  'personal.monthlyLivingExpenses',
  'personal.liquidSavings',
  'retirement.iraBalance',
  'retirement.iraType',
  'retirement.iraWithdrawalAmountScenarioB',
  'currentHome.homeValue',
  'currentHome.mortgageBalance',
  'currentHome.interestRate',
  'currentHome.originalLoanTermYears',
  'currentHome.yearsIntoLoan',
  'currentHome.expectedMonthlyRent',
  'currentHome.annualPropertyTaxRate',
  'currentHome.annualInsurance',
  'newHome.purchasePrice',
  'newHome.interestRate',
  'newHome.downPaymentPercentScenarioA',
  'newHome.downPaymentPercentScenarioB',
  'newHome.annualPropertyTaxRate',
  'newHome.annualInsurance',
  'commute.currentRoundTripMiles',
] as const

/**
 * Check if all required fields have been filled (not undefined/null/NaN).
 * Returns { isReady, filledCount, totalRequired }.
 */
export function checkRequiredFields(values: unknown): {
  isReady: boolean
  filledCount: number
  totalRequired: number
} {
  const totalRequired = REQUIRED_FIELDS.length
  let filledCount = 0

  for (const path of REQUIRED_FIELDS) {
    const parts = path.split('.')
    let current: unknown = values
    for (const part of parts) {
      current = (current as Record<string, unknown>)?.[part]
    }
    if (current !== undefined && current !== null && !Number.isNaN(current)) {
      filledCount++
    }
  }

  return { isReady: filledCount === totalRequired, filledCount, totalRequired }
}
