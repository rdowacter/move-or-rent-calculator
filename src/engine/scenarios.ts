// ---------------------------------------------------------------------------
// scenarios.ts — Scenario orchestrator
//
// The heart of the financial model. Ties all Phase 1 and Phase 2 engine
// modules together into year-by-year financial projections for three scenarios:
//
//   Baseline: Stay in Kyle, keep IRA, keep commuting
//   Scenario A: Sell Kyle, buy Austin, keep IRA intact + contributing
//   Scenario B: Keep Kyle as rental, withdraw IRA, buy Austin
//
// All functions are pure — zero React, zero DOM, zero side effects.
// ---------------------------------------------------------------------------

import type {
  ScenarioInputs,
  ScenarioOutput,
  ModelOutput,
  YearlySnapshot,
  Warning,
  UpfrontCapital,
  DTIResult,
  RentalExitTaxEvent,
} from './types'

import {
  MONTHS_PER_YEAR,
  PMI_AUTO_CANCELLATION_LTV,
  PMI_REQUEST_CANCELLATION_LTV,
  DTI_HARD_MAX,
  DTI_BACK_END_TARGET,
} from './constants'

import {
  calculateMonthlyPayment,
  calculateOriginalLoanAmount,
} from './mortgage'

import {
  calculateFederalIncomeTax,
  calculateMarginalTaxRate,
  calculateIRAWithdrawalTax,
  getStandardDeduction,
} from './tax'

import {
  calculateAnnualCommuteCost,
  calculateAnnualCommuteSavings,
} from './commute'

import {
  annualDepreciation,
  monthlyRentalCashFlow,
  scheduleETaxImpact,
  rentalSaleTax,
  worstCaseMonthlyRentalCashFlow,
} from './rental'

import {
  calculateUpfrontCapital,
  reserveRunwayMonths,
  stressTest,
  MAJOR_REPAIR_COST,
} from './capital'

import { calculateDTI } from './dti'

// ---------------------------------------------------------------------------
// Stepping Helpers
//
// These advance a single financial variable forward by one year. They are the
// building blocks of the year-by-year loop in each scenario projection.
// Exported for testing; marked @internal — not part of the public API.
// ---------------------------------------------------------------------------

/**
 * @internal
 * Advances a mortgage balance by one year (12 monthly payments).
 *
 * Iterates month-by-month to correctly split each payment into interest
 * and principal portions based on the outstanding balance. This is more
 * accurate than a closed-form approximation because the interest/principal
 * split changes with each payment.
 *
 * @param balance - Remaining mortgage balance at start of year
 * @param annualRate - Annual interest rate as a decimal
 * @param monthlyPayment - Fixed monthly P&I payment
 * @returns Object with ending balance, total principal paid, total interest paid
 */
export function stepMortgageYear(
  balance: number,
  annualRate: number,
  monthlyPayment: number
): { endingBalance: number; principalPaid: number; interestPaid: number } {
  // 0% interest: all payment goes to principal, zero interest
  if (annualRate === 0) {
    const principalPaid = Math.min(balance, monthlyPayment * MONTHS_PER_YEAR)
    return {
      endingBalance: Math.max(0, balance - principalPaid),
      principalPaid,
      interestPaid: 0,
    }
  }

  const monthlyRate = annualRate / MONTHS_PER_YEAR
  let currentBalance = balance
  let totalInterest = 0
  let totalPrincipal = 0

  for (let month = 0; month < MONTHS_PER_YEAR; month++) {
    if (currentBalance <= 0) break

    const interestPayment = currentBalance * monthlyRate
    // Final payment may be partial — don't overpay.
    // Guard against negative principal when interest exceeds payment
    // (e.g., deeply underwater adjustable-rate scenarios).
    const principalPayment = Math.min(
      currentBalance,
      Math.max(0, monthlyPayment - interestPayment)
    )

    totalInterest += interestPayment
    totalPrincipal += principalPayment
    currentBalance -= principalPayment
  }

  return {
    endingBalance: Math.max(0, currentBalance),
    principalPaid: totalPrincipal,
    interestPaid: totalInterest,
  }
}

/**
 * @internal
 * Advances an IRA balance by one year with compound return and contribution.
 *
 * Contribution is added at end of year (conservative model — slightly
 * underestimates growth compared to beginning-of-year contributions).
 *
 * @param balance - IRA balance at start of year
 * @param annualReturn - Expected annual return rate (e.g. 0.07 for 7%)
 * @param annualContribution - Amount contributed at end of year
 * @returns IRA balance at end of year
 */
export function stepIRAYear(
  balance: number,
  annualReturn: number,
  annualContribution: number
): number {
  return balance * (1 + annualReturn) + annualContribution
}

/**
 * @internal
 * Advances a home value by one year of appreciation.
 *
 * @param currentValue - Home value at start of year
 * @param appreciationRate - Annual appreciation rate (e.g. 0.03 for 3%)
 * @returns Home value at end of year
 */
export function stepAppreciationYear(
  currentValue: number,
  appreciationRate: number
): number {
  return currentValue * (1 + appreciationRate)
}

// ---------------------------------------------------------------------------
// Baseline Scenario Projection
// ---------------------------------------------------------------------------

/**
 * Projects the Baseline scenario: stay in Kyle, keep IRA, keep commuting.
 *
 * The simplest scenario — no sale, no rental, no IRA withdrawal. The user
 * continues their current trajectory: pay down Kyle mortgage, grow IRA
 * with contributions, absorb commute costs.
 */
