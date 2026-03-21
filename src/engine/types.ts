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

/** A single marginal tax bracket used in federal income tax calculations. */
export interface TaxBracket {
  /** Taxable income floor (inclusive). */
  min: number
  /** Taxable income ceiling (exclusive, Infinity for top bracket). */
  max: number
  /** Marginal tax rate applied to income within [min, max). */
  rate: number
}

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
  /** Amount to withdraw from IRA in Scenario B. Defaults to full balance.
   * Set to a value less than iraBalance for partial withdrawal. */
  iraWithdrawalAmountScenarioB: number
  /** Whether the user has other retirement savings beyond the IRA. */
  hasOtherRetirementSavings: boolean
  /** Balance of other retirement accounts. */
  otherRetirementBalance: number
}

/** Current home inputs — used for baseline, sale in A, rental in B. */
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
  /** Percentage of home value attributable to land (not depreciable). Default 15%. */
  landValuePercentage: number
  /** Percentage of rental income lenders credit toward DTI. 75% standard, 0% for new landlords. */
  rentalIncomeDTICreditRate: number
}

/** New home inputs — purchase price, mortgage, and cost details for the target property. */
export interface NewHomeInputs {
  /** Purchase price. */
  purchasePrice: number
  /** Mortgage interest rate (e.g. 0.06 for 6%). */
  interestRate: number
  /** Loan term in years. */
  loanTermYears: number
  /**
   * Down payment percentage for Scenario A (sell current home, larger down payment).
   * E.g. 0.20 for 20%.
   */
  downPaymentPercentScenarioA: number
  /**
   * Down payment percentage for Scenario B (keep current home as rental, smaller down payment).
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
  /** Current round-trip commute distance in miles. */
  currentRoundTripMiles: number
  /** Number of work days per year. */
  workDaysPerYear: number
  /** IRS standard mileage rate in dollars per mile. */
  irsMileageRate: number
  /** Current monthly toll costs. */
  currentMonthlyTolls: number
  /** New round-trip commute distance in miles (after moving). */
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
   * Year in which the rental property is sold, or null to hold indefinitely.
   * When null, the rental is never sold within the projection — no depreciation
   * recapture or capital gains event occurs. The UI removed the exit year control,
   * so this defaults to null.
   */
  plannedRentalExitYear: number | null
}

/** User-configurable display names for the two properties. */
export interface HomeNames {
  /** Display name for the current home (e.g. "Denver Condo"). */
  currentHomeName: string
  /** Display name for the new home (e.g. "Austin House"). */
  newHomeName: string
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
  homeNames: HomeNames
}

// ---- Cash Flow Breakdown --------------------------------------------------

/**
 * Itemized monthly cash flow breakdown for a single year's snapshot.
 * Used by the UI to show exactly where money comes from and goes,
 * so the user can trace every dollar in the headline cash flow number.
 */
export interface CashFlowBreakdown {
  // ---- Income ----
  /** Monthly take-home pay (gross income minus federal tax, divided by 12). */
  takeHomePay: number

  // ---- Primary housing costs ----
  /** Monthly mortgage P&I on the primary residence. */
  mortgagePI: number
  /** Monthly property tax on the primary residence. */
  propertyTax: number
  /** Monthly homeowners insurance on the primary residence. */
  insurance: number
  /** Monthly PMI on the primary residence (0 if not applicable). */
  pmi: number
  /** Monthly HOA dues on the primary residence (0 if not applicable). */
  hoa: number

  // ---- Other expenses ----
  /** Monthly living expenses (food, utilities, etc.). */
  livingExpenses: number
  /** Monthly non-housing debt payments (car loans, student loans, etc.). */
  debtPayments: number
  /** Monthly commute cost (mileage + tolls). */
  commuteCost: number

