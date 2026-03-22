// ---------------------------------------------------------------------------
// rental.ts — Rental property cash flow, depreciation, and tax calculations
//
// Pure financial math functions for modeling the current home as a rental
// property in Scenario B. Covers: straight-line depreciation, monthly cash
// flow analysis, Schedule E tax impact with passive activity loss rules,
// and rental sale tax including depreciation recapture.
//
// These functions have ZERO UI dependencies and are fully testable in isolation.
// ---------------------------------------------------------------------------

import type {
  FilingStatus,
  RentalCashFlowResult,
  ScheduleETaxResult,
  RentalSaleTaxResult,
} from './types'

import {
  RESIDENTIAL_DEPRECIATION_YEARS,
  DEPRECIATION_RECAPTURE_RATE,
  PASSIVE_LOSS_MAX_OFFSET,
  PASSIVE_LOSS_PHASE_OUT_START,
  PASSIVE_LOSS_PHASE_OUT_END,
  LTCG_ZERO_RATE_THRESHOLD,
  LTCG_TWENTY_PERCENT_THRESHOLD,
  LTCG_RATE_ZERO,
  LTCG_RATE_FIFTEEN,
  LTCG_RATE_TWENTY,
  MONTHS_PER_YEAR,
} from './constants'

// ---------------------------------------------------------------------------
// annualDepreciation
// ---------------------------------------------------------------------------

/**
 * Calculates annual straight-line depreciation for a residential rental property.
 *
 * Depreciation uses straight-line method over 27.5 years per IRS residential
 * rental rules. Land (est. 15% of value) is excluded because land is not a
 * depreciable asset. Only the structure portion is depreciated.
 *
 * Source: IRC §168(c)(1); IRS Publication 946
 *
 * @param homeValue - Total property value (land + structure)
 * @param landValuePercentage - Fraction of home value attributable to land (e.g. 0.15 for 15%).
 *   Defaults to LAND_VALUE_PERCENTAGE constant (0.15) if not provided.
 *   Can be determined by county tax assessor's allocation or an appraisal.
 * @returns Annual depreciation expense in dollars
 */
export function annualDepreciation(homeValue: number, landValuePercentage = 0.15): number {
  if (homeValue <= 0) return 0

  // Depreciable basis excludes land — land is not a depreciable asset per IRC §167.
  // The landValuePercentage is configurable because actual land/structure splits vary
  // by property and can be determined by county tax assessor's allocation or an appraisal.
  const depreciableBasis = homeValue * (1 - landValuePercentage)

  // Straight-line depreciation over 27.5 years for residential rental property (IRC §168(c)(1))
  return depreciableBasis / RESIDENTIAL_DEPRECIATION_YEARS
}

// ---------------------------------------------------------------------------
// monthlyRentalCashFlow
// ---------------------------------------------------------------------------

/** Input parameters for monthly rental cash flow calculation. */
export interface MonthlyRentalCashFlowInputs {
  monthlyRent: number
  monthlyMortgagePI: number
  annualPropertyTax: number
  annualInsurance: number
  annualMaintenance: number
  monthlyHOA: number
  vacancyRate: number
  managementFeeRate: number
}

/**
 * Calculates the monthly cash flow breakdown for a rental property.
 *
 * Effective gross rent accounts for expected vacancy. Management fees are
 * calculated on collected rent (not gross), because the manager doesn't
 * get paid when the property is vacant. NOI excludes mortgage debt service
 * to match standard real estate accounting.
 *
 * @param inputs - Rental property financial inputs
 * @returns Detailed monthly cash flow breakdown
 */
export function monthlyRentalCashFlow(
  inputs: MonthlyRentalCashFlowInputs
): RentalCashFlowResult {
  const {
    monthlyRent,
    monthlyMortgagePI,
    annualPropertyTax,
    annualInsurance,
    annualMaintenance,
    monthlyHOA,
    vacancyRate,
    managementFeeRate,
  } = inputs

  // Effective gross rent accounts for expected vacancy
  const effectiveGrossRent = monthlyRent * (1 - vacancyRate)

  // Vacancy allowance is the expected lost rent due to unoccupied periods
  const vacancyAllowance = monthlyRent * vacancyRate

  // Management fee is on collected (effective) rent, not gross —
  // the manager doesn't earn fees during vacancy
  const managementFee = effectiveGrossRent * managementFeeRate

  // Convert annual figures to monthly
  const monthlyPropertyTax = annualPropertyTax / MONTHS_PER_YEAR
  const monthlyInsurance = annualInsurance / MONTHS_PER_YEAR
  const monthlyMaintenance = annualMaintenance / MONTHS_PER_YEAR

  const itemizedExpenses = {
    propertyTax: monthlyPropertyTax,
    insurance: monthlyInsurance,
    maintenance: monthlyMaintenance,
    hoa: monthlyHOA,
    managementFee,
    vacancyAllowance,
  }

  // Total operating expenses EXCLUDE vacancy — vacancy is already reflected in
  // effectiveGrossRent (grossRent × (1 - vacancyRate)). Including it here would
  // double-count vacancy. This follows standard APOD (Annual Property Operating Data)
  // accounting where EGR already accounts for vacancy loss.
  const totalExpenses =
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyMaintenance +
    monthlyHOA +
    managementFee

  // NOI = effective gross rent minus operating expenses (excluding mortgage).
  // This matches standard real estate APOD accounting where debt service is separated.
  const netOperatingIncome = effectiveGrossRent - totalExpenses

  // Cash flow = NOI minus mortgage principal & interest
  const cashFlow = netOperatingIncome - monthlyMortgagePI

  return {
    grossRent: monthlyRent,
    effectiveGrossRent,
    itemizedExpenses,
    totalExpenses,
    netOperatingIncome,
    mortgagePayment: monthlyMortgagePI,
    cashFlow,
  }
}