export function projectBaseline(inputs: ScenarioInputs): ScenarioOutput {
  const { personal, retirement, currentHome, commute, costs, projection } =
    inputs

  if (projection.timeHorizonYears < 1) {
    throw new Error('timeHorizonYears must be at least 1')
  }

  // ---- Setup ----

  // Back-calculate original Kyle loan to get the correct monthly payment
  const kyleOriginalLoan = calculateOriginalLoanAmount(
    currentHome.mortgageBalance,
    currentHome.interestRate,
    currentHome.originalLoanTermYears,
    currentHome.yearsIntoLoan
  )
  const kyleMonthlyPayment = calculateMonthlyPayment(
    kyleOriginalLoan,
    currentHome.interestRate,
    currentHome.originalLoanTermYears
  )

  // Remaining term on Kyle mortgage at projection start
  const kyleRemainingPayments =
    (currentHome.originalLoanTermYears - currentHome.yearsIntoLoan) *
    MONTHS_PER_YEAR

  // Upfront capital: baseline has no capital event
  const upfrontCapital = calculateUpfrontCapital({
    scenario: 'baseline',
    homePrice: 0,
    downPaymentPercent: 0,
    closingCostsRate: 0,
    movingCosts: 0,
    liquidSavings: personal.liquidSavings,
  })

  // DTI for baseline: current Kyle mortgage
  const kyleAnnualPropertyTax =
    currentHome.homeValue * currentHome.annualPropertyTaxRate
  const kyleMonthlyHousing =
    kyleMonthlyPayment +
    kyleAnnualPropertyTax / MONTHS_PER_YEAR +
    currentHome.annualInsurance / MONTHS_PER_YEAR +
    currentHome.monthlyHOA

  const dtiResult = calculateDTI({
    scenario: 'baseline',
    grossMonthlyIncome: personal.annualGrossIncome / MONTHS_PER_YEAR,
    primaryHousingCost: kyleMonthlyHousing,
    otherDebtPayments: personal.monthlyDebtPayments,
  })

  // ---- Year-by-year loop ----

  const snapshots: YearlySnapshot[] = []
  let kyleMortgageBalance = currentHome.mortgageBalance
  let kyleHomeValue = currentHome.homeValue
  let iraBalance = retirement.iraBalance
  let liquidSavings = personal.liquidSavings

  // Track how many payments have been made into the loan at projection start
  let paymentsMade = currentHome.yearsIntoLoan * MONTHS_PER_YEAR

  for (let year = 1; year <= projection.timeHorizonYears; year++) {
    // Income with salary growth: Year 1 = base income, growth starts Year 2
    const annualIncome =
      personal.annualGrossIncome *
      Math.pow(1 + personal.annualSalaryGrowthRate, year - 1)

    // Federal tax on taxable income
    const standardDeduction = getStandardDeduction(personal.filingStatus)
    const taxableIncome = Math.max(0, annualIncome - standardDeduction)
    const federalTax = calculateFederalIncomeTax(
      taxableIncome,
      personal.filingStatus
    )

    // Escalate property tax and insurance annually
    const escalatedPropertyTax =
      kyleAnnualPropertyTax *
      Math.pow(1 + costs.propertyTaxEscalationRate, year - 1)
    const escalatedInsurance =
      currentHome.annualInsurance *
      Math.pow(1 + costs.insuranceEscalationRate, year - 1)

    // Step Kyle mortgage (only if payments remain)
    let mortgageResult = { endingBalance: 0, principalPaid: 0, interestPaid: 0 }
    let effectiveMonthlyMortgage = 0
    if (kyleMortgageBalance > 0 && paymentsMade < kyleRemainingPayments + currentHome.yearsIntoLoan * MONTHS_PER_YEAR) {
      mortgageResult = stepMortgageYear(
        kyleMortgageBalance,
        currentHome.interestRate,
        kyleMonthlyPayment
      )
      kyleMortgageBalance = mortgageResult.endingBalance
      effectiveMonthlyMortgage = kyleMonthlyPayment
      paymentsMade += MONTHS_PER_YEAR
    }

    // Step Kyle home value
    kyleHomeValue = stepAppreciationYear(
      kyleHomeValue,
      currentHome.annualAppreciationRate
    )

    // Step IRA: baseline contributes at Scenario A rate (baseline also saves)
    iraBalance = stepIRAYear(
      iraBalance,
      retirement.iraExpectedAnnualReturn,
      retirement.annualIRAContributionScenarioA
    )

    // Commute costs: baseline pays full commute cost
    const annualCommuteCost = calculateAnnualCommuteCost(
      commute.currentRoundTripMiles,
      commute.workDaysPerYear,
      commute.irsMileageRate,
      commute.currentMonthlyTolls
    )

    // Escalate living expenses
    const escalatedLivingExpenses =
      personal.monthlyLivingExpenses *
      Math.pow(1 + costs.generalInflationRate, year - 1)

    // Monthly cash flow calculation
    const monthlyNetIncome = (annualIncome - federalTax) / MONTHS_PER_YEAR
    const monthlyExpenses =
      effectiveMonthlyMortgage +
      escalatedPropertyTax / MONTHS_PER_YEAR +
      escalatedInsurance / MONTHS_PER_YEAR +
      currentHome.monthlyHOA +
      escalatedLivingExpenses +
      personal.monthlyDebtPayments

    const monthlyCashFlow = monthlyNetIncome - monthlyExpenses
    const annualCashFlow = monthlyCashFlow * MONTHS_PER_YEAR - annualCommuteCost

    // Liquid savings accumulate from positive cash flow
    liquidSavings += annualCashFlow

    // Net worth = home equity + IRA + liquid savings
    const currentHomeEquity = kyleHomeValue - kyleMortgageBalance
    const netWorth = currentHomeEquity + iraBalance + liquidSavings

    snapshots.push({
      year,
      netWorth,
      iraBalance,
      currentHomeEquity,
      newHomeEquity: 0,
      currentHomeMortgageBalance: kyleMortgageBalance,
      newHomeMortgageBalance: 0,
      annualCashFlow,
      monthlyCashFlowBestCase: monthlyCashFlow - annualCommuteCost / MONTHS_PER_YEAR,
      monthlyCashFlowWorstCase: monthlyCashFlow - annualCommuteCost / MONTHS_PER_YEAR,
      cumulativeCommuteSavings: 0, // Baseline is the reference — no savings
      annualGrossIncome: annualIncome,
      cashFlowBreakdown: {
        takeHomePay: monthlyNetIncome,
        mortgagePI: effectiveMonthlyMortgage,
        propertyTax: escalatedPropertyTax / MONTHS_PER_YEAR,
        insurance: escalatedInsurance / MONTHS_PER_YEAR,
        pmi: 0,
        hoa: currentHome.monthlyHOA,
        livingExpenses: escalatedLivingExpenses,
        debtPayments: personal.monthlyDebtPayments,
        commuteCost: annualCommuteCost / MONTHS_PER_YEAR,
        rentalIncome: 0,
        rentalMortgagePI: 0,
        rentalPropertyTax: 0,
        rentalInsurance: 0,
        rentalMaintenance: 0,
        rentalManagementFee: 0,
        rentalLandlordCosts: 0,
      },
    })
  }

  // ---- Warnings ----
  const warnings = generateBaselineWarnings(inputs)

  // ---- Reserve runway ----
  // Baseline has no capital event, so initial reserves = personal.liquidSavings.
  // We use the initial value (not accumulated liquidSavings) because reserve
  // runway measures how long the user can survive from their starting position.
  const year1Snapshot = snapshots[0]
  const reserveRunway = reserveRunwayMonths(
    personal.liquidSavings,
    year1Snapshot.monthlyCashFlowBestCase
  )

  return {
    name: 'Baseline: Stay in Kyle',
    yearlySnapshots: snapshots,
    upfrontCapital,
    dtiResult,
    warnings,
    finalNetWorth: snapshots[snapshots.length - 1].netWorth,
    totalIRAValue: snapshots[snapshots.length - 1].iraBalance,
    monthlyReserveRunwayMonths: reserveRunway,
    rentalExitTaxEvent: null,
  }
}

