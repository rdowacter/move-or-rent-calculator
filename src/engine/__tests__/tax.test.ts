// ---------------------------------------------------------------------------
// tax.test.ts — Unit tests for federal tax bracket and IRA withdrawal calculations
//
// TDD: These tests are written FIRST with manually verified expected values.
// Each test includes a comment showing the manual math derivation so that
// any reviewer can independently verify correctness.
//
// Tax bracket data: 2024 IRS Rev. Proc. 2023-34, §3.01
// Standard deduction: 2024 IRS Rev. Proc. 2023-34, §3.02
// Early withdrawal penalty: IRC §72(t)
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  calculateFederalIncomeTax,
  calculateMarginalTaxRate,
  calculateEffectiveTaxRate,
  getStandardDeduction,
  calculateIRAWithdrawalTax,
} from '../tax'

// ---- calculateFederalIncomeTax ------------------------------------------------

describe('calculateFederalIncomeTax', () => {
  it('calculates tax on $85,400 taxable income (single)', () => {
    // $100k gross income - $14,600 standard deduction = $85,400 taxable
    // 2024 single brackets:
    //   10% on first $11,600              = $11,600 × 0.10 = $1,160.00
    //   12% on $11,600 to $47,150         = $35,550 × 0.12 = $4,266.00
    //   22% on $47,150 to $85,400         = $38,250 × 0.22 = $8,415.00
    //   Total = $1,160 + $4,266 + $8,415  = $13,841.00
    expect(calculateFederalIncomeTax(85_400, 'single')).toBeCloseTo(13_841, 2)
  })

  it('calculates tax on $115,400 taxable income (single)', () => {
    // $100k gross + $30k IRA withdrawal - $14,600 standard deduction = $115,400 taxable
    // 2024 single brackets:
    //   10% on first $11,600              = $11,600 × 0.10  = $1,160.00
    //   12% on $11,600 to $47,150         = $35,550 × 0.12  = $4,266.00
    //   22% on $47,150 to $100,525        = $53,375 × 0.22  = $11,742.50
    //   24% on $100,525 to $115,400       = $14,875 × 0.24  = $3,570.00
    //   Total = $1,160 + $4,266 + $11,742.50 + $3,570 = $20,738.50
    expect(calculateFederalIncomeTax(115_400, 'single')).toBeCloseTo(20_738.5, 2)
  })

  it('returns 0 for $0 income', () => {
    expect(calculateFederalIncomeTax(0, 'single')).toBe(0)
  })

  it('returns 0 for negative income', () => {
    // Negative taxable income (e.g., deductions exceed income) results in no tax
    expect(calculateFederalIncomeTax(-5_000, 'single')).toBe(0)
  })

  it('calculates tax at the exact bracket boundary of $47,150 (single)', () => {
    // At exactly $47,150, the taxpayer fills the 10% and 12% brackets completely
    //   10% on $11,600          = $1,160.00
    //   12% on $35,550          = $4,266.00
    //   Total                   = $5,426.00
    // The 22% bracket starts at $47,150, so $0 is taxed at 22%
    expect(calculateFederalIncomeTax(47_150, 'single')).toBeCloseTo(5_426, 2)
  })

  it('calculates tax using married filing jointly brackets', () => {
    // MFJ brackets are wider — same $85,400 taxable income pays less tax
    // 2024 MFJ brackets:
    //   10% on first $23,200              = $23,200 × 0.10  = $2,320.00
    //   12% on $23,200 to $85,400         = $62,200 × 0.12  = $7,464.00
    //   Total = $2,320 + $7,464           = $9,784.00
    expect(calculateFederalIncomeTax(85_400, 'married_filing_jointly')).toBeCloseTo(
      9_784,
      2
    )
  })

  it('calculates tax for income in the top bracket (single)', () => {
    // $700,000 taxable income (single)
    //   10% on $11,600                     = $1,160.00
    //   12% on $35,550                     = $4,266.00
    //   22% on $53,375 ($47,150-$100,525)  = $11,742.50
    //   24% on $91,425 ($100,525-$191,950) = $21,942.00
    //   32% on $51,775 ($191,950-$243,725) = $16,568.00
    //   35% on $365,625 ($243,725-$609,350)= $127,968.75
    //   37% on $90,650 ($609,350-$700,000) = $33,540.50
    //   Total = $217,187.75
    expect(calculateFederalIncomeTax(700_000, 'single')).toBeCloseTo(217_187.75, 2)
  })

  it('calculates tax for very small income entirely in the 10% bracket', () => {
    // $5,000 taxable income (single) — entirely in the 10% bracket
    // $5,000 × 0.10 = $500.00
    expect(calculateFederalIncomeTax(5_000, 'single')).toBeCloseTo(500, 2)
  })
})

// ---- calculateMarginalTaxRate ------------------------------------------------

