// ---------------------------------------------------------------------------
// constants.ts — Named financial constants with source citations
//
// Every constant in this file has a JSDoc comment citing its authoritative
// source. This file has ZERO dependencies on React, the DOM, or any browser
// API. All engine modules import their constants from here — no magic numbers
// anywhere in the calculation layer.
// ---------------------------------------------------------------------------

import type { FilingStatus, TaxBracket } from './types'

// ---- General Constants ----------------------------------------------------

/** Number of months in a year. Used to convert annual ↔ monthly figures. */
export const MONTHS_PER_YEAR = 12

/**
 * Standard full-time work hours per year (40 hrs/week × 52 weeks).
 * Used to compute the time-value of commute savings.
 */
export const WORK_HOURS_PER_YEAR = 2080

// ---- Federal Tax Brackets (2024) ------------------------------------------
// Source: IRS Revenue Procedure 2023-34, §3.01
// https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024
//
// Each bracket entry represents: { min: taxable income floor, max: taxable
// income ceiling (Infinity for the top bracket), rate: marginal rate }.
// Tax is computed marginally — only income within each range is taxed at
// that range's rate.

/**
 * 2024 federal income tax brackets for all filing statuses.
 * Source: IRS Rev. Proc. 2023-34, §3.01
 */
export const FEDERAL_TAX_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 11_600, rate: 0.1 },
    { min: 11_600, max: 47_150, rate: 0.12 },
    { min: 47_150, max: 100_525, rate: 0.22 },
    { min: 100_525, max: 191_950, rate: 0.24 },
    { min: 191_950, max: 243_725, rate: 0.32 },
    { min: 243_725, max: 609_350, rate: 0.35 },
    { min: 609_350, max: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { min: 0, max: 23_200, rate: 0.1 },
    { min: 23_200, max: 94_300, rate: 0.12 },
    { min: 94_300, max: 201_050, rate: 0.22 },
    { min: 201_050, max: 383_900, rate: 0.24 },
    { min: 383_900, max: 487_450, rate: 0.32 },
    { min: 487_450, max: 731_200, rate: 0.35 },
    { min: 731_200, max: Infinity, rate: 0.37 },
  ],
  married_filing_separately: [
    { min: 0, max: 11_600, rate: 0.1 },
    { min: 11_600, max: 47_150, rate: 0.12 },
    { min: 47_150, max: 100_525, rate: 0.22 },
    { min: 100_525, max: 191_950, rate: 0.24 },
    { min: 191_950, max: 243_725, rate: 0.32 },
    { min: 243_725, max: 365_600, rate: 0.35 },
    { min: 365_600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 16_550, rate: 0.1 },
    { min: 16_550, max: 63_100, rate: 0.12 },
    { min: 63_100, max: 100_500, rate: 0.22 },
    { min: 100_500, max: 191_950, rate: 0.24 },
    { min: 191_950, max: 243_700, rate: 0.32 },
    { min: 243_700, max: 609_350, rate: 0.35 },
    { min: 609_350, max: Infinity, rate: 0.37 },
  ],
}

/**
 * 2024 standard deduction amounts by filing status.
 * Source: IRS Rev. Proc. 2023-34, §3.02
 */
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 14_600,
  married_filing_jointly: 29_200,
  married_filing_separately: 14_600,
  head_of_household: 21_900,
}

// ---- Long-Term Capital Gains Brackets (2024) ------------------------------
// Source: IRS Rev. Proc. 2023-34, §3.12
// Long-term capital gains (held > 1 year) are taxed at 0%, 15%, or 20%
// depending on taxable income. These thresholds are for the 0%→15% and
// 15%→20% transitions.

/** Taxable income threshold below which LTCG rate is 0%. */
export const LTCG_ZERO_RATE_THRESHOLD: Record<FilingStatus, number> = {
  single: 47_025,
  married_filing_jointly: 94_050,
  married_filing_separately: 47_025,
  head_of_household: 63_000,
}