// ---------------------------------------------------------------------------
// Scenario A Projection
// ---------------------------------------------------------------------------

/**
 * Projects Scenario A: sell Kyle at time 0, buy Austin, keep IRA intact.
 *
 * At time 0 the Kyle home is sold, the mortgage is paid off, and net proceeds
 * plus liquid savings fund the Austin down payment and closing costs. The IRA
 * continues to grow with annual contributions.
 */
export function projectScenarioA(inputs: ScenarioInputs): ScenarioOutput {
  const { personal, retirement, currentHome, newHome, commute, costs, projection } =
    inputs

  if (projection.timeHorizonYears < 1) {
    throw new Error('timeHorizonYears must be at least 1')
  }

  // ---- Setup ----

  // Kyle sale at time 0
  const kyleSaleProceeds =
    currentHome.homeValue -
    currentHome.homeValue * currentHome.sellingCostsRate -
    currentHome.mortgageBalance

  // Austin mortgage
  const austinDownPayment =
    newHome.purchasePrice * newHome.downPaymentPercentScenarioA
  const austinLoanAmount = newHome.purchasePrice - austinDownPayment
  const austinMonthlyPayment = calculateMonthlyPayment(
    austinLoanAmount,
    newHome.interestRate,
    newHome.loanTermYears
  )

  // PMI: required when LTV > 80%. At exactly 80% (20% down), no PMI.
  // PMI_REQUEST_CANCELLATION_LTV (0.80) is the threshold above which PMI is required.
  // PMI_AUTO_CANCELLATION_LTV (0.78) is where it auto-drops off later.
  const initialLTV = austinLoanAmount / newHome.purchasePrice
  let pmiActive = initialLTV > PMI_REQUEST_CANCELLATION_LTV

  // Upfront capital
  const upfrontCapital = calculateUpfrontCapital({
    scenario: 'scenarioA',
    homePrice: newHome.purchasePrice,
    downPaymentPercent: newHome.downPaymentPercentScenarioA,
    closingCostsRate: newHome.closingCostsRate,
    movingCosts: costs.movingCosts,
    liquidSavings: personal.liquidSavings,
    homeSaleNetProceeds: kyleSaleProceeds,
  })

  // Post-closing liquid savings
  let liquidSavings = upfrontCapital.surplus

  // DTI for Scenario A
  const austinAnnualPropertyTax =
    newHome.purchasePrice * newHome.annualPropertyTaxRate
  const monthlyPMI = pmiActive
    ? (austinLoanAmount * newHome.annualPMIRate) / MONTHS_PER_YEAR
    : 0
  const austinMonthlyHousing =
    austinMonthlyPayment +
    austinAnnualPropertyTax / MONTHS_PER_YEAR +
    newHome.annualInsurance / MONTHS_PER_YEAR +
    monthlyPMI

  const dtiResult = calculateDTI({
    scenario: 'scenarioA',
    grossMonthlyIncome: personal.annualGrossIncome / MONTHS_PER_YEAR,
    primaryHousingCost: austinMonthlyHousing,
    otherDebtPayments: personal.monthlyDebtPayments,
  })

  // ---- Year-by-year loop ----

  const snapshots: YearlySnapshot[] = []
  let austinMortgageBalance = austinLoanAmount
  let austinHomeValue = newHome.purchasePrice
  let iraBalance = retirement.iraBalance
  let cumulativeCommuteSavings = 0

  for (let year = 1; year <= projection.timeHorizonYears; year++) {
    const annualIncome =
      personal.annualGrossIncome *
      Math.pow(1 + personal.annualSalaryGrowthRate, year - 1)

    const standardDeduction = getStandardDeduction(personal.filingStatus)
    const taxableIncome = Math.max(0, annualIncome - standardDeduction)
    const federalTax = calculateFederalIncomeTax(
      taxableIncome,
      personal.filingStatus
    )

    // Escalate Austin property tax and insurance
    const escalatedPropertyTax =
      austinAnnualPropertyTax *
      Math.pow(1 + costs.propertyTaxEscalationRate, year - 1)
    const escalatedInsurance =
      newHome.annualInsurance *
      Math.pow(1 + costs.insuranceEscalationRate, year - 1)

    // Step Austin mortgage
    const mortgageResult = stepMortgageYear(
      austinMortgageBalance,
      newHome.interestRate,
      austinMonthlyPayment
    )
    austinMortgageBalance = mortgageResult.endingBalance

    // PMI check: drops at 78% LTV of ORIGINAL purchase price (per HPA)
    if (pmiActive && austinMortgageBalance / newHome.purchasePrice <= PMI_AUTO_CANCELLATION_LTV) {
      pmiActive = false
    }
    const currentMonthlyPMI = pmiActive
      ? (austinLoanAmount * newHome.annualPMIRate) / MONTHS_PER_YEAR
      : 0

    // Step Austin home value
    austinHomeValue = stepAppreciationYear(
      austinHomeValue,
      newHome.annualAppreciationRate
    )

    // Step IRA (same contributions as baseline)
    iraBalance = stepIRAYear(
      iraBalance,
      retirement.iraExpectedAnnualReturn,
      retirement.annualIRAContributionScenarioA
    )

    // Commute savings vs baseline (shorter commute in Austin)
    const annualSavings = calculateAnnualCommuteSavings(
      commute.currentRoundTripMiles,
      commute.newRoundTripMiles,
      commute.workDaysPerYear,
      commute.irsMileageRate,
      commute.currentMonthlyTolls,
      commute.newMonthlyTolls
    )
    cumulativeCommuteSavings += annualSavings

    // Escalate living expenses
    const escalatedLivingExpenses =
      personal.monthlyLivingExpenses *
      Math.pow(1 + costs.generalInflationRate, year - 1)

    // Monthly cash flow
    const monthlyNetIncome = (annualIncome - federalTax) / MONTHS_PER_YEAR
    const monthlyExpenses =
      austinMonthlyPayment +
      escalatedPropertyTax / MONTHS_PER_YEAR +
      escalatedInsurance / MONTHS_PER_YEAR +
      currentMonthlyPMI +
      escalatedLivingExpenses +
      personal.monthlyDebtPayments

    // Austin commute cost (new, shorter commute)
    const annualNewCommuteCost = calculateAnnualCommuteCost(
      commute.newRoundTripMiles,
      commute.workDaysPerYear,
      commute.irsMileageRate,
      commute.newMonthlyTolls
    )

    const monthlyCashFlow = monthlyNetIncome - monthlyExpenses - annualNewCommuteCost / MONTHS_PER_YEAR
    const annualCashFlow = monthlyCashFlow * MONTHS_PER_YEAR

    liquidSavings += annualCashFlow

    const newHomeEquity = austinHomeValue - austinMortgageBalance
    const netWorth = newHomeEquity + iraBalance + liquidSavings

    snapshots.push({
      year,
      netWorth,
      iraBalance,
      currentHomeEquity: 0, // Kyle sold at time 0
      newHomeEquity,
      currentHomeMortgageBalance: 0,
      newHomeMortgageBalance: austinMortgageBalance,
      annualCashFlow,
      monthlyCashFlowBestCase: monthlyCashFlow,
      monthlyCashFlowWorstCase: monthlyCashFlow,
      cumulativeCommuteSavings,
      annualGrossIncome: annualIncome,
      cashFlowBreakdown: {
        takeHomePay: monthlyNetIncome,
        mortgagePI: austinMonthlyPayment,
        propertyTax: escalatedPropertyTax / MONTHS_PER_YEAR,
        insurance: escalatedInsurance / MONTHS_PER_YEAR,
        pmi: currentMonthlyPMI,
        hoa: 0,
        livingExpenses: escalatedLivingExpenses,
        debtPayments: personal.monthlyDebtPayments,
        commuteCost: annualNewCommuteCost / MONTHS_PER_YEAR,
        rentalIncome: 0,
        rentalMortgagePI: 0,
        rentalPropertyTax: 0,
        rentalInsurance: 0,
        rentalMaintenance: 0,
        rentalManagementFee: 0,
        rentalLandlordCosts: 0,
      },
    })
  }

  // ---- Warnings ----
  const warnings = generateScenarioAWarnings(inputs, snapshots, dtiResult, upfrontCapital)

  // Reserve runway
  const reserveRunway = reserveRunwayMonths(
    Math.max(0, upfrontCapital.surplus),
    snapshots[0].monthlyCashFlowBestCase
  )

  return {
    name: 'Scenario A: Sell Kyle, Buy Austin',
    yearlySnapshots: snapshots,
    upfrontCapital,
    dtiResult,
    warnings,
    finalNetWorth: snapshots[snapshots.length - 1].netWorth,
    totalIRAValue: snapshots[snapshots.length - 1].iraBalance,
    monthlyReserveRunwayMonths: reserveRunway,
    rentalExitTaxEvent: null,
  }
}