describe('calculateMarginalTaxRate', () => {
  it('returns 22% marginal rate for $85,400 taxable income (single)', () => {
    // $85,400 falls in the 22% bracket ($47,150 - $100,525)
    expect(calculateMarginalTaxRate(85_400, 'single')).toBe(0.22)
  })

  it('returns 12% marginal rate at exactly $47,150 (single)', () => {
    // $47,150 is the ceiling of the 12% bracket. Since the bracket is [min, max)
    // with max exclusive, $47,150 is the start of the 22% bracket.
    // However, the last dollar of income at $47,150 is the $47,150th dollar,
    // which falls in the 12% bracket (min: $11,600, max: $47,150).
    // Actually, with the bracket defined as max: 47150, if taxable income
    // is exactly 47150, the last dollar is in the 12% bracket because
    // the 22% bracket starts at min: 47150.
    // Income of exactly $47,150 means income from $0 to $47,150 — the
    // highest dollar is at $47,149.xx which is below the 22% bracket floor.
    expect(calculateMarginalTaxRate(47_150, 'single')).toBe(0.12)
  })

  it('returns 24% marginal rate for $115,400 taxable income (single)', () => {
    // $115,400 falls in the 24% bracket ($100,525 - $191,950)
    expect(calculateMarginalTaxRate(115_400, 'single')).toBe(0.24)
  })

  it('returns 0% marginal rate for $0 income', () => {
    expect(calculateMarginalTaxRate(0, 'single')).toBe(0)
  })

  it('returns 10% marginal rate for $1 income (single)', () => {
    expect(calculateMarginalTaxRate(1, 'single')).toBe(0.1)
  })

  it('returns 12% marginal rate for married filing jointly at $85,400', () => {
    // MFJ 12% bracket: $23,200 - $94,300
    // $85,400 falls within this bracket
    expect(calculateMarginalTaxRate(85_400, 'married_filing_jointly')).toBe(0.12)
  })
})

// ---- calculateEffectiveTaxRate ------------------------------------------------

describe('calculateEffectiveTaxRate', () => {
  it('returns ~16.21% effective rate for $85,400 taxable income (single)', () => {
    // Tax = $13,841 (from above)
    // Effective rate = $13,841 / $85,400 = 0.16207...
    expect(calculateEffectiveTaxRate(85_400, 'single')).toBeCloseTo(0.16207, 4)
  })

  it('returns 0 for $0 income (avoid division by zero)', () => {
    expect(calculateEffectiveTaxRate(0, 'single')).toBe(0)
  })

  it('returns 10% effective rate for income entirely in 10% bracket', () => {
    // $5,000 income: tax = $500, effective rate = $500 / $5,000 = 0.10
    expect(calculateEffectiveTaxRate(5_000, 'single')).toBeCloseTo(0.1, 4)
  })
})

// ---- getStandardDeduction ----------------------------------------------------

describe('getStandardDeduction', () => {
  it('returns $14,600 for single filers (2024)', () => {
    expect(getStandardDeduction('single')).toBe(14_600)
  })

  it('returns $29,200 for married filing jointly (2024)', () => {
    expect(getStandardDeduction('married_filing_jointly')).toBe(29_200)
  })

  it('returns $14,600 for married filing separately (2024)', () => {
    expect(getStandardDeduction('married_filing_separately')).toBe(14_600)
  })

  it('returns $21,900 for head of household (2024)', () => {
    expect(getStandardDeduction('head_of_household')).toBe(21_900)
  })
})

// ---- calculateIRAWithdrawalTax ------------------------------------------------