/** Taxable income threshold above which LTCG rate is 20%. */
export const LTCG_TWENTY_PERCENT_THRESHOLD: Record<FilingStatus, number> = {
  single: 518_900,
  married_filing_jointly: 583_750,
  married_filing_separately: 291_850,
  head_of_household: 551_350,
}

/** Long-term capital gains rate: 0%. Source: IRC §1(h)(1)(B); IRS Rev. Proc. 2023-34 §3.12 */
export const LTCG_RATE_ZERO = 0.0
/** Long-term capital gains rate: 15%. Source: IRC §1(h)(1)(C); IRS Rev. Proc. 2023-34 §3.12 */
export const LTCG_RATE_FIFTEEN = 0.15
/** Long-term capital gains rate: 20%. Source: IRC §1(h)(1)(D); IRS Rev. Proc. 2023-34 §3.12 */
export const LTCG_RATE_TWENTY = 0.2

// ---- IRA & Retirement Constants -------------------------------------------

/**
 * Early withdrawal penalty rate on traditional IRA distributions taken
 * before age 59.5. Source: IRC §72(t)
 */
export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.1

/**
 * Age at which early withdrawal penalty no longer applies.
 * Source: IRC §72(t) — distributions before age 59½ are subject to
 * the 10% additional tax unless an exception applies.
 */
export const EARLY_WITHDRAWAL_AGE_THRESHOLD = 59.5

/**
 * 2024 IRA contribution limit for individuals under age 50.
 * Source: IRC §219(b)(5)(A); IRS Notice 2023-75
 */
export const IRA_CONTRIBUTION_LIMIT_UNDER_50 = 7_000

/**
 * 2024 IRA contribution limit for individuals age 50 and older
 * (includes $1,000 catch-up contribution).
 * Source: IRC §219(b)(5)(B); IRS Notice 2023-75
 */
export const IRA_CONTRIBUTION_LIMIT_50_AND_OVER = 8_000

// ---- Depreciation & Recapture Constants -----------------------------------

/**
 * Residential rental property depreciation period in years.
 * IRS requires straight-line depreciation over 27.5 years for
 * residential rental property.
 * Source: IRC §168(c)(1); IRS Publication 946
 */
export const RESIDENTIAL_DEPRECIATION_YEARS = 27.5

/**
 * Estimated percentage of total property value attributable to the structure
 * (as opposed to land). Land is NOT a depreciable asset per IRC §167.
 * The depreciable basis = home value × (1 − LAND_VALUE_PERCENTAGE).
 *
 * Source: Industry standard estimate. Actual split varies by property and
 * can be determined by the county tax assessor's allocation or an appraisal.
 * 15% land / 85% structure is a commonly used default for residential.
 */
export const LAND_VALUE_PERCENTAGE = 0.15

/**
 * Tax rate applied to depreciation recapture when a rental property is sold.
 * All depreciation previously claimed is "recaptured" and taxed at this
 * flat rate, regardless of the taxpayer's ordinary income bracket.
 * Source: IRC §1250 (unrecaptured Section 1250 gain)
 */
export const DEPRECIATION_RECAPTURE_RATE = 0.25

// ---- PMI Constants --------------------------------------------------------

/**
 * Loan-to-value ratio at which PMI is automatically cancelled by the
 * servicer. The borrower does not need to request it.
 * Source: Homeowners Protection Act of 1998 (HPA), 12 USC §4901 et seq.
 * LTV is calculated against the ORIGINAL appraised value.
 */
export const PMI_AUTO_CANCELLATION_LTV = 0.78

/**
 * Loan-to-value ratio at which the borrower may REQUEST PMI cancellation.
 * The borrower must be current on payments and may need a new appraisal.
 * Source: Homeowners Protection Act of 1998 (HPA), 12 USC §4901 et seq.
 */