// ---------------------------------------------------------------------------
// Scenario B Projection
// ---------------------------------------------------------------------------

/**
 * Projects Scenario B: keep Kyle as rental, withdraw IRA, buy Austin.
 *
 * The most complex scenario. The IRA is fully withdrawn (triggering taxes
 * and penalties), Kyle becomes a rental property, and a new Austin home is
 * purchased with a smaller down payment (requiring PMI). The rental property
 * is sold at the planned exit year, triggering depreciation recapture.
 */
export function projectScenarioB(inputs: ScenarioInputs): ScenarioOutput {
  const { personal, retirement, currentHome, newHome, commute, costs, projection } =
    inputs

  if (projection.timeHorizonYears < 1) {
    throw new Error('timeHorizonYears must be at least 1')
  }

  // ---- Setup ----

  // IRA withdrawal at time 0 — withdraw the lesser of requested amount and available balance
  const iraWithdrawalAmount = Math.min(
    retirement.iraWithdrawalAmountScenarioB,
    retirement.iraBalance
  )
  const iraWithdrawalResult = calculateIRAWithdrawalTax(
    iraWithdrawalAmount,
    personal.annualGrossIncome,
    personal.filingStatus,
    personal.age,
    retirement.iraType
  )

  // Kyle rental setup
  const kyleOriginalLoan = calculateOriginalLoanAmount(
    currentHome.mortgageBalance,
    currentHome.interestRate,
    currentHome.originalLoanTermYears,
    currentHome.yearsIntoLoan
  )
  const kyleMonthlyPayment = calculateMonthlyPayment(
    kyleOriginalLoan,
    currentHome.interestRate,
    currentHome.originalLoanTermYears
  )

  // Landlord insurance is more expensive than homeowner insurance
  const landlordInsuranceAnnual =
    currentHome.annualInsurance * (1 + currentHome.landlordInsurancePremiumIncrease)

  // Depreciation is on ORIGINAL home value at conversion, not appreciated value
  // Uses the user-configured land value percentage to determine the depreciable basis
  const annualDepreciationAmount = annualDepreciation(currentHome.homeValue, currentHome.landValuePercentage)

  // Austin mortgage (smaller down payment in Scenario B)
  const austinDownPayment =
    newHome.purchasePrice * newHome.downPaymentPercentScenarioB
  const austinLoanAmount = newHome.purchasePrice - austinDownPayment
  const austinMonthlyPayment = calculateMonthlyPayment(
    austinLoanAmount,
    newHome.interestRate,
    newHome.loanTermYears
  )

  // PMI: 10% down = 90% LTV, definitely requires PMI
  // PMI is required when LTV > 80% (PMI_REQUEST_CANCELLATION_LTV)
  const initialAustinLTV = austinLoanAmount / newHome.purchasePrice
  let pmiActive = initialAustinLTV > PMI_REQUEST_CANCELLATION_LTV

  // Upfront capital
  const upfrontCapital = calculateUpfrontCapital({
    scenario: 'scenarioB',
    homePrice: newHome.purchasePrice,
    downPaymentPercent: newHome.downPaymentPercentScenarioB,
    closingCostsRate: newHome.closingCostsRate,
    movingCosts: costs.movingCosts,
    liquidSavings: personal.liquidSavings,
    iraWithdrawalNetProceeds: iraWithdrawalResult.netProceeds,
  })

  // Post-closing liquid savings
  let liquidSavings = upfrontCapital.surplus

  // DTI for Scenario B: includes rental income credit
  const austinAnnualPropertyTax =
    newHome.purchasePrice * newHome.annualPropertyTaxRate
  const monthlyPMI = pmiActive
    ? (austinLoanAmount * newHome.annualPMIRate) / MONTHS_PER_YEAR
    : 0
  const austinMonthlyHousing =
    austinMonthlyPayment +
    austinAnnualPropertyTax / MONTHS_PER_YEAR +
    newHome.annualInsurance / MONTHS_PER_YEAR +
    monthlyPMI

  // Kyle PITI for DTI (lenders look at full PITI, not just P&I)
  const kyleAnnualPropertyTax =
    currentHome.homeValue * currentHome.annualPropertyTaxRate
  const kyleRentalPITI =
    kyleMonthlyPayment +
    kyleAnnualPropertyTax / MONTHS_PER_YEAR +
    landlordInsuranceAnnual / MONTHS_PER_YEAR

  const dtiResult = calculateDTI({
    scenario: 'scenarioB',
    grossMonthlyIncome: personal.annualGrossIncome / MONTHS_PER_YEAR,
    primaryHousingCost: austinMonthlyHousing,
    otherDebtPayments: personal.monthlyDebtPayments,
    rentalMortgagePayment: kyleRentalPITI,
    expectedMonthlyRent: currentHome.expectedMonthlyRent,
    rentalIncomeCreditRate: currentHome.rentalIncomeDTICreditRate,
  })

  // ---- Year-by-year loop ----

  const snapshots: YearlySnapshot[] = []
  let kyleMortgageBalance = currentHome.mortgageBalance
  let kyleHomeValue = currentHome.homeValue
  let austinMortgageBalance = austinLoanAmount
  let austinHomeValue = newHome.purchasePrice
  let iraBalance = retirement.iraBalance - iraWithdrawalAmount // Remaining IRA after withdrawal
  let cumulativeDepreciation = 0
  let cumulativeCommuteSavings = 0
  let rentalActive = true
  let rentalExitTaxEvent: RentalExitTaxEvent | null = null

  for (let year = 1; year <= projection.timeHorizonYears; year++) {
    const annualIncome =
      personal.annualGrossIncome *
      Math.pow(1 + personal.annualSalaryGrowthRate, year - 1)

    const standardDeduction = getStandardDeduction(personal.filingStatus)

    // Escalate Austin costs
    const escalatedAustinPropertyTax =
      austinAnnualPropertyTax *
      Math.pow(1 + costs.propertyTaxEscalationRate, year - 1)
    const escalatedAustinInsurance =
      newHome.annualInsurance *
      Math.pow(1 + costs.insuranceEscalationRate, year - 1)

    // Escalate living expenses
    const escalatedLivingExpenses =
      personal.monthlyLivingExpenses *
      Math.pow(1 + costs.generalInflationRate, year - 1)

    // ---- Rental activity (if before exit year) ----
    let rentalGrossIncome: number | undefined
    let depreciationExpense: number | undefined
    let passiveLossAllowed: number | undefined
    let passiveLossSuspended: number | undefined
    let rentalMonthlyCashFlow = 0
    let worstCaseMonthlyCashFlow = 0
    let schedulETaxBenefit = 0
    let kyleMortgageInterest = 0
    let additionalLandlordCosts = 0
    // Breakdown fields for the rental section of CashFlowBreakdown
    let rentalEffectiveGrossRent = 0
    let rentalMonthlyPropertyTax = 0
    let rentalMonthlyInsurance = 0
    let rentalMonthlyMaintenance = 0
    let rentalMonthlyManagementFee = 0

    // When plannedRentalExitYear is null, the rental is held indefinitely (never sold).
    const rentalActiveThisYear = rentalActive && (projection.plannedRentalExitYear === null || year <= projection.plannedRentalExitYear)
    if (rentalActiveThisYear) {
      // Escalate Kyle rental property costs
      const escalatedKylePropertyTax =
        kyleAnnualPropertyTax *
        Math.pow(1 + costs.propertyTaxEscalationRate, year - 1)
      const escalatedKyleInsurance =
        landlordInsuranceAnnual *
        Math.pow(1 + costs.insuranceEscalationRate, year - 1)

      // Escalate rent
      const escalatedMonthlyRent =
        currentHome.expectedMonthlyRent *
        Math.pow(1 + currentHome.annualRentGrowthRate, year - 1)

      // Maintenance based on current (appreciated) home value
      const annualMaintenance =
        kyleHomeValue * currentHome.maintenanceReserveRate

      // Step Kyle mortgage
      const kyleMortgageResult = stepMortgageYear(
        kyleMortgageBalance,
        currentHome.interestRate,
        kyleMonthlyPayment
      )
      kyleMortgageBalance = kyleMortgageResult.endingBalance
      kyleMortgageInterest = kyleMortgageResult.interestPaid

      // Step Kyle home value
      kyleHomeValue = stepAppreciationYear(
        kyleHomeValue,
        currentHome.annualAppreciationRate
      )

      // Rental cash flow
      const rentalCF = monthlyRentalCashFlow({
        monthlyRent: escalatedMonthlyRent,
        monthlyMortgagePI: kyleMonthlyPayment,
        annualPropertyTax: escalatedKylePropertyTax,
        annualInsurance: escalatedKyleInsurance,
        annualMaintenance,
        monthlyHOA: currentHome.monthlyHOA,
        vacancyRate: currentHome.vacancyRate,
        managementFeeRate: currentHome.propertyManagementFeeRate,
      })
      rentalMonthlyCashFlow = rentalCF.cashFlow

      // Capture breakdown fields for the CashFlowBreakdown
      rentalEffectiveGrossRent = rentalCF.effectiveGrossRent
      rentalMonthlyPropertyTax = rentalCF.itemizedExpenses.propertyTax
      rentalMonthlyInsurance = rentalCF.itemizedExpenses.insurance
      rentalMonthlyMaintenance = rentalCF.itemizedExpenses.maintenance
      rentalMonthlyManagementFee = rentalCF.itemizedExpenses.managementFee

      // Worst case: add maintenance shock amortized monthly
      // Uses MAJOR_REPAIR_COST (e.g. HVAC replacement) amortized over 12 months
      worstCaseMonthlyCashFlow = worstCaseMonthlyRentalCashFlow(
        rentalCF,
        MAJOR_REPAIR_COST / MONTHS_PER_YEAR
      )

      // Depreciation on ORIGINAL home value at conversion
      depreciationExpense = annualDepreciationAmount
      cumulativeDepreciation += annualDepreciationAmount

      // Schedule E tax impact
      // AGI for passive loss calculation = gross income (before rental adjustment)
      const agi = annualIncome
      const marginalRate = calculateMarginalTaxRate(
        Math.max(0, annualIncome - standardDeduction),
        personal.filingStatus
      )

      const scheduleEResult = scheduleETaxImpact({
        annualRentalIncome: rentalCF.effectiveGrossRent * MONTHS_PER_YEAR,
        annualOperatingExpenses: rentalCF.totalExpenses * MONTHS_PER_YEAR,
        annualMortgageInterest: kyleMortgageInterest,
        annualDepreciation: annualDepreciationAmount,
        agi,
        marginalTaxRate: marginalRate,
      })

      rentalGrossIncome = rentalCF.effectiveGrossRent * MONTHS_PER_YEAR
      passiveLossAllowed = scheduleEResult.deductibleLoss
      passiveLossSuspended =
        scheduleEResult.netRentalIncome < 0
          ? Math.max(
              0,
              Math.abs(scheduleEResult.netRentalIncome) -
                scheduleEResult.deductibleLoss
            )
          : 0
      schedulETaxBenefit = scheduleEResult.taxBenefit

      // Turnover costs every N years
      if (
        currentHome.tenantTurnoverFrequencyYears > 0 &&
        year % Math.round(currentHome.tenantTurnoverFrequencyYears) === 0
      ) {
        additionalLandlordCosts += currentHome.costPerTurnover
      }

      // Additional annual landlord costs: tax prep + umbrella insurance
      additionalLandlordCosts +=
        costs.additionalTaxPrepCost + costs.umbrellaInsuranceAnnualCost

      // ---- Rental exit event (only if an explicit exit year is set) ----
      if (projection.plannedRentalExitYear !== null && year === projection.plannedRentalExitYear) {
        const saleTaxResult = rentalSaleTax({
          salePrice: kyleHomeValue,
          originalBasis: currentHome.homeValue,
          totalDepreciationClaimed: cumulativeDepreciation,
          sellingCostRate: currentHome.sellingCostsRate,
          yearsOwned: currentHome.yearsIntoLoan + year,
          taxableIncome: Math.max(0, annualIncome - standardDeduction),
          filingStatus: personal.filingStatus,
          mortgageBalance: kyleMortgageBalance,
        })

        rentalExitTaxEvent = {
          totalDepreciationClaimed: cumulativeDepreciation,
          depreciationRecaptureTax: saleTaxResult.depreciationRecaptureTax,
          capitalGain: saleTaxResult.capitalGain,
          capitalGainsTax: saleTaxResult.capitalGainTax,
          netSaleProceeds: saleTaxResult.netSaleProceeds,
        }

        // Add net sale proceeds to liquid savings
        liquidSavings += saleTaxResult.netSaleProceeds

        // Kyle mortgage is paid off from sale proceeds
        kyleMortgageBalance = 0
        rentalActive = false
      }
    } else if (!rentalActive) {
      // Post-exit: no rental activity
      // Kyle equity is 0 after sale
    }

    // Step Austin mortgage
    const austinMortgageResult = stepMortgageYear(
      austinMortgageBalance,
      newHome.interestRate,
      austinMonthlyPayment
    )
    austinMortgageBalance = austinMortgageResult.endingBalance

    // PMI check on Austin: drops at 78% LTV of ORIGINAL purchase price
    if (
      pmiActive &&
      austinMortgageBalance / newHome.purchasePrice <=
        PMI_AUTO_CANCELLATION_LTV
    ) {
      pmiActive = false
    }
    const currentMonthlyPMI = pmiActive
      ? (austinLoanAmount * newHome.annualPMIRate) / MONTHS_PER_YEAR
      : 0

    // Step Austin home value
    austinHomeValue = stepAppreciationYear(
      austinHomeValue,
      newHome.annualAppreciationRate
    )

    // Step IRA: starts at $0, contributions at Scenario B rate
    iraBalance = stepIRAYear(
      iraBalance,
      retirement.iraExpectedAnnualReturn,
      retirement.annualIRAContributionScenarioB
    )

    // Federal tax (adjusted for Schedule E benefit if rental active)
    const taxableIncome = Math.max(0, annualIncome - standardDeduction)
    const federalTax =
      calculateFederalIncomeTax(taxableIncome, personal.filingStatus) -
      schedulETaxBenefit

    // Commute savings (Austin has shorter commute)
    const annualSavings = calculateAnnualCommuteSavings(
      commute.currentRoundTripMiles,
      commute.newRoundTripMiles,
      commute.workDaysPerYear,
      commute.irsMileageRate,
      commute.currentMonthlyTolls,
      commute.newMonthlyTolls
    )
    cumulativeCommuteSavings += annualSavings

    const annualNewCommuteCost = calculateAnnualCommuteCost(
      commute.newRoundTripMiles,
      commute.workDaysPerYear,
      commute.irsMileageRate,
      commute.newMonthlyTolls
    )

    // Monthly cash flow
    const monthlyNetIncome = (annualIncome - federalTax) / MONTHS_PER_YEAR
    const monthlyExpenses =
      austinMonthlyPayment +
      escalatedAustinPropertyTax / MONTHS_PER_YEAR +
      escalatedAustinInsurance / MONTHS_PER_YEAR +
      currentMonthlyPMI +
      escalatedLivingExpenses +
      personal.monthlyDebtPayments +
      annualNewCommuteCost / MONTHS_PER_YEAR

    // Add rental cash flow (positive helps, negative hurts)
    const monthlyCashFlowBest =
      monthlyNetIncome -
      monthlyExpenses +
      (rentalActiveThisYear ? rentalMonthlyCashFlow : 0) -
      additionalLandlordCosts / MONTHS_PER_YEAR

    const monthlyCashFlowWorst =
      monthlyNetIncome -
      monthlyExpenses +
      (rentalActiveThisYear ? worstCaseMonthlyCashFlow : 0) -
      additionalLandlordCosts / MONTHS_PER_YEAR

    const annualCashFlow = monthlyCashFlowBest * MONTHS_PER_YEAR

    // Liquid savings: accumulate from cash flow
    // (Rental exit proceeds already added above when year === plannedRentalExitYear)
    liquidSavings += annualCashFlow

    // Net worth
    const kyleEquity = rentalActiveThisYear
      ? kyleHomeValue - kyleMortgageBalance
      : 0
    const austinEquity = austinHomeValue - austinMortgageBalance
    const netWorth = austinEquity + kyleEquity + iraBalance + liquidSavings

    snapshots.push({
      year,
      netWorth,
      iraBalance,
      currentHomeEquity: kyleEquity,
      newHomeEquity: austinEquity,
      currentHomeMortgageBalance: kyleMortgageBalance,
      newHomeMortgageBalance: austinMortgageBalance,
      annualCashFlow,
      monthlyCashFlowBestCase: monthlyCashFlowBest,
      monthlyCashFlowWorstCase: monthlyCashFlowWorst,
      cumulativeCommuteSavings,
      annualGrossIncome: annualIncome,
      rentalGrossIncome,
      depreciationExpense,
      passiveLossAllowed,
      passiveLossSuspended,
      cashFlowBreakdown: {
        takeHomePay: monthlyNetIncome,
        mortgagePI: austinMonthlyPayment,
        propertyTax: escalatedAustinPropertyTax / MONTHS_PER_YEAR,
        insurance: escalatedAustinInsurance / MONTHS_PER_YEAR,
        pmi: currentMonthlyPMI,
        hoa: 0,
        livingExpenses: escalatedLivingExpenses,
        debtPayments: personal.monthlyDebtPayments,
        commuteCost: annualNewCommuteCost / MONTHS_PER_YEAR,
        rentalIncome: rentalEffectiveGrossRent,
        rentalMortgagePI: rentalActiveThisYear ? kyleMonthlyPayment : 0,
        rentalPropertyTax: rentalMonthlyPropertyTax,
        rentalInsurance: rentalMonthlyInsurance,
        rentalMaintenance: rentalMonthlyMaintenance,
        rentalManagementFee: rentalMonthlyManagementFee,
        rentalLandlordCosts: additionalLandlordCosts / MONTHS_PER_YEAR,
      },
    })
  }

  // ---- Stress test using year 1 actual monthly cash flow ----
  // This must run AFTER the year-by-year loop so we have real cash flow data
  // instead of a placeholder. Uses year 1 best-case monthly cash flow as the
  // net position, which represents the borrower's actual monthly surplus/deficit.
  const initialStressTest = stressTest({
    postClosingReserves: Math.max(0, upfrontCapital.surplus),
    monthlyNetPosition: snapshots[0].monthlyCashFlowBestCase,
    monthlyRent: currentHome.expectedMonthlyRent,
    monthlyGrossIncome: personal.annualGrossIncome / MONTHS_PER_YEAR,
    monthlyObligations:
      austinMonthlyHousing +
      kyleMonthlyPayment +
      personal.monthlyLivingExpenses +
      personal.monthlyDebtPayments,
    homeValue: currentHome.homeValue,
    mortgageBalance: currentHome.mortgageBalance,
    sellingCostRate: currentHome.sellingCostsRate,
  })

  // ---- Warnings ----
  const warnings = generateScenarioBWarnings(
    inputs,
    snapshots,
    dtiResult,
    upfrontCapital,
    initialStressTest,
    iraWithdrawalResult.totalTax
  )

  // Reserve runway
  const reserveRunway = reserveRunwayMonths(
    Math.max(0, upfrontCapital.surplus),
    snapshots[0].monthlyCashFlowBestCase
  )

  return {
    name: 'Scenario B: Keep Kyle as Rental, Buy Austin',
    yearlySnapshots: snapshots,
    upfrontCapital,
    dtiResult,
    warnings,
    finalNetWorth: snapshots[snapshots.length - 1].netWorth,
    totalIRAValue: snapshots[snapshots.length - 1].iraBalance,
    monthlyReserveRunwayMonths: reserveRunway,
    rentalExitTaxEvent,
  }
}

