// ---------------------------------------------------------------------------
// rental.test.ts — Unit tests for rental property cash flow and tax calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
//
// This module tests: depreciation, monthly cash flow, Schedule E tax impact,
// rental sale tax, and worst-case cash flow scenarios.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  annualDepreciation,
  monthlyRentalCashFlow,
  scheduleETaxImpact,
  rentalSaleTax,
  worstCaseMonthlyRentalCashFlow,
} from '../rental'
import { calculateOriginalLoanAmount, calculateMonthlyPayment } from '../mortgage'
import type { RentalCashFlowResult } from '../types'

// ---------------------------------------------------------------------------
// annualDepreciation
// ---------------------------------------------------------------------------

describe('annualDepreciation', () => {
  it('calculates depreciation for a $270,000 home (Preston default)', () => {
    // Depreciation uses straight-line method over 27.5 years per IRS residential rental rules.
    // Land (est. 15% of value) is excluded because land is not a depreciable asset.
    //
    // Depreciable basis = 270,000 x (1 - 0.15) = 270,000 x 0.85 = 229,500
    // Annual depreciation = 229,500 / 27.5 = 8,345.454545...
    expect(annualDepreciation(270_000)).toBeCloseTo(8345.45, 2)
  })

  it('calculates depreciation for a $400,000 home', () => {
    // Depreciable basis = 400,000 x 0.85 = 340,000
    // Annual depreciation = 340,000 / 27.5 = 12,363.636363...
    expect(annualDepreciation(400_000)).toBeCloseTo(12363.64, 2)
  })

  it('returns 0 for a $0 home value', () => {
    expect(annualDepreciation(0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// monthlyRentalCashFlow
// ---------------------------------------------------------------------------

describe('monthlyRentalCashFlow', () => {
  it('calculates Preston default scenario cash flow', () => {
    // First, derive the mortgage payment from Phase 1 functions:
    // Current balance = $199,000, rate = 2%, 30yr term, 5 years into loan
    // Original loan = calculateOriginalLoanAmount(199000, 0.02, 30, 5) ≈ 228,199.59
    // Monthly P&I = calculateMonthlyPayment(228199.59, 0.02, 30) ≈ 843.47
    const originalLoan = calculateOriginalLoanAmount(199_000, 0.02, 30, 5)
    const monthlyPI = calculateMonthlyPayment(originalLoan, 0.02, 30)

    // Inputs:
    //   monthlyRent = 2,000
    //   annualPropertyTax = 270,000 x 0.0215 = 5,805 (no homestead exemption!)
    //   annualInsurance = 2,400 x 1.20 = 2,880 (landlord insurance increase)
    //   annualMaintenance = 270,000 x 0.0075 = 2,025
    //   monthlyHOA = 0
    //   vacancyRate = 0.08
    //   managementFeeRate = 0.0 (self-managed)
    const result = monthlyRentalCashFlow({
      monthlyRent: 2_000,
      monthlyMortgagePI: monthlyPI,
      annualPropertyTax: 5_805,
      annualInsurance: 2_880,
      annualMaintenance: 2_025,
      monthlyHOA: 0,
      vacancyRate: 0.08,
      managementFeeRate: 0.0,
    })

    // Expected calculations:
    //   effectiveGrossRent = 2,000 x (1 - 0.08) = 2,000 x 0.92 = 1,840.00
    expect(result.effectiveGrossRent).toBeCloseTo(1840.0, 2)

    //   vacancyAllowance = 2,000 x 0.08 = 160.00
    expect(result.itemizedExpenses.vacancyAllowance).toBeCloseTo(160.0, 2)

    //   propertyTax/mo = 5,805 / 12 = 483.75
    expect(result.itemizedExpenses.propertyTax).toBeCloseTo(483.75, 2)

    //   insurance/mo = 2,880 / 12 = 240.00
    expect(result.itemizedExpenses.insurance).toBeCloseTo(240.0, 2)

    //   maintenance/mo = 2,025 / 12 = 168.75
    expect(result.itemizedExpenses.maintenance).toBeCloseTo(168.75, 2)

    //   HOA = 0
    expect(result.itemizedExpenses.hoa).toBe(0)

    //   managementFee = 1,840 x 0.0 = 0
    expect(result.itemizedExpenses.managementFee).toBe(0)

    //   totalExpenses = 483.75 + 240 + 168.75 + 0 + 0 = 892.50
    //   (vacancy excluded — already reflected in effectiveGrossRent vs grossRent)
    expect(result.totalExpenses).toBeCloseTo(892.5, 2)

    //   NOI = 1,840 - 892.50 = 947.50
    expect(result.netOperatingIncome).toBeCloseTo(947.5, 2)

    //   cashFlow = 947.50 - 843.47 ≈ 104.03
    expect(result.cashFlow).toBeCloseTo(947.5 - monthlyPI, 0)

    // Gross rent should be the input
    expect(result.grossRent).toBe(2_000)

    // Mortgage payment should match
    expect(result.mortgagePayment).toBeCloseTo(monthlyPI, 2)
  })

  it('calculates cash flow with property management fee', () => {
    // Monthly rent = $2,000, 8% vacancy, 10% management fee
    // Effective gross = 2,000 x 0.92 = 1,840
    // Management fee = 1,840 x 0.10 = 184.00 (on collected rent, not gross)
    // Vacancy allowance = 2,000 x 0.08 = 160.00
    // Property tax/mo = 500/12 = 41.67
    // Insurance/mo = 120/12 = 10.00
    // Maintenance/mo = 0
    // HOA = 50
    // Total expenses = 41.67 + 10 + 0 + 50 + 184 = 285.67
    //   (vacancy excluded — already reflected in effectiveGrossRent)
    // NOI = 1,840 - 285.67 = 1,554.33
    // Cash flow = 1,554.33 - 1,000 = 554.33
    const result = monthlyRentalCashFlow({
      monthlyRent: 2_000,
      monthlyMortgagePI: 1_000,
      annualPropertyTax: 500,
      annualInsurance: 120,
      annualMaintenance: 0,
      monthlyHOA: 50,
      vacancyRate: 0.08,
      managementFeeRate: 0.10,
    })

    expect(result.itemizedExpenses.managementFee).toBeCloseTo(184.0, 2)
    expect(result.totalExpenses).toBeCloseTo(285.67, 0)
    expect(result.netOperatingIncome).toBeCloseTo(1554.33, 0)
    expect(result.cashFlow).toBeCloseTo(554.33, 0)
  })

  it('handles zero rent (vacant property)', () => {
    const result = monthlyRentalCashFlow({
      monthlyRent: 0,
      monthlyMortgagePI: 1_000,
      annualPropertyTax: 6_000,
      annualInsurance: 2_400,
      annualMaintenance: 2_000,
      monthlyHOA: 0,
      vacancyRate: 0.08,
      managementFeeRate: 0.10,
    })

    // With zero rent:
    //   effectiveGrossRent = 0
    //   vacancyAllowance = 0
    //   managementFee = 0
    //   totalExpenses = 500 + 200 + 166.67 + 0 + 0 + 0 = 866.67
    //   NOI = 0 - 866.67 = -866.67
    //   cashFlow = -866.67 - 1000 = -1866.67
    expect(result.effectiveGrossRent).toBe(0)
    expect(result.cashFlow).toBeCloseTo(-1866.67, 0)
  })

  it('handles 100% vacancy rate', () => {
    const result = monthlyRentalCashFlow({
      monthlyRent: 2_000,
      monthlyMortgagePI: 1_000,
      annualPropertyTax: 6_000,
      annualInsurance: 2_400,
      annualMaintenance: 2_000,
      monthlyHOA: 0,
      vacancyRate: 1.0,
      managementFeeRate: 0.10,
    })

    // 100% vacancy: effective gross = 0, vacancy allowance = 2,000
    // managementFee = 0 (on collected rent which is 0)
    // totalExpenses = 500 + 200 + 166.67 + 0 + 0 = 866.67 (vacancy excluded from expenses)
    // NOI = 0 - 866.67 = -866.67
    // cashFlow = -866.67 - 1000 = -1866.67
    expect(result.effectiveGrossRent).toBe(0)
    expect(result.itemizedExpenses.vacancyAllowance).toBe(2_000)
    expect(result.itemizedExpenses.managementFee).toBe(0)
    expect(result.cashFlow).toBeCloseTo(-1866.67, 0)
  })
})

// ---------------------------------------------------------------------------
// scheduleETaxImpact
// ---------------------------------------------------------------------------

describe('scheduleETaxImpact', () => {
  it('gives full passive offset at AGI = $100k (below phase-out start)', () => {
    // AGI = $100,000 — at or below the phase-out start, so full $25k offset available.
    // Net rental income = annualRentalIncome - (operatingExpenses + mortgageInterest + depreciation)
    // Say: income = $22,080 (1840 x 12), expenses = $12,630 (1052.50 x 12),
    //   interest = $16,000, depreciation = $8,345.45
    // Total deductions = 12,630 + 16,000 + 8,345.45 = 36,975.45
    // Net rental income = 22,080 - 36,975.45 = -14,895.45 (a loss)
    //
    // Passive allowance = $25,000 (full, AGI <= $100k)
    // deductibleLoss = min(14,895.45, 25,000) = 14,895.45
    // taxBenefit = 14,895.45 x 0.22 = 3,277.00
    const result = scheduleETaxImpact({
      annualRentalIncome: 22_080,
      annualOperatingExpenses: 12_630,
      annualMortgageInterest: 16_000,
      annualDepreciation: 8_345.45,
      agi: 100_000,
      marginalTaxRate: 0.22,
    })

    expect(result.grossRentalIncome).toBe(22_080)
    expect(result.totalDeductions).toBeCloseTo(36_975.45, 2)
    expect(result.netRentalIncome).toBeCloseTo(-14_895.45, 2)
    expect(result.deductibleLoss).toBeCloseTo(14_895.45, 2)
    expect(result.taxBenefit).toBeCloseTo(3_277.00, 0)
  })

  it('applies partial phase-out at AGI = $125k', () => {
    // AGI = $125,000 — halfway through phase-out range ($100k to $150k)
    // Passive allowance = $25,000 x (1 - (125,000 - 100,000) / 50,000)
    //                   = $25,000 x (1 - 0.5)
    //                   = $12,500
    //
    // Rental loss = -$15,000
    // deductibleLoss = min(15,000, 12,500) = 12,500
    // taxBenefit = 12,500 x 0.24 = 3,000
    const result = scheduleETaxImpact({
      annualRentalIncome: 20_000,
      annualOperatingExpenses: 10_000,
      annualMortgageInterest: 15_000,
      annualDepreciation: 10_000,
      agi: 125_000,
      marginalTaxRate: 0.24,
    })

    // Total deductions = 10,000 + 15,000 + 10,000 = 35,000
    // Net rental income = 20,000 - 35,000 = -15,000
    expect(result.netRentalIncome).toBeCloseTo(-15_000, 2)
    expect(result.deductibleLoss).toBeCloseTo(12_500, 2)
    expect(result.taxBenefit).toBeCloseTo(3_000, 2)
  })

  it('gives zero offset at AGI = $150k (full phase-out)', () => {
    // AGI = $150,000 — at the phase-out end, allowance = $0
    // Rental loss = -$15,000, but deductible = $0
    const result = scheduleETaxImpact({
      annualRentalIncome: 20_000,
      annualOperatingExpenses: 10_000,
      annualMortgageInterest: 15_000,
      annualDepreciation: 10_000,
      agi: 150_000,
      marginalTaxRate: 0.24,
    })

    expect(result.netRentalIncome).toBeCloseTo(-15_000, 2)
    expect(result.deductibleLoss).toBe(0)
    expect(result.taxBenefit).toBe(0)
  })

  it('returns zero benefit when rental income is positive', () => {
    // Positive rental income: no loss to deduct
    // Income = $30,000, deductions = $20,000, net = +$10,000
    const result = scheduleETaxImpact({
      annualRentalIncome: 30_000,
      annualOperatingExpenses: 5_000,
      annualMortgageInterest: 10_000,
      annualDepreciation: 5_000,
      agi: 100_000,
      marginalTaxRate: 0.22,
    })

    expect(result.netRentalIncome).toBeCloseTo(10_000, 2)
    expect(result.deductibleLoss).toBe(0)
    expect(result.taxBenefit).toBe(0)
  })

  it('caps deductible loss at $25k even with larger loss (AGI = $80k)', () => {
    // AGI = $80,000 — below phase-out start, full $25k allowance
    // Rental loss = -$30,000
    // deductibleLoss = min(30,000, 25,000) = 25,000 (capped!)
    // taxBenefit = 25,000 x 0.22 = 5,500
    const result = scheduleETaxImpact({
      annualRentalIncome: 10_000,
      annualOperatingExpenses: 15_000,
      annualMortgageInterest: 15_000,
      annualDepreciation: 10_000,
      agi: 80_000,
      marginalTaxRate: 0.22,
    })

    // Total deductions = 15,000 + 15,000 + 10,000 = 40,000
    // Net rental income = 10,000 - 40,000 = -30,000
    expect(result.netRentalIncome).toBeCloseTo(-30_000, 2)
    expect(result.deductibleLoss).toBeCloseTo(25_000, 2)
    expect(result.taxBenefit).toBeCloseTo(5_500, 2)
  })

  it('handles AGI above $150k — fully phased out', () => {
    // AGI = $200,000 — well above phase-out end
    const result = scheduleETaxImpact({
      annualRentalIncome: 20_000,
      annualOperatingExpenses: 10_000,
      annualMortgageInterest: 15_000,
      annualDepreciation: 10_000,
      agi: 200_000,
      marginalTaxRate: 0.32,
    })

    expect(result.deductibleLoss).toBe(0)
    expect(result.taxBenefit).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// rentalSaleTax
// ---------------------------------------------------------------------------

describe('rentalSaleTax', () => {
  it('calculates tax on appreciated rental sold after 20 years', () => {
    // Home purchased at $270,000, appreciates at 3%/year for 20 years
    // Sale price = 270,000 x (1.03)^20 = 270,000 x 1.80611 = 487,650 (approx)
    const salePrice = 270_000 * Math.pow(1.03, 20)

    // Depreciation claimed: $8,345.45/year x 20 years = $166,909.09
    const totalDepreciation = annualDepreciation(270_000) * 20

    // Selling costs = salePrice x 0.06
    const sellingCosts = salePrice * 0.06

    // Adjusted basis = 270,000 - 166,909.09 = 103,090.91
    const adjustedBasis = 270_000 - totalDepreciation

    // Total gain = salePrice - sellingCosts - adjustedBasis
    const totalGain = salePrice - sellingCosts - adjustedBasis

    // Depreciation recapture tax = min(166,909.09, totalGain) x 0.25
    // Since totalGain > totalDepreciation in this case:
    //   recapture = 166,909.09 x 0.25 = 41,727.27

    // Capital gain (appreciation portion) = totalGain - totalDepreciation
    // LTCG rate lookup: taxable income $85,525 (single) => 15% rate
    //   (above $47,025 0% threshold, below $518,900 20% threshold)
    // Capital gain tax = capitalGain x 0.15

    const result = rentalSaleTax({
      salePrice,
      originalBasis: 270_000,
      totalDepreciationClaimed: totalDepreciation,
      sellingCostRate: 0.06,
      yearsOwned: 20,
      taxableIncome: 85_525,
      filingStatus: 'single',
      mortgageBalance: 100_000,
    })

    expect(result.salePrice).toBeCloseTo(salePrice, 2)
    expect(result.sellingCosts).toBeCloseTo(sellingCosts, 2)
    expect(result.adjustedBasis).toBeCloseTo(adjustedBasis, 2)
    expect(result.totalGain).toBeCloseTo(totalGain, 2)

    // Depreciation recapture: min(totalDepreciation, totalGain) x 25%
    expect(result.depreciationRecaptureTax).toBeCloseTo(totalDepreciation * 0.25, 2)

    // Capital gain = totalGain - totalDepreciation (the pure appreciation above basis)
    const expectedCapitalGain = totalGain - totalDepreciation
    expect(result.capitalGain).toBeCloseTo(expectedCapitalGain, 2)

    // At $85,525 single filing, LTCG rate is 15%
    expect(result.capitalGainTax).toBeCloseTo(expectedCapitalGain * 0.15, 2)

    // Total tax
    const expectedTotalTax =
      totalDepreciation * 0.25 + expectedCapitalGain * 0.15
    expect(result.totalTax).toBeCloseTo(expectedTotalTax, 2)

    // Net proceeds = salePrice - sellingCosts - totalTax - mortgageBalance
    expect(result.netSaleProceeds).toBeCloseTo(
      salePrice - sellingCosts - expectedTotalTax - 100_000,
      2
    )
  })

  it('returns zero tax fields on a sale at a loss', () => {
    // Sale price below adjusted basis — no gain, no tax
    const result = rentalSaleTax({
      salePrice: 200_000,
      originalBasis: 270_000,
      totalDepreciationClaimed: 50_000,
      sellingCostRate: 0.06,
      yearsOwned: 10,
      taxableIncome: 85_525,
      filingStatus: 'single',
      mortgageBalance: 150_000,
    })

    // Selling costs = 200,000 x 0.06 = 12,000
    // Adjusted basis = 270,000 - 50,000 = 220,000
    // Total gain = 200,000 - 12,000 - 220,000 = -32,000 (loss)
    expect(result.totalGain).toBeLessThan(0)
    expect(result.depreciationRecaptureTax).toBe(0)
    expect(result.capitalGain).toBe(0)
    expect(result.capitalGainTax).toBe(0)
    expect(result.totalTax).toBe(0)

    // Net proceeds = salePrice - sellingCosts - 0 - mortgageBalance
    // = 200,000 - 12,000 - 0 - 150,000 = 38,000
    expect(result.netSaleProceeds).toBeCloseTo(38_000, 2)
  })

  it('handles zero depreciation claimed', () => {
    // No depreciation claimed — all gain is capital gain, no recapture
    const salePrice = 350_000
    const sellingCosts = salePrice * 0.06 // 21,000
    const adjustedBasis = 270_000 // no depreciation to subtract
    const totalGain = salePrice - sellingCosts - adjustedBasis // 350k - 21k - 270k = 59,000

    const result = rentalSaleTax({
      salePrice: 350_000,
      originalBasis: 270_000,
      totalDepreciationClaimed: 0,
      sellingCostRate: 0.06,
      yearsOwned: 5,
      taxableIncome: 85_525,
      filingStatus: 'single',
      mortgageBalance: 180_000,
    })

    expect(result.depreciationRecaptureTax).toBe(0)
    // All gain is capital gain since no depreciation to recapture
    expect(result.capitalGain).toBeCloseTo(totalGain, 2)
    // LTCG rate at $85,525 single = 15%
    expect(result.capitalGainTax).toBeCloseTo(totalGain * 0.15, 2)
    expect(result.totalTax).toBeCloseTo(totalGain * 0.15, 2)
    expect(result.netSaleProceeds).toBeCloseTo(
      salePrice - sellingCosts - totalGain * 0.15 - 180_000,
      2
    )
  })

  it('uses 0% LTCG rate for low-income single filer', () => {
    // Taxable income = $40,000 (below $47,025 single threshold) => 0% LTCG
    const result = rentalSaleTax({
      salePrice: 300_000,
      originalBasis: 270_000,
      totalDepreciationClaimed: 0,
      sellingCostRate: 0.06,
      yearsOwned: 5,
      taxableIncome: 40_000,
      filingStatus: 'single',
      mortgageBalance: 180_000,
    })

    // Selling costs = 18,000
    // Gain = 300,000 - 18,000 - 270,000 = 12,000
    // LTCG at 0% => capitalGainTax = 0
    expect(result.capitalGainTax).toBe(0)
    expect(result.totalTax).toBe(0)
  })

  it('uses 20% LTCG rate for high-income single filer', () => {
    // Taxable income = $600,000 (above $518,900 single threshold) => 20% LTCG
    const result = rentalSaleTax({
      salePrice: 500_000,
      originalBasis: 270_000,
      totalDepreciationClaimed: 0,
      sellingCostRate: 0.06,
      yearsOwned: 10,
      taxableIncome: 600_000,
      filingStatus: 'single',
      mortgageBalance: 100_000,
    })

    // Selling costs = 30,000
    // Gain = 500,000 - 30,000 - 270,000 = 200,000
    expect(result.capitalGainTax).toBeCloseTo(200_000 * 0.20, 2)
  })

  it('limits depreciation recapture to total gain when gain < depreciation', () => {
    // If total gain is less than total depreciation claimed, recapture is
    // limited to the total gain (you can't recapture more than you gained).
    const result = rentalSaleTax({
      salePrice: 280_000,
      originalBasis: 270_000,
      totalDepreciationClaimed: 50_000,
      sellingCostRate: 0.06,
      yearsOwned: 10,
      taxableIncome: 85_525,
      filingStatus: 'single',
      mortgageBalance: 100_000,
    })

    // Selling costs = 16,800
    // Adjusted basis = 270,000 - 50,000 = 220,000
    // Total gain = 280,000 - 16,800 - 220,000 = 43,200
    // Recapture = min(50,000, 43,200) = 43,200 (limited to gain)
    // Recapture tax = 43,200 x 0.25 = 10,800
    // Capital gain = max(0, 43,200 - 50,000) = 0
    expect(result.totalGain).toBeCloseTo(43_200, 2)
    expect(result.depreciationRecaptureTax).toBeCloseTo(43_200 * 0.25, 2)
    expect(result.capitalGain).toBe(0)
    expect(result.capitalGainTax).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// worstCaseMonthlyRentalCashFlow
// ---------------------------------------------------------------------------

describe('worstCaseMonthlyRentalCashFlow', () => {
  it('subtracts maintenance shock from base cash flow', () => {
    // Base cash flow of $200/month with an $8,000/year maintenance shock
    // amortized monthly = $8,000 / 12 = $666.67/month
    // Worst case = $200 - $666.67 = -$466.67
    const baseCashFlow: RentalCashFlowResult = {
      grossRent: 2_000,
      effectiveGrossRent: 1_840,
      itemizedExpenses: {
        propertyTax: 483.75,
        insurance: 240,
        maintenance: 168.75,
        hoa: 0,
        managementFee: 0,
        vacancyAllowance: 160,
      },
      totalExpenses: 892.50,
      netOperatingIncome: 947.50,
      mortgagePayment: 747.50,
      cashFlow: 200,
    }

    const maintenanceShockMonthly = 8_000 / 12
    const result = worstCaseMonthlyRentalCashFlow(baseCashFlow, maintenanceShockMonthly)

    // worst case = 200 - 666.67 = -466.67
    expect(result).toBeCloseTo(-466.67, 0)
  })

  it('handles zero maintenance shock', () => {
    const baseCashFlow: RentalCashFlowResult = {
      grossRent: 2_000,
      effectiveGrossRent: 1_840,
      itemizedExpenses: {
        propertyTax: 400,
        insurance: 200,
        maintenance: 150,
        hoa: 0,
        managementFee: 0,
        vacancyAllowance: 160,
      },
      totalExpenses: 750,
      netOperatingIncome: 1090,
      mortgagePayment: 800,
      cashFlow: 290, // NOI (1090) - mortgage (800) = 290
    }

    expect(worstCaseMonthlyRentalCashFlow(baseCashFlow, 0)).toBe(290)
  })
})