describe('calculateIRAWithdrawalTax', () => {
  it('calculates tax on $30k traditional IRA withdrawal for the key scenario', () => {
    // THE critical test — Preston's actual scenario:
    //   $30,000 traditional IRA withdrawal
    //   $100,000 annual gross income, single, age 37
    //
    // Step 1: Taxable income WITHOUT withdrawal
    //   $100,000 - $14,600 standard deduction = $85,400
    //
    // Step 2: Tax on $85,400 (calculated above)
    //   10% on $11,600  = $1,160.00
    //   12% on $35,550  = $4,266.00
    //   22% on $38,250  = $8,415.00
    //   Total = $13,841.00
    //
    // Step 3: Taxable income WITH withdrawal
    //   $130,000 - $14,600 = $115,400
    //
    // Step 4: Tax on $115,400
    //   10% on $11,600           = $1,160.00
    //   12% on $35,550           = $4,266.00
    //   22% on $53,375           = $11,742.50
    //   24% on $14,875           = $3,570.00
    //   Total = $20,738.50
    //
    // Step 5: Incremental federal tax = $20,738.50 - $13,841.00 = $6,897.50
    //
    // Step 6: Early withdrawal penalty (age 37 < 59.5)
    //   $30,000 × 10% = $3,000.00
    //
    // Step 7: Total tax = $6,897.50 + $3,000.00 = $9,897.50
    //
    // Step 8: Net proceeds = $30,000 - $9,897.50 = $20,102.50
    //
    // Step 9: Effective withdrawal tax rate = $9,897.50 / $30,000 ≈ 0.3299

    const result = calculateIRAWithdrawalTax(30_000, 100_000, 'single', 37, 'traditional')

    expect(result.federalTax).toBeCloseTo(6_897.5, 2)
    expect(result.earlyWithdrawalPenalty).toBeCloseTo(3_000, 2)
    expect(result.totalTax).toBeCloseTo(9_897.5, 2)
    expect(result.netProceeds).toBeCloseTo(20_102.5, 2)
    expect(result.effectiveWithdrawalTaxRate).toBeCloseTo(0.3299, 3)
  })

  it('applies no early withdrawal penalty at age 59.5', () => {
    // Age exactly 59.5 — penalty does NOT apply (threshold is "before age 59½")
    // Federal tax still applies on the traditional IRA withdrawal
    const result = calculateIRAWithdrawalTax(30_000, 100_000, 'single', 59.5, 'traditional')

    expect(result.earlyWithdrawalPenalty).toBe(0)
    expect(result.federalTax).toBeCloseTo(6_897.5, 2)
    expect(result.totalTax).toBeCloseTo(6_897.5, 2)
    expect(result.netProceeds).toBeCloseTo(23_102.5, 2)
  })

  it('applies no early withdrawal penalty at age 60', () => {
    const result = calculateIRAWithdrawalTax(30_000, 100_000, 'single', 60, 'traditional')

    expect(result.earlyWithdrawalPenalty).toBe(0)
    expect(result.federalTax).toBeCloseTo(6_897.5, 2)
  })

  it('handles Roth IRA withdrawal as tax-free (simplified model)', () => {
    // Simplification: Roth contributions come out tax-free and penalty-free.
    // In reality, earnings withdrawn early would be taxed and penalized,
    // but we assume the full balance is contributions for this model.
    // See comment in tax.ts for the full nuance.
    const result = calculateIRAWithdrawalTax(30_000, 100_000, 'single', 37, 'roth')

    expect(result.federalTax).toBe(0)
    // Roth qualified contributions are not subject to the 10% penalty.
    // Under our simplification (all contributions), no penalty applies.
    expect(result.earlyWithdrawalPenalty).toBe(0)
    expect(result.totalTax).toBe(0)
    expect(result.netProceeds).toBe(30_000)
    expect(result.effectiveWithdrawalTaxRate).toBe(0)
  })

  it('handles $0 withdrawal amount', () => {
    const result = calculateIRAWithdrawalTax(0, 100_000, 'single', 37, 'traditional')

    expect(result.federalTax).toBe(0)
    expect(result.earlyWithdrawalPenalty).toBe(0)
    expect(result.totalTax).toBe(0)
    expect(result.netProceeds).toBe(0)
    expect(result.effectiveWithdrawalTaxRate).toBe(0)
  })

  it('handles $0 gross income with a withdrawal', () => {
    // Someone with no income withdrawing $30,000 from traditional IRA
    // Taxable income without withdrawal: $0 - $14,600 = -$14,600 → $0
    // Taxable income with withdrawal: $30,000 - $14,600 = $15,400
    //   10% on $11,600 = $1,160
    //   12% on $3,800 ($11,600 to $15,400) = $456
    //   Total federal tax = $1,616
    // Early withdrawal penalty: $30,000 × 10% = $3,000
    // Total = $4,616
    // Net = $30,000 - $4,616 = $25,384
    const result = calculateIRAWithdrawalTax(30_000, 0, 'single', 37, 'traditional')

    expect(result.federalTax).toBeCloseTo(1_616, 2)
    expect(result.earlyWithdrawalPenalty).toBeCloseTo(3_000, 2)
    expect(result.totalTax).toBeCloseTo(4_616, 2)
    expect(result.netProceeds).toBeCloseTo(25_384, 2)
  })

  it('uses married filing jointly brackets for MFJ filer', () => {
    // $30k withdrawal on $100k gross, MFJ
    // Taxable without withdrawal: $100,000 - $29,200 = $70,800
    // Tax on $70,800 (MFJ):
    //   10% on $23,200 = $2,320
    //   12% on $47,600 ($23,200 to $70,800) = $5,712
    //   Total = $8,032
    //
    // Taxable with withdrawal: $130,000 - $29,200 = $100,800
    // Tax on $100,800 (MFJ):
    //   10% on $23,200 = $2,320
    //   12% on $71,100 ($23,200 to $94,300) = $8,532
    //   22% on $6,500 ($94,300 to $100,800) = $1,430
    //   Total = $12,282
    //
    // Incremental tax = $12,282 - $8,032 = $4,250
    // Penalty = $30,000 × 10% = $3,000
    // Total = $7,250
    const result = calculateIRAWithdrawalTax(
      30_000,
      100_000,
      'married_filing_jointly',
      37,
      'traditional'
    )

    expect(result.federalTax).toBeCloseTo(4_250, 2)
    expect(result.earlyWithdrawalPenalty).toBeCloseTo(3_000, 2)
    expect(result.totalTax).toBeCloseTo(7_250, 2)
  })

  it('returns correct effective withdrawal tax rate', () => {
    // From the key scenario: $9,897.50 / $30,000 ≈ 0.3299
    const result = calculateIRAWithdrawalTax(30_000, 100_000, 'single', 37, 'traditional')
    expect(result.effectiveWithdrawalTaxRate).toBeCloseTo(9_897.5 / 30_000, 4)
  })
})