// ---------------------------------------------------------------------------
// scheduleETaxImpact
// ---------------------------------------------------------------------------

/** Input parameters for Schedule E tax impact calculation. */
export interface ScheduleETaxInputs {
  annualRentalIncome: number
  annualOperatingExpenses: number
  annualMortgageInterest: number
  annualDepreciation: number
  agi: number
  marginalTaxRate: number
}

/**
 * Calculates the Schedule E tax impact for a rental property in a given year.
 *
 * Rental income and expenses are reported on IRS Schedule E. When the property
 * produces a net loss (common due to depreciation), passive activity loss rules
 * (IRC §469) determine how much of that loss can offset ordinary income:
 *
 * - "Active participants" in rental real estate can deduct up to $25,000 of
 *   rental losses against ordinary income (IRC §469(i)(2))
 * - This $25,000 allowance phases out between $100,000 and $150,000 AGI,
 *   reducing by $0.50 for every $1 of AGI above $100,000 (IRC §469(i)(3)(A))
 * - Losses exceeding the allowance are suspended and carried forward
 *
 * @param inputs - Rental income, expenses, depreciation, and taxpayer AGI
 * @returns Schedule E tax result including deductible loss and tax benefit
 */
export function scheduleETaxImpact(inputs: ScheduleETaxInputs): ScheduleETaxResult {
  const {
    annualRentalIncome,
    annualOperatingExpenses,
    annualMortgageInterest,
    annualDepreciation,
    agi,
    marginalTaxRate,
  } = inputs

  // Total Schedule E deductions: operating expenses + mortgage interest + depreciation
  const totalDeductions = annualOperatingExpenses + annualMortgageInterest + annualDepreciation

  // Net rental income (negative = rental loss)
  const netRentalIncome = annualRentalIncome - totalDeductions

  // If rental income is positive (or zero), there's no loss to deduct
  if (netRentalIncome >= 0) {
    return {
      grossRentalIncome: annualRentalIncome,
      totalDeductions,
      netRentalIncome,
      depreciation: annualDepreciation,
      deductibleLoss: 0,
      taxBenefit: 0,
    }
  }

  // Rental loss exists — apply passive activity loss rules (IRC §469)
  const rentalLoss = Math.abs(netRentalIncome)

  // Calculate passive activity loss allowance based on AGI phase-out
  // Full $25,000 allowance available at AGI <= $100,000
  // Phases out linearly between $100,000 and $150,000 AGI
  // $0 allowance at AGI >= $150,000
  const phaseOutRange = PASSIVE_LOSS_PHASE_OUT_END - PASSIVE_LOSS_PHASE_OUT_START
  const phaseOutFraction = Math.max(
    0,
    Math.min(1, (agi - PASSIVE_LOSS_PHASE_OUT_START) / phaseOutRange)
  )
  const passiveAllowance = Math.max(
    0,
    Math.min(PASSIVE_LOSS_MAX_OFFSET, PASSIVE_LOSS_MAX_OFFSET * (1 - phaseOutFraction))
  )

  // The deductible amount is the LESSER of the actual rental loss and the
  // passive allowance. Any excess is suspended and carried forward to future years.
  const deductibleLoss = Math.min(rentalLoss, passiveAllowance)

  // Tax benefit = deductible loss offset against ordinary income at the marginal rate
  const taxBenefit = deductibleLoss * marginalTaxRate

  return {
    grossRentalIncome: annualRentalIncome,
    totalDeductions,
    netRentalIncome,
    depreciation: annualDepreciation,
    deductibleLoss,
    taxBenefit,
  }
}

// ---------------------------------------------------------------------------
// rentalSaleTax
// ---------------------------------------------------------------------------

/** Input parameters for rental property sale tax calculation. */
export interface RentalSaleTaxInputs {
  salePrice: number
  originalBasis: number
  totalDepreciationClaimed: number
  sellingCostRate: number
  yearsOwned: number
  taxableIncome: number
  filingStatus: FilingStatus
  mortgageBalance: number
}

/**
 * Looks up the applicable long-term capital gains tax rate based on
 * taxable income and filing status.
 *
 * LTCG rates are 0%, 15%, or 20% depending on income thresholds.
 * Source: IRC §1(h); IRS Rev. Proc. 2023-34 §3.12
 *
 * @param taxableIncome - Taxpayer's taxable income (after deductions)
 * @param filingStatus - IRS filing status
 * @returns LTCG rate as a decimal (0, 0.15, or 0.20)
 */