  // ---- Rental property (Scenario B only, all 0 for other scenarios) ----
  /** Monthly rental income (effective gross rent after vacancy). */
  rentalIncome: number
  /** Monthly rental property mortgage P&I. */
  rentalMortgagePI: number
  /** Monthly rental property tax. */
  rentalPropertyTax: number
  /** Monthly rental property landlord insurance. */
  rentalInsurance: number
  /** Monthly maintenance reserve. */
  rentalMaintenance: number
  /** Monthly property management fee. */
  rentalManagementFee: number
  /** Monthly additional landlord costs (tax prep, umbrella insurance, amortized turnover). */
  rentalLandlordCosts: number
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
  /** Equity in the current home at end of year (value − mortgage balance). */
  currentHomeEquity: number
  /** Equity in the new home at end of year. */
  newHomeEquity: number
  /** Remaining mortgage balance on the current home. */
  currentHomeMortgageBalance: number
  /** Remaining mortgage balance on the new home. */
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

  // ---- Rental-specific fields (Scenario B only, undefined for others) ----

  /** Gross rental income for this year (rent × 12 × (1 - vacancy)). */
  rentalGrossIncome?: number
  /** Annual straight-line depreciation expense (structure value / 27.5). */
  depreciationExpense?: number
  /** Passive activity loss allowed as offset against ordinary income this year. */
  passiveLossAllowed?: number
  /** Passive activity loss suspended (carried forward due to AGI phase-out). */
  passiveLossSuspended?: number