// ---------------------------------------------------------------------------
// Model Orchestrator
// ---------------------------------------------------------------------------

/**
 * Main entry point — runs all three scenario projections and returns
 * the complete model output ready for UI consumption.
 *
 * @param inputs - Complete scenario inputs
 * @returns ModelOutput with baseline, scenarioA, and scenarioB results
 */
export function runModel(inputs: ScenarioInputs): ModelOutput {
  return {
    baseline: projectBaseline(inputs),
    scenarioA: projectScenarioA(inputs),
    scenarioB: projectScenarioB(inputs),
  }
}

// ---------------------------------------------------------------------------
// Warning Generation
// ---------------------------------------------------------------------------

function generateBaselineWarnings(
  _inputs: ScenarioInputs
): Warning[] {
  const warnings: Warning[] = []

  // Retirement adequacy removed — the IRA trajectory chart shows the projection,
  // let the user judge what's adequate for their situation.

  return warnings
}

function generateScenarioAWarnings(
  _inputs: ScenarioInputs,
  snapshots: YearlySnapshot[],
  dtiResult: DTIResult,
  upfrontCapital: UpfrontCapital
): Warning[] {
  const warnings: Warning[] = []
  const year1 = snapshots[0]

  // DTI warnings
  if (dtiResult.backEndDTI > DTI_HARD_MAX) {
    warnings.push({
      category: 'lending',
      severity: 'critical',
      message: `Your DTI ratio is ${(dtiResult.backEndDTI * 100).toFixed(1)}% — above the 43% maximum for a qualified mortgage. Most lenders will not approve this loan.`,
    })
  } else if (dtiResult.backEndDTI > DTI_BACK_END_TARGET) {
    warnings.push({
      category: 'lending',
      severity: 'warning',
      message: `Your DTI ratio is ${(dtiResult.backEndDTI * 100).toFixed(1)}%, above the 36% conventional target. You may face higher interest rates or need a larger down payment.`,
    })
  }

  // Liquidity: negative monthly cash flow
  if (year1.monthlyCashFlowBestCase < 0) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `You'd spend $${Math.round(Math.abs(year1.monthlyCashFlowBestCase)).toLocaleString()} more per month than you earn. You'd need to draw from savings every month to stay afloat.`,
      dollarImpact: Math.abs(year1.monthlyCashFlowBestCase) * MONTHS_PER_YEAR,
    })
  }

  // Capital shortfall
  if (upfrontCapital.surplus < 0) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `You're $${Math.round(Math.abs(upfrontCapital.surplus)).toLocaleString()} short of the cash needed to execute this plan. You'd need additional savings, a gift, or a loan to close.`,
      dollarImpact: Math.abs(upfrontCapital.surplus),
    })
  }

  // Reserve runway
  const reserveRunway = reserveRunwayMonths(
    Math.max(0, upfrontCapital.surplus),
    year1.monthlyCashFlowBestCase
  )
  if (reserveRunway < 3) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `After closing, you'd have less than ${Math.ceil(reserveRunway)} months of savings. An unexpected expense like a car repair or medical bill would require borrowing.`,
    })
  } else if (reserveRunway < 6) {
    warnings.push({
      category: 'liquidity',
      severity: 'warning',
      message: `After closing, you'd have about ${Math.round(reserveRunway)} months of savings — below the 6-month cushion financial advisors recommend.`,
    })
  }

  return warnings
}

