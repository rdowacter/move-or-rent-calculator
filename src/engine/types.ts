// ---------------------------------------------------------------------------
// types.ts — TypeScript interfaces for the Real Estate Financial Scenario Analyzer
//
// These types define the contract between the pure financial calculation engine
// and any consumer (UI, tests, CLI scripts). They have ZERO dependencies on
// React, the DOM, or any browser API.
// ---------------------------------------------------------------------------

// ---- Utility / Union Types ------------------------------------------------

/** IRS filing status — determines tax brackets and standard deduction. */
export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household'

/** Traditional IRAs are taxed on withdrawal; Roth IRAs are not (qualified). */
export type IRAType = 'traditional' | 'roth'

/** Warning categories map to the major risk domains of this analysis. */
export type WarningCategory =
  | 'lending'
  | 'retirement'
  | 'liquidity'
  | 'tax'
  | 'landlord'
  | 'market'

/** Severity levels for contextual warnings shown to the user. */
export type WarningSeverity = 'info' | 'warning' | 'critical'

// ---- Input Interfaces -----------------------------------------------------

/** Personal & tax profile of the user. */
export interface PersonalInputs {
  /** Current age — used to determine early withdrawal penalty eligibility. */
  age: number
  /** Annual gross income before taxes. */
  annualGrossIncome: number
  /** Expected annual salary growth rate (e.g. 0.03 for 3%). */
  annualSalaryGrowthRate: number
  /** IRS filing status — drives tax bracket selection. */
  filingStatus: FilingStatus
  /** State income tax rate (0 for Texas). */
  stateIncomeTaxRate: number
  /** Monthly non-housing living expenses (food, utilities, etc.). */
  monthlyLivingExpenses: number
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  monthlyDebtPayments: number
  /** Current liquid savings / cash on hand available for upfront costs. */
  liquidSavings: number
}

/** Retirement & savings inputs. */
export interface RetirementInputs {
  /** Current IRA balance. */
  iraBalance: number
  /** IRA account type — determines tax treatment on withdrawal. */
  iraType: IRAType
  /** Expected annual return on IRA investments (e.g. 0.07 for 7%). */
  iraExpectedAnnualReturn: number
  /** Annual IRA contribution in Scenario A (keep IRA intact). */
  annualIRAContributionScenarioA: number
  /** Annual IRA contribution in Scenario B (IRA withdrawn). */
  annualIRAContributionScenarioB: number
  /** Whether the user has an employer 401(k) with matching. */
  hasEmployerMatch: boolean
  /** Employer 401(k) match percentage (e.g. 0.03 for 3%). */
  employerMatchPercentage: number
  /** Whether the user has other retirement savings beyond the IRA. */
  hasOtherRetirementSavings: boolean
  /** Balance of other retirement accounts. */
  otherRetirementBalance: number
}

/** Current home (Kyle) inputs — used for baseline, sale in A, rental in B. */
export interface CurrentHomeInputs {
  /** Current estimated market value. */
  homeValue: number
  /** Remaining mortgage principal balance. */
  mortgageBalance: number
  /** Mortgage interest rate (e.g. 0.02 for 2%). */
  interestRate: number
  /** Original loan term in years. */
  originalLoanTermYears: number
  /** Number of years already into the loan. */
  yearsIntoLoan: number
  /** Annual property tax rate as a fraction of assessed value (e.g. 0.0215). */
  annualPropertyTaxRate: number
  /** Annual homeowners insurance premium in dollars. */
  annualInsurance: number
  /**
   * Percentage increase in insurance when converting to landlord policy.
   * Landlord insurance is typically 15-25% more than homeowner insurance
   * because it covers tenant-related liability and loss of rental income.
   */
  landlordInsurancePremiumIncrease: number
  /**
   * Annual maintenance reserve as a fraction of home value (e.g. 0.0075).
   * Industry rule of thumb: 1% of home value/year; 0.75% is optimistic.
   */
  maintenanceReserveRate: number
  /** Monthly HOA dues. */
  monthlyHOA: number
  /** Expected monthly rent when used as a rental property. */
  expectedMonthlyRent: number
  /** Annual rent growth rate (e.g. 0.03 for 3%). */
  annualRentGrowthRate: number
  /**
   * Vacancy rate — fraction of the year the property is expected to be
   * unoccupied (e.g. 0.08 for 8%, roughly 1 month/year).
   */
  vacancyRate: number
  /** Property management fee as a fraction of collected rent (e.g. 0.10). */
  propertyManagementFeeRate: number
  /** Average number of years between tenant turnovers. */
  tenantTurnoverFrequencyYears: number
  /** One-time cost per tenant turnover (cleaning, minor repairs, re-listing). */
  costPerTurnover: number
  /** Selling costs as a fraction of sale price (agent commissions + closing). */
  sellingCostsRate: number
  /** Expected annual home appreciation rate (e.g. 0.03 for 3%). */
  annualAppreciationRate: number
}