export const PMI_REQUEST_CANCELLATION_LTV = 0.8

// ---- DTI / Lending Constants ----------------------------------------------

/**
 * Front-end DTI target: housing expenses (PITI + HOA + PMI) as a
 * percentage of gross monthly income. Conventional lending guideline.
 * Source: Fannie Mae Selling Guide B3-6-02
 */
export const DTI_FRONT_END_TARGET = 0.28

/**
 * Back-end DTI target: all debt obligations (housing + other debts)
 * as a percentage of gross monthly income. Conventional lending guideline.
 * Source: Fannie Mae Selling Guide B3-6-02
 */
export const DTI_BACK_END_TARGET = 0.36

/**
 * Hard maximum back-end DTI for a Qualified Mortgage (QM).
 * Loans exceeding this ratio generally cannot be classified as QM
 * and carry higher lender risk.
 * Source: CFPB Qualified Mortgage Rule; 12 CFR §1026.43(e)(2)
 */
export const DTI_HARD_MAX = 0.43

/**
 * Percentage of expected rental income that lenders credit toward
 * offsetting the rental property's mortgage payment in DTI calculations.
 * Lenders discount rental income to account for vacancy, maintenance,
 * and collection risk. Some lenders use 0% for borrowers with no
 * landlord history.
 * Source: Fannie Mae Selling Guide B3-3.1-08
 */
export const RENTAL_INCOME_DTI_CREDIT_RATE = 0.75

// ---- Section 121 Primary Residence Exclusion ------------------------------

/**
 * Capital gains exclusion on the sale of a primary residence for
 * single filers. The seller must have owned and used the home as
 * their primary residence for at least 2 of the last 5 years.
 * Source: IRC §121(b)(1)
 */
export const SECTION_121_EXCLUSION_SINGLE = 250_000

/**
 * Capital gains exclusion on the sale of a primary residence for
 * married filing jointly. Both spouses must meet the use test;
 * only one needs to meet the ownership test.
 * Source: IRC §121(b)(2)
 */
export const SECTION_121_EXCLUSION_MFJ = 500_000

/**
 * Number of years of ownership and use (out of the last 5) required
 * to qualify for the Section 121 exclusion.
 * Source: IRC §121(a)
 */
export const SECTION_121_RESIDENCY_REQUIREMENT_YEARS = 2

/**
 * The lookback period for the Section 121 residency test.
 * The seller must have lived in the home as a primary residence for
 * at least SECTION_121_RESIDENCY_REQUIREMENT_YEARS out of the last
 * this-many years before the sale.
 * Source: IRC §121(a)
 */
export const SECTION_121_LOOKBACK_YEARS = 5

// ---- Passive Activity Loss Rules ------------------------------------------

/**
 * Maximum amount of rental losses that can offset ordinary income
 * for "active participants" in rental real estate activities.
 * Source: IRC §469(i)(2)
 */
export const PASSIVE_LOSS_MAX_OFFSET = 25_000

/**
 * AGI threshold at which the passive activity loss offset begins
 * to phase out. Below this AGI, the full $25,000 offset is available.
 * Source: IRC §469(i)(3)(A)
 */
export const PASSIVE_LOSS_PHASE_OUT_START = 100_000

/**
 * AGI threshold at which the passive activity loss offset is
 * completely phased out ($0 offset available).
 * The phase-out reduces the allowance by $0.50 for every $1 of AGI
 * above PASSIVE_LOSS_PHASE_OUT_START.
 * Source: IRC §469(i)(3)(A)
 */
export const PASSIVE_LOSS_PHASE_OUT_END = 150_000

// ---- Default Input Values -------------------------------------------------
// These provide sensible starting values for the UI. They are based on the
// specific scenario described in the project brief (Preston's situation)
// and should be clearly labeled as defaults that the user can override.