function generateScenarioBWarnings(
  inputs: ScenarioInputs,
  snapshots: YearlySnapshot[],
  dtiResult: DTIResult,
  upfrontCapital: UpfrontCapital,
  stressTestResult: ReturnType<typeof stressTest>,
  iraWithdrawalTaxCost: number
): Warning[] {
  const warnings: Warning[] = []
  const year1 = snapshots[0]

  // DTI warnings
  if (dtiResult.backEndDTI > DTI_HARD_MAX) {
    warnings.push({
      category: 'lending',
      severity: 'critical',
      message: `With two mortgages, your DTI ratio is ${(dtiResult.backEndDTI * 100).toFixed(1)}% — above the 43% maximum. Most lenders will not approve the Austin mortgage.`,
    })
  } else if (dtiResult.backEndDTI > DTI_BACK_END_TARGET) {
    warnings.push({
      category: 'lending',
      severity: 'warning',
      message: `With two mortgages, your DTI ratio is ${(dtiResult.backEndDTI * 100).toFixed(1)}%, above the 36% target. You may face higher rates or stricter requirements.`,
    })
  }

  // Liquidity: negative monthly cash flow
  if (year1.monthlyCashFlowBestCase < 0) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `Two mortgages plus expenses exceed your income by $${Math.round(Math.abs(year1.monthlyCashFlowBestCase)).toLocaleString()}/mo. Even with rental income, you'd lose money every month.`,
      dollarImpact: Math.abs(year1.monthlyCashFlowBestCase) * MONTHS_PER_YEAR,
    })
  }

  // Capital shortfall
  if (upfrontCapital.surplus < 0) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `You're $${Math.round(Math.abs(upfrontCapital.surplus)).toLocaleString()} short of the cash needed. The IRA withdrawal after taxes and penalties doesn't cover the down payment and closing costs.`,
      dollarImpact: Math.abs(upfrontCapital.surplus),
    })
  }

  // Reserve runway
  const reserveRunway = reserveRunwayMonths(
    Math.max(0, upfrontCapital.surplus),
    year1.monthlyCashFlowBestCase
  )
  if (reserveRunway < 3) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `After closing, you'd have less than ${Math.ceil(reserveRunway)} months of savings. With two properties, any repair, vacancy, or emergency would require borrowing or credit cards.`,
    })
  } else if (reserveRunway < 6) {
    warnings.push({
      category: 'liquidity',
      severity: 'warning',
      message: `After closing, you'd have about ${Math.round(reserveRunway)} months of savings. With two properties to maintain, financial advisors recommend at least 6 months.`,
    })
  }

  // IRA withdrawal warning
  const withdrawalAmount = Math.min(
    inputs.retirement.iraWithdrawalAmountScenarioB,
    inputs.retirement.iraBalance
  )
  const remainingIRA = inputs.retirement.iraBalance - withdrawalAmount
  if (withdrawalAmount > 0) {
    if (remainingIRA === 0) {
      warnings.push({
        category: 'retirement',
        severity: 'warning',
        message: `Withdrawing your entire IRA at age ${inputs.personal.age} costs $${Math.round(iraWithdrawalTaxCost).toLocaleString()} in taxes and penalties, and leaves you with $0 in retirement savings.`,
        dollarImpact: iraWithdrawalTaxCost,
      })
    } else {
      warnings.push({
        category: 'retirement',
        severity: 'warning',
        message: `Withdrawing $${Math.round(withdrawalAmount).toLocaleString()} from your IRA at age ${inputs.personal.age} costs $${Math.round(iraWithdrawalTaxCost).toLocaleString()} in taxes and penalties, leaving $${Math.round(remainingIRA).toLocaleString()} invested.`,
        dollarImpact: iraWithdrawalTaxCost,
      })
    }
  }

  // Passive loss phase-out: check if AGI >= $150k
  const year1Income = snapshots[0].annualGrossIncome
  if (year1Income >= 150_000) {
    warnings.push({
      category: 'tax',
      severity: 'info',
      message: `At your income level ($${Math.round(year1Income).toLocaleString()}), you can't deduct rental losses against your W-2 income. The tax benefit of the rental is eliminated.`,
    })
  }

  // Stress test warnings — only flag if truly critical, details are in the Stress Tests section
  if (stressTestResult.vacancyAndMaintenance.monthsOfReserves < 3) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `A $${Math.round(stressTestResult.vacancyAndMaintenance.shockCost).toLocaleString()} vacancy + repair event would wipe out your remaining savings. You'd need to borrow or use credit cards.`,
      dollarImpact: stressTestResult.vacancyAndMaintenance.shockCost,
    })
  }

  if (stressTestResult.incomeDisruption.monthsUntilCrisis < 3) {
    warnings.push({
      category: 'liquidity',
      severity: 'critical',
      message: `A 20% income drop would leave you unable to cover both mortgages within ${Math.ceil(stressTestResult.incomeDisruption.monthsUntilCrisis)} months.`,
    })
  }

  if (stressTestResult.marketDownturn.underwaterBy > 0) {
    warnings.push({
      category: 'market',
      severity: 'warning',
      message: `If home values drop 10%, the Kyle property would be underwater by $${Math.round(stressTestResult.marketDownturn.underwaterBy).toLocaleString()} — you'd owe more than it's worth.`,
      dollarImpact: stressTestResult.marketDownturn.underwaterBy,
    })
  }

  return warnings
}