  /** Itemized monthly cash flow breakdown for transparency — shows exactly
   *  where the headline cash flow number comes from. */
  cashFlowBreakdown: CashFlowBreakdown
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
 * Tax event when the rental property is sold at the planned exit year.
 * Captures depreciation recapture (25% rate) and capital gains — the two
 * highest-dollar, most commonly overlooked costs of the rental strategy.
 */
export interface RentalExitTaxEvent {
  /** Total depreciation claimed over the rental period. */
  totalDepreciationClaimed: number
  /** Tax owed on recaptured depreciation at 25% (IRC §1250). */
  depreciationRecaptureTax: number
  /** Capital gain on appreciation (sale price - adjusted basis). */
  capitalGain: number
  /** Tax on the capital gain at the applicable LTCG rate. */
  capitalGainsTax: number
  /** Net proceeds after mortgage payoff, selling costs, and all taxes. */
  netSaleProceeds: number
}

// ---- Phase 2 Intermediate Result Types ------------------------------------

/**
 * Monthly cash flow breakdown for a rental property.
 * Used by rental.ts to show exactly where the money goes.
 */
export interface RentalCashFlowResult {
  /** Gross monthly rent before vacancy. */
  grossRent: number
  /** Effective gross rent after vacancy allowance. */
  effectiveGrossRent: number
  /** Itemized monthly operating expenses. */
  itemizedExpenses: {
    propertyTax: number
    insurance: number
    maintenance: number
    hoa: number
    managementFee: number
    vacancyAllowance: number
  }
  /** Total monthly operating expenses (excludes vacancy — vacancy is already reflected in effectiveGrossRent vs grossRent). */
  totalExpenses: number
  /** Net operating income = effectiveGrossRent - totalExpenses (excluding mortgage). */
  netOperatingIncome: number
  /** Monthly mortgage principal & interest payment. */
  mortgagePayment: number
  /** Net monthly cash flow = NOI - mortgage P&I. */
  cashFlow: number
}

/**
 * Schedule E tax impact for a rental property in a given year.
 * Captures the tax benefit (or lack thereof) of rental losses
 * after applying passive activity loss rules.
 */
export interface ScheduleETaxResult {
  /** Gross annual rental income (rent x 12 x (1 - vacancy)). */
  grossRentalIncome: number
  /** Total deductions: operating expenses + mortgage interest + depreciation. */
  totalDeductions: number
  /** Net rental income (can be negative = rental loss). */
  netRentalIncome: number
  /** Annual depreciation expense (structure only, straight-line over 27.5 years). */
  depreciation: number
  /**
   * Deductible rental loss after passive activity loss rules.
   * Capped at the lesser of actual loss and passive allowance.
   * Zero if net rental income is positive.
   */
  deductibleLoss: number
  /** Tax benefit = deductibleLoss x marginalTaxRate. */
  taxBenefit: number
}

/**
 * Tax consequences of selling a rental property.
 * Includes depreciation recapture (25%) and capital gains.
 */
export interface RentalSaleTaxResult {
  salePrice: number
  sellingCosts: number
  /** Original basis minus cumulative depreciation. */
  adjustedBasis: number
  /** Total gain = salePrice - sellingCosts - adjustedBasis. */
  totalGain: number
  /** Depreciation recapture tax = input totalDepreciationClaimed x 25%. Always at 25%. */
  depreciationRecaptureTax: number
  /** Capital gain on appreciation above original basis (excludes recapture portion). */
  capitalGain: number
  /** Tax on capital gain at applicable LTCG rate. */
  capitalGainTax: number
  /** Total tax = depreciationRecaptureTax + capitalGainTax. */
  totalTax: number
  /** Net sale proceeds = salePrice - sellingCosts - totalTax - input mortgageBalance. */
  netSaleProceeds: number
}

/**
 * Stress test results for Scenario B — three failure scenarios
 * showing how quickly the user's reserves would deplete.
 */
export interface StressTestResult {
  /** 3 months vacancy (lost rent). */
  vacancy: {
    /** Total shock cost (3 months lost rent). */
    shockCost: number
    /** Months of reserves remaining after absorbing the shock. */
    monthsOfReserves: number
  }
  /** Major repair ($8k — HVAC, roof, plumbing). */
  majorRepair: {
    /** Total repair cost. */
    shockCost: number
    /** Months of reserves remaining after absorbing the shock. */
    monthsOfReserves: number
  }
  /** 20% income drop for 6 months. */
  incomeDisruption: {
    /** Monthly income at 80% of normal. */
    reducedMonthlyIncome: number
    /** Monthly shortfall = obligations - reduced income. */
    monthlyShortfall: number
    /** Months until reserves are exhausted. */
    monthsUntilCrisis: number
  }
  /** 10% home value drop on rental property. */
  marketDownturn: {
    currentEquity: number
    /** Equity after 10% value drop. */
    newEquity: number
    /** Amount underwater (0 if still positive equity). */
    underwaterBy: number
    /** Loss if forced to sell at depressed price (selling costs + underwater amount). */
    forcedSaleLoss: number
  }
}

/**
 * Complete output for a single scenario (Baseline, A, or B).
 */
export interface ScenarioOutput {
  /** Display name for this scenario (e.g. "Scenario B: Keep Current Home as Rental, Buy New Home"). */
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
  /**
   * Tax event from selling the rental property (Scenario B only).
   * Null for Baseline and Scenario A where no rental exit occurs.
   */
  rentalExitTaxEvent: RentalExitTaxEvent | null
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

// ---- Verdict Types --------------------------------------------------------

/**
 * The verdict engine's output — a risk-gated, plain-language recommendation
 * that tells the user which scenario (if any) is the best choice and why.
 *
 * This is the most important thing the user sees. It answers "what should I do?"
 * Every claim in the reasoning is backed by a specific dollar amount or
 * percentage from the model output — no vague language.
 */
export interface VerdictResult {
  /** Which scenario is recommended, or 'none' if all have dealbreakers. */
  recommendation: 'baseline' | 'scenarioA' | 'scenarioB' | 'none'
  /** One-line summary, e.g. "Scenario A is the stronger choice". Under 60 characters. */
  headline: string
  /** 2-4 sentences explaining why, each containing specific dollar amounts. */
  reasoning: string[]
  /** Scenarios eliminated by dealbreakers and the specific reasons why. */
  dealbreakers: { scenario: string; reasons: string[] }[]
  /** Side-by-side comparison of key metrics across all three scenarios. */
  keyMetrics: { label: string; baseline: string; scenarioA: string; scenarioB: string }[]
}

// ---- Sensitivity Analysis Types -------------------------------------------

/**
 * Result of testing a single input variable for its breakeven threshold —
 * the value at which the verdict's recommendation would change.
 *
 * This answers the question: "How wrong can this assumption be before
 * the recommendation flips?" A large margin means the recommendation is
 * robust to that variable; a thin margin means it's fragile.
 */
export interface BreakevenResult {
  /** Human-readable name of the variable tested (e.g., "Home appreciation rate"). */
  inputName: string
  /** The user's current input value for this variable. */
  currentValue: number
  /**
   * Value at which the verdict recommendation would change.
   * If no breakeven exists within the search range, this equals
   * the search boundary (indicating the recommendation holds).
   */
  breakevenValue: number
  /** Direction from the current value toward the breakeven: 'below' means the variable
   *  would need to decrease, 'above' means it would need to increase. */
  direction: 'below' | 'above'
  /**
   * What happens at the breakeven point.
   * E.g., "Scenario B overtakes in net worth" or "Recommendation holds across all tested values".
   */
  consequence: string
  /**
   * How much buffer exists between the current value and the breakeven.
   * - 'comfortable': current value has more than 2x buffer to breakeven
   * - 'thin': 1-2x buffer
   * - 'at_risk': less than 1x buffer (the assumption doesn't have room to be wrong)
   */
  margin: 'comfortable' | 'thin' | 'at_risk'
}

/**
 * Complete sensitivity analysis output — wraps all breakeven results
 * with a human-readable summary.
 */
export interface SensitivityResult {
  /** Breakeven results for each tested variable. */
  breakevens: BreakevenResult[]
  /** One-sentence summary of overall robustness (e.g., "Your recommendation holds under most tested conditions"). */
  summary: string
}

// ---- Scorecard / Feasibility Types ----------------------------------------

/** Feasibility status for a scenario. */
export type FeasibilityStatus = 'ready' | 'tight' | 'not_feasible'

/** Risk level derived from warnings and stress tests. */
export type RiskLevel = 'low' | 'medium' | 'high'

/**
 * Feasibility assessment for a single scenario.
 * Combines a traffic-light status with the underlying reserve data
 * so the UI can show both the badge and the reasoning.
 */
export interface FeasibilityBadge {
  /** Traffic-light status: ready (green), tight (amber), not_feasible (red). */
  status: FeasibilityStatus
  /** Short human-readable label (e.g. "Ready", "Tight — 2.1 months reserves"). */
  label: string
  /** Months of post-closing reserves relative to total monthly obligations. */
  reserveMonths: number
}

/**
 * Per-scenario row in the comparison scorecard.
 * Contains all the key metrics needed for a side-by-side comparison.
 */
export interface ScorecardRow {
  /** Display name of the scenario (e.g. "Baseline (stay put)"). */
  scenarioName: string
  /** Traffic-light feasibility assessment. */
  feasibility: FeasibilityBadge
  /** Year 1 worst-case monthly cash flow (all expenses, vacancy, maintenance). */
  monthlyCashFlow: number
  /** Year 1 best-case monthly cash flow (full rental income, no surprises). */
  monthlyCashFlowBest: number
  /** Net worth at the end of the projection period. */
  finalNetWorth: number
  /** Whether this scenario is the recommended winner. */
  isWinner: boolean
  /** Risk level derived from warning count and severity. */
  riskLevel: RiskLevel
  /** IRA / retirement balance at the end of the projection period. */
  finalIRABalance: number
}

/**
 * Complete scorecard verdict output.
 * Designed for rendering a summary card with a verdict sentence,
 * a 3-row comparison table, and an optional guardrail callout.
 */
export interface VerdictOutput {
  /** 1-2 sentence plain-language verdict explaining the recommendation. */
  verdictText: string
  /** Exactly 3 scorecard rows: [Baseline, Scenario A, Scenario B]. */
  scorecard: [ScorecardRow, ScorecardRow, ScorecardRow]
  /**
   * Optional guardrail callout for decisive situations.
   * Shown when the data is clearly actionable (e.g. "Both scenarios are
   * infeasible" or "Zero retirement savings at age 57").
   * Null when no guardrail condition is triggered.
   */
  guardrailCallout: string | null
}
