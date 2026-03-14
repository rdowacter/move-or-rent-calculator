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
  yearsIntoLoan: z.number().min(0).max(40),
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
})

const newHomeInputsSchema = z.object({
  /** Purchase price. */
  purchasePrice: currency(),
  /** Mortgage interest rate (e.g. 0.06 for 6%). */
  interestRate: rate(),
  /** Loan term in years. */
  loanTermYears: z.number().int().min(1).max(40),
  /**
   * Down payment percentage for Scenario A (sell Kyle, larger down payment).
   * E.g. 0.20 for 20%.
   */
  downPaymentPercentScenarioA: rate(),
  /**
   * Down payment percentage for Scenario B (keep Kyle, smaller down payment).
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
  /** Current round-trip commute distance in miles (Kyle to Austin). */
  currentRoundTripMiles: z.number().min(0),
  /** Number of work days per year. */
  workDaysPerYear: z.number().int().min(0).max(366),
  /** IRS standard mileage rate in dollars per mile. */
  irsMileageRate: z.number().min(0),
  /** Current monthly toll costs. */
  currentMonthlyTolls: currency(),
  /** New round-trip commute distance in miles (Austin to office). */
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
   * Year in which the rental property is sold.
   * Defaults to the same as timeHorizonYears.
   * Triggers depreciation recapture and capital gains calculations.
   */
  plannedRentalExitYear: z.number().int().min(1).max(30),
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
})

/** Inferred type from the zod schema — should be identical to ScenarioInputs. */
export type ScenarioInputsFromSchema = z.infer<typeof scenarioInputsSchema>

// Type-level check: ensure the schema output matches the engine interface.
// If these types diverge, this assignment will produce a TypeScript error.
const _typeCheck: ScenarioInputs = {} as ScenarioInputsFromSchema
void _typeCheck

/**
 * Default values for all input fields, assembled from the engine's
 * DEFAULT_* constants. Used as the initial values for react-hook-form.
 */
export const defaultValues: ScenarioInputs = {
  personal: DEFAULT_PERSONAL_INPUTS,
  retirement: DEFAULT_RETIREMENT_INPUTS,
  currentHome: DEFAULT_CURRENT_HOME_INPUTS,
  newHome: DEFAULT_NEW_HOME_INPUTS,
  commute: DEFAULT_COMMUTE_INPUTS,
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
}