/** New home (Austin) inputs. */
export interface NewHomeInputs {
  /** Purchase price. */
  purchasePrice: number
  /** Mortgage interest rate (e.g. 0.06 for 6%). */
  interestRate: number
  /** Loan term in years. */
  loanTermYears: number
  /**
   * Down payment percentage for Scenario A (sell Kyle, larger down payment).
   * E.g. 0.20 for 20%.
   */
  downPaymentPercentScenarioA: number
  /**
   * Down payment percentage for Scenario B (keep Kyle, smaller down payment).
   * E.g. 0.10 for 10%.
   */
  downPaymentPercentScenarioB: number
  /**
   * Annual PMI rate as a fraction of the loan amount (e.g. 0.007 for 0.70%).
   * PMI is required when LTV exceeds 80% and auto-cancels at 78% LTV
   * per the Homeowners Protection Act of 1998.
   */
  annualPMIRate: number
  /** Annual property tax rate as a fraction of assessed value. */
  annualPropertyTaxRate: number
  /** Annual homeowners insurance premium in dollars. */
  annualInsurance: number
  /** Buyer closing costs as a fraction of purchase price (e.g. 0.025 for 2.5%). */
  closingCostsRate: number
  /** Expected annual home appreciation rate (e.g. 0.035 for 3.5%). */
  annualAppreciationRate: number
}

/** Commute & lifestyle inputs. */
export interface CommuteInputs {
  /** Current round-trip commute distance in miles (Kyle to Austin). */
  currentRoundTripMiles: number
  /** Number of work days per year. */
  workDaysPerYear: number
  /** IRS standard mileage rate in dollars per mile. */
  irsMileageRate: number
  /** Current monthly toll costs. */
  currentMonthlyTolls: number
  /** New round-trip commute distance in miles (Austin to office). */
  newRoundTripMiles: number
  /** New monthly toll costs. */
  newMonthlyTolls: number
  /** Hours of commute time saved per work day by moving closer. */
  commuteTimeSavedPerDayHours: number
  /** Hours per month spent on landlord duties (Scenario B only). */
  landlordHoursPerMonth: number
}

/** One-time and recurring cost assumptions. */
export interface CostInputs {
  /** One-time moving costs in dollars. */
  movingCosts: number
  /** Annual escalation rate for insurance premiums (e.g. 0.03 for 3%). */
  insuranceEscalationRate: number
  /** Annual escalation rate for property taxes (e.g. 0.02 for 2%). */
  propertyTaxEscalationRate: number
  /** General inflation rate used for expense escalation (e.g. 0.025 for 2.5%). */
  generalInflationRate: number
  /** Additional annual tax preparation cost for filing rental income (Schedule E). */
  additionalTaxPrepCost: number
  /** Annual umbrella insurance cost for landlord liability coverage. */
  umbrellaInsuranceAnnualCost: number
}

/** Projection / time horizon settings. */
export interface ProjectionInputs {
  /** Number of years to project forward (5–30). */
  timeHorizonYears: number
  /**
   * Year in which the rental property is sold.
   * Defaults to the same as timeHorizonYears.
   * Triggers depreciation recapture and capital gains calculations.
   */
  plannedRentalExitYear: number
}

/**
 * Top-level input interface — combines all input groups.
 * This is the single argument passed to the scenario orchestrator.
 */
export interface ScenarioInputs {
  personal: PersonalInputs
  retirement: RetirementInputs
  currentHome: CurrentHomeInputs
  newHome: NewHomeInputs
  commute: CommuteInputs
  costs: CostInputs
  projection: ProjectionInputs
}

// ---- Output Interfaces ----------------------------------------------------

/**
 * A single year's financial snapshot for one scenario.
 * The scenario orchestrator produces an array of these (one per year)
 * so the UI can render year-by-year comparison charts.
 */