/** Default values for PersonalInputs. */
export const DEFAULT_PERSONAL_INPUTS = {
  age: 37,
  annualGrossIncome: 100_000,
  annualSalaryGrowthRate: 0.03,
  filingStatus: 'single' as const,
  stateIncomeTaxRate: 0.0,
  monthlyLivingExpenses: 3_000,
  monthlyDebtPayments: 0,
  liquidSavings: 0,
} satisfies Record<string, unknown>

/** Default values for RetirementInputs. */
export const DEFAULT_RETIREMENT_INPUTS = {
  iraBalance: 30_000,
  iraType: 'traditional' as const,
  iraExpectedAnnualReturn: 0.07,
  annualIRAContributionScenarioA: 7_000,
  annualIRAContributionScenarioB: 0,
  iraWithdrawalAmountScenarioB: 30_000, // Default: full balance (matches iraBalance default)
  hasEmployerMatch: false,
  employerMatchPercentage: 0.0,
  hasOtherRetirementSavings: false,
  otherRetirementBalance: 0,
} satisfies Record<string, unknown>

/** Default values for CurrentHomeInputs. */
export const DEFAULT_CURRENT_HOME_INPUTS = {
  homeValue: 270_000,
  mortgageBalance: 199_000,
  interestRate: 0.02,
  originalLoanTermYears: 30,
  yearsIntoLoan: 5,
  annualPropertyTaxRate: 0.0215,
  annualInsurance: 2_400,
  landlordInsurancePremiumIncrease: 0.2,
  maintenanceReserveRate: 0.0075,
  monthlyHOA: 0,
  expectedMonthlyRent: 2_000,
  annualRentGrowthRate: 0.03,
  vacancyRate: 0.08,
  propertyManagementFeeRate: 0.0,
  tenantTurnoverFrequencyYears: 2.5,
  costPerTurnover: 3_500,
  sellingCostsRate: 0.06,
  annualAppreciationRate: 0.03,
  landValuePercentage: 0.15,
  rentalIncomeDTICreditRate: 0.75,
} satisfies Record<string, unknown>

/** Default values for NewHomeInputs. */
export const DEFAULT_NEW_HOME_INPUTS = {
  purchasePrice: 300_000,
  interestRate: 0.06,
  loanTermYears: 30,
  downPaymentPercentScenarioA: 0.2,
  downPaymentPercentScenarioB: 0.1,
  annualPMIRate: 0.007,
  annualPropertyTaxRate: 0.02,
  annualInsurance: 2_400,
  closingCostsRate: 0.025,
  annualAppreciationRate: 0.035,
} satisfies Record<string, unknown>

/** Default values for CommuteInputs. */
export const DEFAULT_COMMUTE_INPUTS = {
  currentRoundTripMiles: 44,
  workDaysPerYear: 250,
  irsMileageRate: 0.725,
  currentMonthlyTolls: 500,
  newRoundTripMiles: 10,
  newMonthlyTolls: 0,
  commuteTimeSavedPerDayHours: 2.5,
  landlordHoursPerMonth: 5,
} satisfies Record<string, unknown>

/** Default values for CostInputs. */
export const DEFAULT_COST_INPUTS = {
  movingCosts: 3_000,
  insuranceEscalationRate: 0.03,
  propertyTaxEscalationRate: 0.02,
  generalInflationRate: 0.025,
  additionalTaxPrepCost: 500,
  umbrellaInsuranceAnnualCost: 300,
} satisfies Record<string, unknown>

/** Default values for ProjectionInputs. */
export const DEFAULT_PROJECTION_INPUTS = {
  timeHorizonYears: 20,
  // null = never sell the rental within the projection.
  // The rental exit year UI control was removed — the model assumes
  // the user holds the rental indefinitely.
  plannedRentalExitYear: null,
} satisfies Record<string, unknown>

/** Default display names for the two properties. */
export const DEFAULT_HOME_NAMES = {
  currentHomeName: 'Current Home',
  newHomeName: 'New Home',
} satisfies Record<string, unknown>