function lookupLTCGRate(taxableIncome: number, filingStatus: FilingStatus): number {
  if (taxableIncome <= LTCG_ZERO_RATE_THRESHOLD[filingStatus]) {
    return LTCG_RATE_ZERO
  }
  if (taxableIncome > LTCG_TWENTY_PERCENT_THRESHOLD[filingStatus]) {
    return LTCG_RATE_TWENTY
  }
  return LTCG_RATE_FIFTEEN
}

/**
 * Calculates the tax consequences of selling a rental property.
 *
 * When a rental property is sold, two types of tax apply:
 *
 * 1. **Depreciation recapture** (IRC §1250): All depreciation previously
 *    claimed is "recaptured" and taxed at a flat 25% rate, regardless of
 *    the taxpayer's ordinary income bracket. This is unavoidable on sale.
 *
 * 2. **Long-term capital gains**: Any appreciation above the original basis
 *    (after recapture) is taxed at the applicable LTCG rate (0%, 15%, or 20%).
 *
 * IMPORTANT: No Section 121 exclusion applies — the property is no longer
 * a primary residence once converted to a rental.
 *
 * @param inputs - Sale details, basis, depreciation, and taxpayer profile
 * @returns Complete tax breakdown and net sale proceeds
 */
export function rentalSaleTax(inputs: RentalSaleTaxInputs): RentalSaleTaxResult {
  const {
    salePrice,
    originalBasis,
    totalDepreciationClaimed,
    sellingCostRate,
    taxableIncome,
    filingStatus,
    mortgageBalance,
    // yearsOwned is intentionally not destructured here. It exists in the input
    // interface for future short-term capital gains handling: properties held < 1 year
    // would be taxed at ordinary income rates instead of LTCG rates. In our use case,
    // rental properties are always held for multiple years, so LTCG rates always apply.
  } = inputs

  const sellingCosts = salePrice * sellingCostRate

  // Adjusted basis = original cost basis minus cumulative depreciation claimed.
  // Depreciation reduces basis because the IRS considers you've already
  // recovered that portion of the property's value through tax deductions.
  const adjustedBasis = originalBasis - totalDepreciationClaimed

  // Total gain = what you receive minus what you have invested
  const totalGain = salePrice - sellingCosts - adjustedBasis

  // If total gain is zero or negative, there's no tax owed (loss on sale)
  if (totalGain <= 0) {
    return {
      salePrice,
      sellingCosts,
      adjustedBasis,
      totalGain,
      depreciationRecaptureTax: 0,
      capitalGain: 0,
      capitalGainTax: 0,
      totalTax: 0,
      netSaleProceeds: salePrice - sellingCosts - mortgageBalance,
    }
  }

  // Depreciation recapture: taxed at flat 25% (IRC §1250, "unrecaptured Section 1250 gain").
  // Recapture amount is the LESSER of total depreciation claimed and total gain —
  // you can't recapture more gain than actually exists.
  const recaptureAmount = Math.min(totalDepreciationClaimed, totalGain)
  const depreciationRecaptureTax = recaptureAmount * DEPRECIATION_RECAPTURE_RATE

  // Capital gain is the appreciation portion ABOVE the original basis,
  // which is the total gain minus the depreciation recapture portion.
  // If total gain <= depreciation, there's no additional capital gain.
  const capitalGain = Math.max(0, totalGain - totalDepreciationClaimed)

  // Look up LTCG rate based on taxpayer's income and filing status
  const ltcgRate = lookupLTCGRate(taxableIncome, filingStatus)
  const capitalGainTax = capitalGain * ltcgRate

  const totalTax = depreciationRecaptureTax + capitalGainTax

  // Net proceeds = what the seller walks away with after all costs and taxes
  const netSaleProceeds = salePrice - sellingCosts - totalTax - mortgageBalance

  return {
    salePrice,
    sellingCosts,
    adjustedBasis,
    totalGain,
    depreciationRecaptureTax,
    capitalGain,
    capitalGainTax,
    totalTax,
    netSaleProceeds,
  }
}

// ---------------------------------------------------------------------------
// worstCaseMonthlyRentalCashFlow
// ---------------------------------------------------------------------------

/**
 * Calculates the worst-case monthly cash flow by subtracting a monthly
 * maintenance shock from the base cash flow. This models scenarios like
 * an HVAC replacement ($8,000+) or roof repair amortized over 12 months.
 *
 * @param baseCashFlow - Normal monthly cash flow result
 * @param maintenanceShockMonthly - Monthly amortized cost of a major repair
 * @returns Worst-case monthly cash flow in dollars
 */
export function worstCaseMonthlyRentalCashFlow(
  baseCashFlow: RentalCashFlowResult,
  maintenanceShockMonthly: number
): number {
  return baseCashFlow.cashFlow - maintenanceShockMonthly
}