export interface YearlySnapshot {
  /** Projection year number (1-indexed: year 1 = first year after action). */
  year: number
  /** Total net worth = IRA + home equity (all properties) + liquid savings − debts. */
  netWorth: number
  /** IRA / retirement account balance at end of this year. */
  iraBalance: number
  /** Equity in the current (Kyle) home at end of year (value − mortgage balance). */
  currentHomeEquity: number
  /** Equity in the new (Austin) home at end of year. */
  newHomeEquity: number
  /** Remaining mortgage balance on the current (Kyle) home. */
  currentHomeMortgageBalance: number
  /** Remaining mortgage balance on the new (Austin) home. */
  newHomeMortgageBalance: number
  /** Net annual cash flow (income − all expenses − taxes − debt service). */
  annualCashFlow: number
  /**
   * Monthly cash flow in a best-case month (full rental income, no vacancy,
   * no maintenance surprises).
   */
  monthlyCashFlowBestCase: number
  /**
   * Monthly cash flow in a worst-case month (vacancy, major repair,
   * turnover costs amortized monthly).
   */
  monthlyCashFlowWorstCase: number
  /** Cumulative commute savings to date (mileage + tolls + time value). */
  cumulativeCommuteSavings: number
  /** Annual gross income for this year (with salary growth applied). */
  annualGrossIncome: number
}

/**
 * Upfront capital requirements — what the user needs on day one
 * and whether they actually have it.
 */
export interface UpfrontCapital {
  /** Total cash needed to execute this scenario. */
  totalCashNeeded: number
  /** Total cash available (liquid savings + sale proceeds or IRA net). */
  cashAvailable: number
  /**
   * Surplus (positive) or shortfall (negative).
   * A negative value is a critical warning: the user cannot afford this plan.
   */
  surplus: number
  /** Down payment on the new home. */
  downPayment: number
  /** Buyer closing costs on the new home. */
  closingCosts: number
  /** Moving costs. */
  movingCosts: number
  /**
   * Net proceeds from IRA withdrawal (Scenario B) after taxes and penalties,
   * or null if IRA is not withdrawn.
   */
  iraWithdrawalNetProceeds: number | null
  /**
   * Net proceeds from selling the current home (Scenario A) after mortgage
   * payoff and selling costs, or null if the home is not sold.
   */
  homeSaleNetProceeds: number | null
}

/**
 * Debt-to-income ratio analysis — determines whether a lender would
 * approve the mortgage(s) in this scenario.
 */
export interface DTIResult {
  /**
   * Front-end DTI: housing costs only / gross monthly income.
   * Lender target is typically 28%.
   */
  frontEndDTI: number
  /**
   * Back-end DTI: all debt obligations / gross monthly income.
   * Lender target is typically 36%, hard max 43% for qualified mortgages.
   */
  backEndDTI: number
  /** Whether the back-end DTI passes the lender's hard maximum threshold. */
  passesLenderThreshold: boolean
  /**
   * Amount of rental income credited toward DTI offset.
   * Lenders typically credit only 75% of expected rental income, and
   * some won't credit any for borrowers with no landlord history.
   */
  rentalIncomeCredit: number
}

/**
 * A contextual warning generated by the engine based on the user's inputs
 * and calculated outputs. Warnings are first-class features — they are often
 * more valuable than the charts.
 */
export interface Warning {
  /** Risk domain this warning belongs to. */
  category: WarningCategory
  /** How urgent this warning is. */
  severity: WarningSeverity
  /** Human-readable warning message. */
  message: string
  /**
   * Optional dollar impact — when quantifiable, shows the user the
   * concrete financial cost of this risk (e.g. "$9,600 in taxes and penalties").
   */
  dollarImpact?: number
}

/**
 * Complete output for a single scenario (Baseline, A, or B).
 */
export interface ScenarioOutput {
  /** Display name for this scenario (e.g. "Scenario B: Keep Kyle as Rental"). */
  name: string
  /** Year-by-year financial snapshots for the projection period. */
  yearlySnapshots: YearlySnapshot[]
  /** Upfront capital requirements and availability. */
  upfrontCapital: UpfrontCapital
  /** Debt-to-income ratio analysis. */
  dtiResult: DTIResult
  /** Contextual warnings generated for this scenario. */
  warnings: Warning[]
  /** Net worth at the end of the projection period. */
  finalNetWorth: number
  /** Total IRA / retirement value at the end of the projection period. */
  totalIRAValue: number
  /**
   * Number of months the user's liquid reserves could cover all expenses
   * if income stopped entirely (emergency runway).
   */
  monthlyReserveRunwayMonths: number
}

/**
 * Top-level model output — the complete comparison of all three scenarios.
 * This is the single return value of the scenario orchestrator.
 */
export interface ModelOutput {
  baseline: ScenarioOutput
  scenarioA: ScenarioOutput
  scenarioB: ScenarioOutput
}
