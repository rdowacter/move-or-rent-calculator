# Phase 2: Complete Financial Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the composite domain logic (rental, capital, DTI) and the scenario orchestrator that ties all Phase 1 modules together into a complete financial model. After Phase 2, `runModel(inputs)` returns year-by-year projections for all three scenarios with warnings, capital analysis, and DTI — ready for UI consumption.

**Architecture:** Per-scenario projection functions with shared stepping helpers. Each scenario is independently testable. Rental exit modeled as a discrete event in the year-by-year loop. All functions are pure — zero React, zero DOM, zero side effects.

**Tech Stack:** TypeScript (strict mode), Vitest for testing. All code in `src/engine/`.

**Reference docs:**
- `docs/plans/2026-03-14-phase2-complete-engine.md` — approved design document
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `docs/plans/2026-03-14-phase1-foundation.md` — Phase 1 modules this builds on
- `CLAUDE.md` — coding standards, financial logic reminders, domain expertise
- `src/engine/types.ts` — all TypeScript interfaces
- `src/engine/constants.ts` — all named constants with IRS citations

**Prerequisite:** All 5 Phase 1 engine modules (`mortgage.ts`, `tax.ts`, `ira.ts`, `appreciation.ts`, `commute.ts`) must be implemented and passing all tests before starting Phase 2.

**Verify before starting:** Run `npx vitest run` and confirm all Phase 1 tests pass.

---

## Task 1: Add New Types to `types.ts`

**Files:**
- Modify: `src/engine/types.ts`

**What to add:** Phase 2 modules need intermediate result types that don't exist yet. Add these AFTER the existing `RentalExitTaxEvent` interface and BEFORE `ScenarioOutput`.

### New types to add:

```typescript
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
  /** Total monthly operating expenses (sum of itemized). */
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
  /** Gross annual rental income (rent × 12 × (1 - vacancy)). */
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
  /** Tax benefit = deductibleLoss × marginalTaxRate. */
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
  /** Depreciation recapture tax = totalDepreciationClaimed × 25%. Always at 25%. */
  depreciationRecaptureTax: number
  /** Capital gain on appreciation above original basis (excludes recapture portion). */
  capitalGain: number
  /** Tax on capital gain at applicable LTCG rate. */
  capitalGainTax: number
  /** Total tax = depreciationRecaptureTax + capitalGainTax. */
  totalTax: number
  /** Net sale proceeds = salePrice - sellingCosts - totalTax - mortgageBalance. */
  netSaleProceeds: number
}

/**
 * Stress test results for Scenario B — three failure scenarios
 * showing how quickly the user's reserves would deplete.
 */
export interface StressTestResult {
  /** 3 months vacancy + major repair ($8k). */
  vacancyAndMaintenance: {
    /** Total shock cost (3 months lost rent + repair). */
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
```

**Step 1:** Add the four interfaces above to `src/engine/types.ts`
**Step 2:** Export them. Verify TypeScript compiles: `npx tsc --noEmit`
**Step 3:** Commit: `feat(engine): add Phase 2 intermediate result types`

---

## Task 2: Rental Module (TDD)

**Files:**
- Create: `src/engine/rental.ts`
- Create: `src/engine/__tests__/rental.test.ts`

**Imports from Phase 1:** `mortgage.ts` (for monthly payment, interest calculations), `tax.ts` (for capital gains rate lookup), `appreciation.ts` (for home value projections)

**Imports from constants:** `RESIDENTIAL_DEPRECIATION_YEARS`, `LAND_VALUE_PERCENTAGE`, `DEPRECIATION_RECAPTURE_RATE`, `PASSIVE_LOSS_MAX_OFFSET`, `PASSIVE_LOSS_PHASE_OUT_START`, `PASSIVE_LOSS_PHASE_OUT_END`, `LTCG_*` constants

### Functions to implement

**`annualDepreciation(homeValue: number): number`**
- Depreciable basis = homeValue × (1 - LAND_VALUE_PERCENTAGE)
- Annual depreciation = depreciable basis / RESIDENTIAL_DEPRECIATION_YEARS
- Comment: "Depreciation uses straight-line method over 27.5 years per IRS residential rental rules. Land (est. 15% of value) is excluded because land is not a depreciable asset."

**`monthlyRentalCashFlow(inputs): RentalCashFlowResult`**
```typescript
inputs: {
  monthlyRent: number
  monthlyMortgagePI: number
  annualPropertyTax: number
  annualInsurance: number
  annualMaintenance: number
  monthlyHOA: number
  vacancyRate: number
  managementFeeRate: number
}
```
- Effective gross rent = monthlyRent × (1 - vacancyRate)
- Vacancy allowance = monthlyRent × vacancyRate
- Management fee = effective gross rent × managementFeeRate (on collected rent, not gross)
- Total expenses = propertyTax/12 + insurance/12 + maintenance/12 + HOA + managementFee + vacancyAllowance
- NOI = effectiveGrossRent - totalExpenses (excluding mortgage)
- Cash flow = NOI - monthlyMortgagePI

**`scheduleETaxImpact(inputs): ScheduleETaxResult`**
```typescript
inputs: {
  annualRentalIncome: number        // effectiveGrossRent × 12
  annualOperatingExpenses: number   // totalExpenses × 12 (excluding vacancy — already in income)
  annualMortgageInterest: number    // from Phase 1 mortgage module
  annualDepreciation: number
  agi: number
  marginalTaxRate: number
}
```
- Total deductions = operatingExpenses + mortgageInterest + depreciation
- Net rental income = annualRentalIncome - totalDeductions
- If net rental income ≥ 0: no loss to deduct, deductibleLoss = 0, taxBenefit = 0
- If net rental income < 0 (rental loss):
  - Passive allowance = max(0, PASSIVE_LOSS_MAX_OFFSET × (1 - (agi - PASSIVE_LOSS_PHASE_OUT_START) / (PASSIVE_LOSS_PHASE_OUT_END - PASSIVE_LOSS_PHASE_OUT_START)))
  - Clamp passive allowance to [0, PASSIVE_LOSS_MAX_OFFSET]
  - deductibleLoss = min(abs(netRentalIncome), passiveAllowance)
  - taxBenefit = deductibleLoss × marginalTaxRate

**IMPORTANT passive loss note:** The deductible amount is the LESSER of the actual rental loss and the passive allowance. If the rental loss is $15k but the allowance is $12.5k, only $12.5k is deductible. The difference ($2.5k) is suspended and carried forward — tracked in `YearlySnapshot.passiveLossSuspended`.

**`rentalSaleTax(inputs): RentalSaleTaxResult`**
```typescript
inputs: {
  salePrice: number
  originalBasis: number
  totalDepreciationClaimed: number
  sellingCostRate: number
  yearsOwned: number
  taxableIncome: number
  filingStatus: FilingStatus
  mortgageBalance: number
}
```
- Selling costs = salePrice × sellingCostRate
- Adjusted basis = originalBasis - totalDepreciationClaimed
- Total gain = salePrice - sellingCosts - adjustedBasis
- If total gain ≤ 0: no tax (loss on sale). Set all tax fields to 0, net proceeds = salePrice - sellingCosts - mortgageBalance
- If total gain > 0:
  - Depreciation recapture tax = min(totalDepreciationClaimed, totalGain) × DEPRECIATION_RECAPTURE_RATE
  - Capital gain = max(0, totalGain - totalDepreciationClaimed) — the appreciation portion
  - Look up LTCG rate using taxableIncome + filingStatus (use Phase 1 tax module or implement lookup)
  - Capital gain tax = capitalGain × applicable LTCG rate
  - Total tax = depreciationRecaptureTax + capitalGainTax
  - Net proceeds = salePrice - sellingCosts - totalTax - mortgageBalance

**IMPORTANT:** No Section 121 exclusion. The property is no longer a primary residence (converted to rental). After 3+ years as rental, the 2-of-last-5-years residency test fails.

**`worstCaseMonthlyRentalCashFlow(baseCashFlow: RentalCashFlowResult, maintenanceShockMonthly: number): number`**
- Returns baseCashFlow.cashFlow - maintenanceShockMonthly
- Simple subtraction, but isolated for clarity in scenario engine

### Test expectations

**`annualDepreciation` tests:**
```
$270,000 home:
  Depreciable basis = 270000 × 0.85 = 229,500
  Annual depreciation = 229500 / 27.5 = 8,345.45 (to 2 decimal places)

$400,000 home:
  Depreciable basis = 400000 × 0.85 = 340,000
  Annual depreciation = 340000 / 27.5 = 12,363.64

Edge: $0 home → 0
```

**`monthlyRentalCashFlow` tests — Preston defaults:**
```
Inputs:
  monthlyRent = 2000
  monthlyMortgagePI ≈ 843 (from Phase 1: calculateMonthlyPayment on original Kyle loan)
  annualPropertyTax = 270000 × 0.0215 = 5,805 (no homestead exemption!)
  annualInsurance = 2400 × 1.20 = 2,880 (landlord insurance increase)
  annualMaintenance = 270000 × 0.0075 = 2,025
  monthlyHOA = 0
  vacancyRate = 0.08
  managementFeeRate = 0.0 (Preston manages himself)

Expected:
  effectiveGrossRent = 2000 × 0.92 = 1,840.00
  vacancyAllowance = 2000 × 0.08 = 160.00
  propertyTax/mo = 5805 / 12 = 483.75
  insurance/mo = 2880 / 12 = 240.00
  maintenance/mo = 2025 / 12 = 168.75
  HOA = 0
  managementFee = 1840 × 0.0 = 0
  totalExpenses = 483.75 + 240 + 168.75 + 0 + 0 + 160 = 1,052.50
  NOI = 1840 - 1052.50 = 787.50
  cashFlow = 787.50 - 843 = -55.50 (approximately, depends on exact mortgage payment)
```

**Note:** The exact monthly payment for Kyle depends on the original loan amount, which Phase 1's `calculateOriginalLoanAmount(199000, 0.02, 30, 5)` computes. Use that function in test setup. The implementing agent MUST call the Phase 1 function to get the exact value rather than hardcoding an approximation.

**Edge cases:**
- Zero rent, all other inputs normal → effectiveGrossRent = 0, cashFlow deeply negative
- 100% vacancy → effectiveGrossRent = 0, vacancyAllowance = full rent
- Zero management fee (self-managed) → managementFee = 0

**`scheduleETaxImpact` tests:**

Test 1 — Full passive offset (AGI ≤ $100k):
```
AGI = 100,000 (at the threshold — full offset available)
Rental loss = -15,000 (net rental income is negative)
Passive allowance = max(0, 25000 × (1 - (100000 - 100000) / 50000)) = 25,000
Deductible = min(15000, 25000) = 15,000
Tax benefit at 22% marginal rate = 15000 × 0.22 = 3,300
```

Test 2 — Partial phase-out (AGI = $125k):
```
AGI = 125,000
Passive allowance = max(0, 25000 × (1 - (125000 - 100000) / 50000))
                  = max(0, 25000 × (1 - 0.5)) = 12,500
Rental loss = -15,000
Deductible = min(15000, 12500) = 12,500
Suspended = 15000 - 12500 = 2,500
Tax benefit at 24% marginal rate = 12500 × 0.24 = 3,000
```

Test 3 — Full phase-out (AGI ≥ $150k):
```
AGI = 150,000
Passive allowance = max(0, 25000 × (1 - (150000 - 100000) / 50000))
                  = max(0, 25000 × 0) = 0
Deductible = 0
Tax benefit = 0
```

Test 4 — Positive rental income (no loss):
```
Net rental income = +5,000 (profitable rental)
Deductible loss = 0, tax benefit = 0
```

Test 5 — AGI below phase-out start:
```
AGI = 80,000 (well below $100k)
Passive allowance = 25,000 (full)
Rental loss = -30,000
Deductible = min(30000, 25000) = 25,000 (capped at max offset)
Suspended = 5,000
```

**`rentalSaleTax` tests:**

Test 1 — Preston sells after 20 years:
```
Inputs:
  salePrice: 270000 × (1.03)^20 = 270000 × 1.80611 = 487,650 (approximately)
  originalBasis: 270,000
  totalDepreciationClaimed: 8345.45 × 20 = 166,909
  sellingCostRate: 0.06
  yearsOwned: 20 (long-term capital gain)
  taxableIncome: ~180,000 (with salary growth — compute exactly)
  filingStatus: 'single'
  mortgageBalance: 0 (30-year loan, 25 years in — paid off or nearly so)

Expected:
  sellingCosts = 487650 × 0.06 = 29,259
  adjustedBasis = 270000 - 166909 = 103,091
  totalGain = 487650 - 29259 - 103091 = 355,300
  depreciationRecaptureTax = 166909 × 0.25 = 41,727.25
  capitalGain = 355300 - 166909 = 188,391
  capitalGainTax = 188391 × 0.15 = 28,258.65 (at 15% LTCG — verify bracket)
  totalTax = 41727.25 + 28258.65 = 69,985.90
  netSaleProceeds = 487650 - 29259 - 69985.90 - 0 = 388,405.10
```

Test 2 — Sale at a loss:
```
salePrice < adjustedBasis + sellingCosts → totalGain negative
All tax fields = 0
netSaleProceeds = salePrice - sellingCosts - mortgageBalance (could be negative if underwater)
```

Test 3 — Short ownership (< 1 year, short-term gain):
```
yearsOwned = 0 → capital gains taxed at ordinary income rates, not LTCG rates
(Note: this is unlikely in our model but should be handled correctly)
```

**`worstCaseMonthlyRentalCashFlow` test:**
```
Base cash flow = -55.50/mo
Maintenance shock = 8000 / 12 = 666.67/mo
Worst case = -55.50 - 666.67 = -722.17/mo
```

**Commit:** `feat(engine): add rental property cash flow and tax engine + tests`

---

## Task 3: Capital Module (TDD)

**Files:**
- Create: `src/engine/capital.ts`
- Create: `src/engine/__tests__/capital.test.ts`

**Imports from Phase 1:** `tax.ts` (for IRA withdrawal net proceeds calculation)

### Functions to implement

**`calculateUpfrontCapital(inputs): UpfrontCapital`**
```typescript
inputs: {
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  homePrice: number
  downPaymentPercent: number
  closingCostsRate: number
  movingCosts: number
  liquidSavings: number
  homeSaleNetProceeds?: number      // Scenario A
  iraWithdrawalNetProceeds?: number  // Scenario B
}
```
- Baseline: no capital event. Return all zeros except liquidSavings as cashAvailable.
- Scenario A: downPayment + closingCosts + movingCosts. Available = liquidSavings + homeSaleNetProceeds.
- Scenario B: downPayment + closingCosts + movingCosts. Available = liquidSavings + iraWithdrawalNetProceeds.
- surplus = cashAvailable - totalCashNeeded (negative = shortfall)
- Return full `UpfrontCapital` from types.ts, including null for non-applicable fields (iraWithdrawalNetProceeds null for A, homeSaleNetProceeds null for B)

**`monthlyBurnRate(inputs): number`**
```typescript
inputs: {
  monthlyGrossIncome: number
  monthlyFederalTax: number
  primaryMortgagePI: number
  primaryPropertyTaxMonthly: number
  primaryInsuranceMonthly: number
  primaryPMIMonthly: number
  monthlyLivingExpenses: number
  monthlyDebtPayments: number
  rentalNetCashFlow?: number     // Scenario B: can be positive (helps) or negative (hurts)
}
```
- Net monthly position = (grossIncome - federalTax) - primaryMortgagePI - primaryPropertyTax - primaryInsurance - primaryPMI - livingExpenses - debtPayments + (rentalNetCashFlow ?? 0)
- Positive = surplus, negative = bleeding reserves

**`reserveRunwayMonths(postClosingLiquidSavings: number, monthlyBurnRate: number): number`**
- If monthlyBurnRate ≥ 0 (positive cash flow): return Infinity (not depleting reserves)
- If monthlyBurnRate < 0: return postClosingLiquidSavings / Math.abs(monthlyBurnRate)
- If postClosingLiquidSavings ≤ 0: return 0

**`stressTest(inputs): StressTestResult`**
```typescript
inputs: {
  postClosingReserves: number
  monthlyNetPosition: number     // from monthlyBurnRate
  monthlyRent: number            // for vacancy shock calculation
  monthlyGrossIncome: number
  monthlyObligations: number     // total fixed costs (mortgage, taxes, insurance, living, debts)
  homeValue: number              // rental property
  mortgageBalance: number        // rental property
  sellingCostRate: number
}
```

Three stress scenarios:
1. **Vacancy + maintenance:** shockCost = (3 × monthlyRent) + 8000. After absorbing shock: remainingReserves = postClosingReserves - shockCost. monthsOfReserves = if monthlyNetPosition ≥ 0 then Infinity else remainingReserves / abs(monthlyNetPosition). If remainingReserves ≤ 0, return 0.
2. **Income disruption:** reducedMonthlyIncome = monthlyGrossIncome × 0.80. monthlyShortfall = monthlyObligations - reducedMonthlyIncome. If shortfall ≤ 0 (can survive on 80% income), monthsUntilCrisis = Infinity. Else monthsUntilCrisis = postClosingReserves / monthlyShortfall.
3. **Market downturn:** newValue = homeValue × 0.90. currentEquity = homeValue - mortgageBalance. newEquity = newValue - mortgageBalance. underwaterBy = max(0, -newEquity). forcedSaleLoss = if newEquity < 0 then (newValue × sellingCostRate + underwaterBy) else 0.

### Test expectations

**`calculateUpfrontCapital` — Scenario A (Preston):**
```
homePrice = 300,000
downPaymentPercent = 0.20
closingCostsRate = 0.025
movingCosts = 3,000
liquidSavings = 0

Home sale proceeds (computed externally):
  Kyle value = 270,000, mortgage = 199,000, selling costs = 270000 × 0.06 = 16,200
  Net proceeds = 270000 - 199000 - 16200 = 54,800

downPayment = 300000 × 0.20 = 60,000
closingCosts = 300000 × 0.025 = 7,500
totalCashNeeded = 60000 + 7500 + 3000 = 70,500
cashAvailable = 0 + 54800 = 54,800
surplus = 54800 - 70500 = -15,700 (SHORTFALL — critical warning!)
```

**`calculateUpfrontCapital` — Scenario B (Preston):**
```
homePrice = 300,000
downPaymentPercent = 0.10
closingCostsRate = 0.025
movingCosts = 3,000
liquidSavings = 0

IRA withdrawal net proceeds (from Phase 1 tax module):
  $30k withdrawal, $100k income, single, age 37, traditional
  ≈ $20,400 net (verify exact value from Phase 1 tests)

downPayment = 300000 × 0.10 = 30,000
closingCosts = 300000 × 0.025 = 7,500
totalCashNeeded = 30000 + 7500 + 3000 = 40,500
cashAvailable = 0 + 20400 = 20,400
surplus = 20400 - 40500 = -20,100 (SHORTFALL — even worse!)
```

**`monthlyBurnRate` — Scenario B (Preston):**
```
Monthly gross income = 100000 / 12 = 8,333.33
Monthly federal tax ≈ computed from Phase 1 tax module
Austin mortgage PI ≈ calculateMonthlyPayment(270000, 0.06, 30) = ~1,618.79
  (loan = 300000 × 0.90 = 270,000)
Austin property tax/mo = 300000 × 0.02 / 12 = 500
Austin insurance/mo = 2400 / 12 = 200
Austin PMI/mo = 270000 × 0.007 / 12 = 157.50 (LTV = 90%, PMI required)
Living expenses = 3,000
Debt payments = 0
Rental net cash flow ≈ -55.50 (from Task 2)

Verify the net monthly position is very tight or negative.
```

**`reserveRunwayMonths` tests:**
```
$5,000 reserves, -$500/mo burn → 5000 / 500 = 10 months
$5,000 reserves, +$200/mo → Infinity
$0 reserves, any burn → 0
```

**`stressTest` — Vacancy + maintenance (Preston):**
```
monthlyRent = 2000
shockCost = (3 × 2000) + 8000 = 14,000
If postClosingReserves = 5000 (hypothetical):
  remainingReserves = 5000 - 14000 = -9,000 → monthsOfReserves = 0
  (Cannot absorb even the first shock — critical warning)
```

**`stressTest` — Market downturn:**
```
homeValue = 270,000, mortgageBalance = 199,000
currentEquity = 71,000
newValue = 270000 × 0.90 = 243,000
newEquity = 243000 - 199000 = 44,000
underwaterBy = 0 (still positive)
forcedSaleLoss = 0

High-LTV test: homeValue = 220,000, mortgageBalance = 210,000
currentEquity = 10,000
newValue = 198,000
newEquity = 198000 - 210000 = -12,000
underwaterBy = 12,000
forcedSaleLoss = 198000 × 0.06 + 12000 = 23,880
```

**Commit:** `feat(engine): add upfront capital and stress test engine + tests`

---

## Task 4: DTI Module (TDD)

**Files:**
- Create: `src/engine/dti.ts`
- Create: `src/engine/__tests__/dti.test.ts`

**Imports from constants:** `DTI_FRONT_END_TARGET`, `DTI_BACK_END_TARGET`, `DTI_HARD_MAX`, `RENTAL_INCOME_DTI_CREDIT_RATE`

### Functions to implement

**`frontEndDTI(monthlyHousingCost: number, grossMonthlyIncome: number): number`**
- Returns monthlyHousingCost / grossMonthlyIncome
- Housing cost = PITI + PMI + HOA for primary residence
- Edge: if grossMonthlyIncome = 0, return Infinity

**`backEndDTI(inputs): number`**
```typescript
inputs: {
  primaryHousingCost: number
  otherDebtPayments: number
  grossMonthlyIncome: number
  rentalMortgagePayment?: number
  expectedMonthlyRent?: number
  rentalIncomeCredit?: number     // defaults to RENTAL_INCOME_DTI_CREDIT_RATE (0.75)
}
```
- For non-rental scenarios: (primaryHousingCost + otherDebtPayments) / grossMonthlyIncome
- For Scenario B: effectiveRentalDebt = rentalMortgagePayment - (expectedMonthlyRent × rentalIncomeCredit). Cap at 0 floor (lenders don't count excess rental income as positive income in DTI).
- Total debt = primaryHousingCost + effectiveRentalDebt + otherDebtPayments
- Return totalDebt / grossMonthlyIncome

**`calculateDTI(inputs): DTIResult`**
```typescript
inputs: {
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  grossMonthlyIncome: number
  primaryHousingCost: number
  otherDebtPayments: number
  rentalMortgagePayment?: number
  expectedMonthlyRent?: number
  rentalIncomeCreditRate?: number
}
```
- Compute frontEndDTI and backEndDTI
- passesLenderThreshold = backEndDTI ≤ DTI_HARD_MAX
- rentalIncomeCredit = Scenario B ? (expectedMonthlyRent × creditRate) : 0
- Return `DTIResult`

### Test expectations

**Front-end DTI (Preston, Scenario A):**
```
Austin PITI = mortgage PI + propertyTax/12 + insurance/12
  = ~1618.79 + 500 + 200 = 2,318.79
Gross monthly income = 100000 / 12 = 8,333.33
Front-end DTI = 2318.79 / 8333.33 = 0.2783 (27.8%)
(Just under the 28% target — tight!)
```

**Back-end DTI (Preston, Scenario A):**
```
All debts = 2318.79 (Austin PITI) + 0 (no other debts)
Back-end DTI = 2318.79 / 8333.33 = 0.2783 (27.8%)
passesLenderThreshold = true (under 43%)
```

**Back-end DTI (Preston, Scenario B — two mortgages):**
```
Austin PITI = ~2,318.79 + PMI (157.50) = 2,476.29
Kyle rental mortgage PI = ~843
Expected rent = 2,000
Rental income credit = 2000 × 0.75 = 1,500
Effective rental debt = max(0, 843 - 1500) = 0 (rent exceeds mortgage — capped at 0)

Note: But lenders also consider rental PITI, not just PI. Kyle PITI:
  PI = ~843
  PropertyTax/mo = 5805/12 = 483.75
  Insurance/mo = 240
  Kyle PITIA = 843 + 483.75 + 240 = 1,566.75
  Effective rental debt = max(0, 1566.75 - 1500) = 66.75

Back-end DTI = (2476.29 + 66.75 + 0) / 8333.33 = 0.3052 (30.5%)

IMPORTANT: Verify whether lenders offset against PI only or full PITI.
Common practice is to offset against FULL rental PITI (mortgage + taxes + insurance + HOA).
Use full PITI for the offset calculation. Document this assumption with a comment.
```

**DTI with low rent (edge case):**
```
Monthly rent = 800, rental mortgage PITI = 1,566.75
Rental income credit = 800 × 0.75 = 600
Effective rental debt = 1566.75 - 600 = 966.75
Much higher DTI — shows sensitivity to rent assumption.
```

**Edge cases:**
- Zero income → DTI = Infinity, passesLenderThreshold = false
- Zero debt → DTI = 0
- No rental (Scenario A) → rentalIncomeCredit = 0

**Commit:** `feat(engine): add DTI calculations with rental income credit + tests`

---

## Task 5: Scenario Stepping Helpers (TDD)

**Files:**
- Create: `src/engine/scenarios.ts` (start with helpers, build up)
- Create: `src/engine/__tests__/scenarios.test.ts`

### Internal helper functions (not exported from module, but testable via exported wrapper or test-only export)

**Export strategy:** Export the helpers for testing. They can be marked with a `/** @internal */` JSDoc tag and used only by `scenarios.ts` and its tests.

**`stepMortgageYear(balance: number, annualRate: number, monthlyPayment: number): { endingBalance: number, principalPaid: number, interestPaid: number }`**
- Iterate 12 months:
  - monthlyInterest = balance × (annualRate / 12)
  - monthlyPrincipal = monthlyPayment - monthlyInterest
  - balance -= monthlyPrincipal
  - Accumulate totalInterest and totalPrincipal
- Handle edge: if balance goes below 0, clamp to 0 (final payment may be partial)
- Handle edge: 0% interest rate → all principal, zero interest

**`stepIRAYear(balance: number, annualReturn: number, annualContribution: number): number`**
- Returns (balance × (1 + annualReturn)) + annualContribution
- Contribution added at end of year (conservative — slightly underestimates growth)
- Edge: 0% return → balance + annualContribution

**`stepAppreciationYear(currentValue: number, appreciationRate: number): number`**
- Returns currentValue × (1 + appreciationRate)
- Edge: negative appreciation → value decreases

### Test expectations

**`stepMortgageYear` — Kyle mortgage year 6 (first year of projection):**
```
balance = 199,000, annualRate = 0.02
monthlyPayment = calculateMonthlyPayment(originalLoan, 0.02, 30) from Phase 1

Use Phase 1 functions to set up:
  originalLoan = calculateOriginalLoanAmount(199000, 0.02, 30, 5)
  monthlyPayment = calculateMonthlyPayment(originalLoan, 0.02, 30)

After 1 year:
  principalPaid + interestPaid = monthlyPayment × 12
  interestPaid ≈ balance × annualRate (approximation for low rates)
  Verify endingBalance < 199,000
  Verify principalPaid + interestPaid = monthlyPayment × 12 (exact)
```

**`stepMortgageYear` — 0% interest edge case:**
```
balance = 120,000, annualRate = 0, monthlyPayment = 1,000
After 1 year: endingBalance = 108,000, principalPaid = 12,000, interestPaid = 0
```

**`stepIRAYear`:**
```
$30,000 at 7% + $7,000 contribution:
  Growth: 30000 × 1.07 = 32,100
  Plus contribution: 32100 + 7000 = 39,100

$0 at 7% + $0 contribution → 0

$50,000 at 0% + $7,000 → 57,000
```

**`stepAppreciationYear`:**
```
$270,000 at 3% → 278,100
$270,000 at 0% → 270,000
$270,000 at -5% → 256,500
```

**Commit:** `feat(engine): add scenario stepping helpers + tests`

---

## Task 6: Baseline Scenario Projection (TDD)

**Files:**
- Modify: `src/engine/scenarios.ts`
- Modify: `src/engine/__tests__/scenarios.test.ts`

### `projectBaseline(inputs: ScenarioInputs): ScenarioOutput`

The simplest scenario: stay in Kyle, keep IRA, keep commuting.

**Year-by-year loop logic (year = 1 to timeHorizonYears):**

1. Compute this year's gross income: `annualGrossIncome × (1 + annualSalaryGrowthRate)^(year-1)`
   - Year 1 income = base income (no growth applied yet — growth starts year 2)
2. Compute taxable income: grossIncome - standardDeduction
3. Compute federal tax using Phase 1 `calculateFederalIncomeTax(taxableIncome, filingStatus)`
4. Step Kyle mortgage: `stepMortgageYear(currentBalance, rate, monthlyPayment)`
   - Must compute original loan and monthly payment once in setup
   - Track remaining term: if fully paid off, mortgagePayment = 0 for subsequent years
5. Step Kyle home value: `stepAppreciationYear(currentValue, appreciationRate)`
6. Step IRA: `stepIRAYear(iraBalance, returnRate, annualContributionA)`
7. Compute annual commute cost using Phase 1 commute functions
8. Compute monthly cash flow:
   - Best case: (grossIncome - federalTax) / 12 - mortgagePI - propertyTax/12 - insurance/12 - livingExpenses - debtPayments
   - Worst case: same as best (no rental volatility in baseline)
9. Net worth = homeEquity + iraBalance + liquidSavings accumulation
   - liquidSavings grows by annual cash surplus (annualCashFlow if positive)

**Setup (before loop):**
- Back-calculate original Kyle loan: `calculateOriginalLoanAmount(mortgageBalance, interestRate, originalLoanTermYears, yearsIntoLoan)`
- Monthly payment: `calculateMonthlyPayment(originalLoan, interestRate, originalLoanTermYears)`
- Remaining payments at start: `(originalLoanTermYears - yearsIntoLoan) × 12`
- Escalation: property tax and insurance increase annually per `propertyTaxEscalationRate` and `insuranceEscalationRate`

**Upfront capital:** Baseline has no capital event. Return zeros with liquidSavings as cashAvailable.

**DTI:** Baseline uses current Kyle mortgage. Compute `calculateDTI('baseline', ...)`.

**Warnings (baseline):**
- Track IRA balance at age 65 for retirement adequacy (info-level only)
- No lending warnings (no new mortgage)

### Test expectations — Key checkpoints

**Baseline Year 1 (Preston defaults):**
```
Income = $100,000 (no growth yet)
Taxable = 100000 - 14600 = 85,400
Federal tax = Phase 1: calculateFederalIncomeTax(85400, 'single')
  10% on first 11,600 = 1,160
  12% on 11,600-47,150 = 4,266
  22% on 47,150-85,400 = 8,415
  Total = 13,841

Kyle mortgage: step from $199k balance at 2%
Kyle home value: 270000 × 1.03 = 278,100
IRA: (30000 × 1.07) + 7000 = 39,100

Verify net worth = (278100 - endingKyleMortgage) + 39100 + liquidSavings
Verify monthlyCashFlowBestCase matches manually computed value
```

**Baseline Year 20:**
```
Income = 100000 × (1.03)^19 = 100000 × 1.75351 = 175,351
Kyle home value = 270000 × (1.03)^20 = 270000 × 1.80611 = 487,650
Kyle mortgage: should be paid off (25 years remaining at start, 20 years elapsed = 5 years left)
  Wait — Kyle is 5 years into a 30-year loan at start. After 20 more years = 25 years into loan.
  Still 5 years remaining. NOT paid off.
IRA: compound growth over 20 years with $7k annual contributions
  Can verify with Phase 1 calculateIRAFutureValue(30000, 7000, 0.07, 20)
```

**Directional checks:**
- Net worth increases every year (home appreciates, IRA compounds, mortgage pays down)
- Year 20 net worth > Year 1 net worth
- IRA balance grows monotonically

**Commit:** `feat(engine): add baseline scenario projection + tests`

---

## Task 7: Scenario A Projection (TDD)

**Files:**
- Modify: `src/engine/scenarios.ts`
- Modify: `src/engine/__tests__/scenarios.test.ts`

### `projectScenarioA(inputs: ScenarioInputs): ScenarioOutput`

Sell Kyle, buy Austin, keep IRA intact + contributing.

**Setup (before loop):**
1. **Kyle sale proceeds:**
   - Back-calculate original Kyle loan and monthly payment
   - Remaining balance = current `mortgageBalance` (sale happens at time 0)
   - Net proceeds = homeValue - (homeValue × sellingCostsRate) - mortgageBalance
   - $270k - $16,200 - $199k = $54,800

2. **Austin mortgage:**
   - Down payment = purchasePrice × downPaymentPercentScenarioA
   - Loan amount = purchasePrice - downPayment
   - Monthly payment = calculateMonthlyPayment(loanAmount, newHome.interestRate, newHome.loanTermYears)
   - Initial LTV = loanAmount / purchasePrice → determine if PMI required (LTV > 0.80)

3. **Upfront capital:** `calculateUpfrontCapital('scenarioA', ...)`

4. **Post-closing liquid savings:**
   - liquidSavings + homeSaleNetProceeds - downPayment - closingCosts - movingCosts
   - This is the starting liquid reserves

5. **DTI:** `calculateDTI('scenarioA', ...)`

**Year-by-year loop (same structure as baseline, but with Austin instead of Kyle):**
1. Income with salary growth
2. Federal tax
3. Step Austin mortgage
4. Step Austin home value
5. Step IRA (same contributions as baseline — Scenario A keeps IRA)
6. **PMI check each year:** if LTV (currentBalance / originalPurchasePrice) ≤ PMI_AUTO_CANCELLATION_LTV, PMI = 0 for this year and all subsequent
7. Monthly cash flow: income - tax - Austin PITI - PMI - living - debts
8. Commute savings vs baseline (shorter commute)
9. Escalate property tax and insurance annually
10. Net worth = Austin equity + IRA + liquid savings
11. Liquid savings tracks cumulative surplus/deficit each year

### Test expectations

**Scenario A Year 1 (Preston):**
```
Austin loan = 300000 × 0.80 = 240,000
Austin monthly PI = calculateMonthlyPayment(240000, 0.06, 30)
  ≈ $1,438.92 (verify with Phase 1)
Austin property tax/mo = 300000 × 0.02 / 12 = 500
Austin insurance/mo = 2400 / 12 = 200
PMI: LTV = 240000/300000 = 0.80 → exactly at request threshold, NOT above.
  20% down = 80% LTV. PMI required at LTV > 80%. At exactly 80%, NO PMI.
  PMI = $0

PITI = 1438.92 + 500 + 200 = 2,138.92
Income = $100,000, Federal tax ≈ $13,841
Net monthly = (100000 - 13841) / 12 - 2138.92 - 3000 - 0
  = 7179.92 - 2138.92 - 3000 = 2,041.00/mo

Austin value = 300000 × 1.035 = 310,500
Austin equity = 310500 - (240000 - principalPaid)
IRA = 39,100 (same as baseline)

Net worth = Austin equity + IRA + liquid savings
```

**PMI test for Scenario B (10% down):**
```
Austin loan = 300000 × 0.90 = 270,000
LTV = 270000/300000 = 0.90 → PMI required
Annual PMI = 270000 × 0.007 = 1,890
Monthly PMI = 157.50

PMI drops when LTV reaches 78% of ORIGINAL purchase price:
  Threshold balance = 300000 × 0.78 = 234,000
  Find year when Austin mortgage balance drops below 234,000
```

**Directional checks:**
- No Kyle-related fields (sold at time 0)
- currentHomeEquity = 0 and currentHomeMortgageBalance = 0 for all years
- IRA trajectory identical to baseline
- Lower commute costs than baseline (shorter commute)

**Commit:** `feat(engine): add Scenario A projection (sell Kyle, buy Austin) + tests`

---

## Task 8: Scenario B Projection (TDD)

**Files:**
- Modify: `src/engine/scenarios.ts`
- Modify: `src/engine/__tests__/scenarios.test.ts`

### `projectScenarioB(inputs: ScenarioInputs): ScenarioOutput`

This is the most complex scenario: keep Kyle as rental, withdraw IRA, buy Austin.

**Setup (before loop):**
1. **IRA withdrawal:**
   - Use Phase 1: `calculateIRAWithdrawalTax(iraBalance, annualGrossIncome, filingStatus, age, iraType)`
   - Net proceeds fund the Austin down payment
   - IRA balance starts at $0

2. **Austin mortgage:**
   - Down payment = purchasePrice × downPaymentPercentScenarioB
   - Loan amount = purchasePrice - downPayment
   - Monthly payment, PMI determination (likely required — 10% down = 90% LTV)

3. **Kyle rental setup:**
   - Back-calculate original Kyle loan and monthly payment (same as baseline)
   - Kyle property tax switches to NON-HOMESTEAD rate (already in inputs as `annualPropertyTaxRate` — document that this should be the full rate without homestead exemption)
   - Landlord insurance = annualInsurance × (1 + landlordInsurancePremiumIncrease)
   - Annual maintenance = homeValue × maintenanceReserveRate
   - Initialize cumulativeDepreciation = 0

4. **Upfront capital:** `calculateUpfrontCapital('scenarioB', ...)`
5. **DTI:** `calculateDTI('scenarioB', ...)` with rental income credit
6. **Stress test:** `stressTest(...)` using initial reserves

**Year-by-year loop:**

For each year 1 to timeHorizonYears:

1. Compute income with salary growth
2. **If year ≤ plannedRentalExitYear** (rental is active):
   a. Step Kyle mortgage
   b. Step Kyle home value (appreciation)
   c. Compute rental cash flow: `monthlyRentalCashFlow(...)` with escalated taxes/insurance
   d. Compute annual depreciation: `annualDepreciation(originalHomeValue)` — NOTE: depreciation is on the ORIGINAL value at conversion, not the appreciated value
   e. Accumulate cumulativeDepreciation
   f. Compute mortgage interest for the year (for Schedule E): use `stepMortgageYear` result
   g. Compute AGI = grossIncome + netRentalIncome (if positive) or grossIncome (if rental loss is deductible)
   h. Compute Schedule E: `scheduleETaxImpact(...)`
   i. Compute worst-case cash flow: `worstCaseMonthlyRentalCashFlow(...)`
   j. Track turnover costs: if year is a multiple of `tenantTurnoverFrequencyYears`, deduct `costPerTurnover`
   k. Additional costs: `additionalTaxPrepCost`, `umbrellaInsuranceAnnualCost`

3. **If year === plannedRentalExitYear** (rental exit event):
   a. Kyle appreciated value = original × (1 + appreciation)^year
   b. Compute `rentalSaleTax(...)` with cumulative depreciation, remaining mortgage, etc.
   c. Net sale proceeds go to liquid savings
   d. Kyle mortgage paid off from proceeds
   e. Set flag: rental is no longer active
   f. Populate `rentalExitTaxEvent` on the ScenarioOutput

4. **If year > plannedRentalExitYear** (post-exit):
   - No rental income/expenses/depreciation
   - Only Austin mortgage + living costs
   - Rental-specific YearlySnapshot fields = undefined

5. Step Austin mortgage
6. Step Austin home value
7. Step IRA: starts at $0, contributions at `annualIRAContributionScenarioB` rate
8. Compute federal tax (adjusted for Schedule E benefit if rental active)
9. PMI check on Austin
10. Escalate property tax and insurance for both properties (while rental active)
11. Monthly cash flow:
    - Best case: net income - Austin PITI - PMI - living - debts + rental net cash flow (if positive)
    - Worst case: same but with worst-case rental cash flow
12. Net worth = Austin equity + Kyle equity (if held) + IRA + liquid savings
13. Liquid savings tracks cumulative surplus/deficit + rental sale proceeds (if exit year)

**Rental-specific YearlySnapshot fields:**
- `rentalGrossIncome` = effectiveGrossRent × 12
- `depreciationExpense` = annualDepreciation
- `passiveLossAllowed` = scheduleETaxResult.deductibleLoss
- `passiveLossSuspended` = abs(netRentalIncome) - deductibleLoss (if loss exceeds allowance)

### Test expectations

**Scenario B Year 1 (Preston):**
```
IRA withdrawn: balance = $0
Austin loan = 270,000 (10% down on $300k)
Austin PI ≈ $1,618.79
Austin PMI = 270000 × 0.007 / 12 = $157.50/mo
Austin PITI + PMI = 1618.79 + 500 + 200 + 157.50 = 2,476.29

Kyle rental cash flow ≈ -$55.50/mo (from Task 2 — verify with escalated year 1 values)
Kyle depreciation = $8,345.45
Kyle mortgage interest ≈ from stepMortgageYear result

Schedule E: at $100k AGI, full passive loss offset available
Tax benefit = deductibleLoss × marginalRate

Monthly cash flow best case:
  (100000 - fedTax + taxBenefit) / 12 - 2476.29 - 3000 + rentalCashFlow

IRA = (0 × 1.07) + 0 = $0 (Preston contributes $0 in Scenario B)

Net worth = Austin equity + Kyle equity + 0 (IRA) + liquid savings
```

**Scenario B at rental exit (Year 20):**
```
Cumulative depreciation = 8345.45 × 20 = 166,909
Kyle appreciated value = 270000 × (1.03)^20 ≈ 487,650
Rental sale tax computed via rentalSaleTax(...)
Net proceeds added to liquid savings
Subsequent years (if any): no rental activity
```

**Directional checks:**
- IRA balance = 0 in Year 1, slowly rebuilds (or stays 0 if contribution = 0)
- Scenario B IRA < Scenario A IRA at every year
- Monthly cash flow tighter than Scenario A (two mortgages)
- Rental exit year shows a spike in liquid savings (sale proceeds)
- Post-exit years have no rental income/expenses
- Warning count ≥ baseline warning count

**Commit:** `feat(engine): add Scenario B projection (keep rental, withdraw IRA) + tests`

---

## Task 9: Model Orchestrator + Warning Generation (TDD)

**Files:**
- Modify: `src/engine/scenarios.ts`
- Modify: `src/engine/__tests__/scenarios.test.ts`

### `runModel(inputs: ScenarioInputs): ModelOutput`

Simple orchestrator:
```typescript
export function runModel(inputs: ScenarioInputs): ModelOutput {
  return {
    baseline: projectBaseline(inputs),
    scenarioA: projectScenarioA(inputs),
    scenarioB: projectScenarioB(inputs),
  }
}
```

### Warning Generation

Each `project*` function should call a `generateWarnings(...)` helper after computing the projection. Warnings are based on computed values, not inputs.

**Warning table (implement all of these):**

| Condition | Category | Severity | Message Template |
|---|---|---|---|
| backEndDTI > DTI_HARD_MAX (0.43) | lending | critical | `"DTI of ${pct}% exceeds QM hard maximum of 43% — most lenders will not approve"` |
| backEndDTI > DTI_BACK_END_TARGET (0.36) | lending | warning | `"DTI of ${pct}% exceeds conventional target of 36%"` |
| monthlyCashFlowBestCase < 0 in Year 1 | liquidity | critical | `"Negative monthly cash flow of ${amt}/mo from day one — reserves will deplete"` |
| reserveRunwayMonths < 3 | liquidity | critical | `"Only ${months} months of reserves — one emergency could force a sale"` |
| reserveRunwayMonths < 6 | liquidity | warning | `"Only ${months} months of reserves — below 6-month recommendation"` |
| IRA at age 65 < 100,000 | retirement | critical | `"Projected retirement savings of ${amt} at age 65"` |
| IRA withdrawn (Scenario B) | retirement | warning | `"Early IRA withdrawal eliminates all retirement savings at age ${age}"` |
| Year 1 rental cash flow < 0 after tax benefit | landlord | warning | `"Rental property loses ${amt}/mo even after tax benefits"` |
| Passive loss fully phased out (AGI ≥ 150k) | tax | info | `"Rental loss deduction fully phased out at AGI of ${amt}"` |
| stressTest vacancyAndMaintenance.monthsOfReserves < 6 | liquidity | critical | `"Vacancy + major repair would exhaust reserves in ${months} months"` |
| stressTest incomeDisruption.monthsUntilCrisis < 6 | liquidity | critical | `"20% income drop would exhaust reserves in ${months} months"` |
| stressTest marketDownturn.underwaterBy > 0 | market | warning | `"10% market decline puts rental property underwater by ${amt}"` |
| upfrontCapital.surplus < 0 | liquidity | critical | `"Cash shortfall of ${amt} — cannot fund this scenario without additional savings"` |

**Dollar impact:** Set `dollarImpact` on warnings where a specific dollar amount is quantifiable (shortfall amount, annual rental loss, IRA gap at 65, etc.).

### Test expectations

**Warning generation — Preston Scenario B:**
```
Should trigger:
- retirement warning (IRA withdrawn at age 37)
- retirement critical (IRA at age 65 ≈ $0 if no contributions)
- liquidity warning or critical (tight reserves)
- upfront capital shortfall (if surplus < 0)
- landlord warning (rental cash flow negative)

Should NOT trigger:
- DTI hard max (Preston's DTI should be under 43%)
- market downturn underwater (Kyle has decent equity)
```

**Warning generation — Baseline:**
```
Minimal warnings — perhaps only:
- Info-level retirement projection
- No lending warnings (no new mortgage)
```

**Verify warning structure:**
- Every warning has a non-empty message
- Every warning has a valid category and severity
- dollarImpact is set where applicable
- No duplicate warnings

**Commit:** `feat(engine): add runModel orchestrator and warning generation + tests`

---

## Task 10: Integration Tests — Golden Run 1 (Preston Defaults)

**Files:**
- Create: `src/engine/__tests__/integration-preston.test.ts`

This test uses all default values from `constants.ts` to build a complete `ScenarioInputs` and runs `runModel()`.

### Setup

```typescript
import { runModel } from '../scenarios'
import {
  DEFAULT_PERSONAL_INPUTS,
  DEFAULT_RETIREMENT_INPUTS,
  DEFAULT_CURRENT_HOME_INPUTS,
  DEFAULT_NEW_HOME_INPUTS,
  DEFAULT_COMMUTE_INPUTS,
  DEFAULT_COST_INPUTS,
  DEFAULT_PROJECTION_INPUTS,
} from '../constants'
import type { ScenarioInputs } from '../types'

const prestonInputs: ScenarioInputs = {
  personal: DEFAULT_PERSONAL_INPUTS,
  retirement: DEFAULT_RETIREMENT_INPUTS,
  currentHome: DEFAULT_CURRENT_HOME_INPUTS,
  newHome: DEFAULT_NEW_HOME_INPUTS,
  commute: DEFAULT_COMMUTE_INPUTS,
  costs: DEFAULT_COST_INPUTS,
  projection: DEFAULT_PROJECTION_INPUTS,
}
```

### Assertions

**Structure checks:**
- `result.baseline`, `result.scenarioA`, `result.scenarioB` all exist
- Each has exactly 20 yearly snapshots (timeHorizonYears = 20)
- Each has a non-null `upfrontCapital` and `dtiResult`
- `scenarioB.rentalExitTaxEvent` is non-null (exit at year 20)
- `baseline.rentalExitTaxEvent` and `scenarioA.rentalExitTaxEvent` are null

**Year 1 checkpoint assertions (compute expected values using Phase 1 functions):**
- Baseline Year 1 net worth: manually compute and assert with `toBeCloseTo(expected, -2)` (within $100)
- Scenario A Year 1 net worth: compute and assert
- Scenario B Year 1 net worth: compute and assert
- All three IRA balances match expected values

**Year 20 checkpoint assertions:**
- Each scenario's final net worth
- IRA balances: Scenario A >> Baseline (same contributions, same base) — wait, they should be identical since both contribute $7k/year at 7%. Actually baseline also contributes. Verify.
- Scenario B IRA: $0 or very small (if contributions = 0)

**Directional invariants:**
- Scenario A IRA ≥ Baseline IRA at every year (same or equal — both contribute)
- Scenario A IRA > Scenario B IRA at every year
- Baseline Year 1 monthly cash flow > Scenario B Year 1 monthly cash flow
- All net worth values are positive (no scenario goes bankrupt in projection)
- Snapshot count matches time horizon for all three

**Warning assertions:**
- Scenario B has more warnings than Baseline
- Scenario B includes a retirement-category warning
- Scenario B includes at least one liquidity-category warning
- Baseline has no lending-category warnings
- All warning messages are non-empty strings
- All warning categories are valid WarningCategory values

**Rental exit assertions:**
- Scenario B exit event at year 20: depreciationRecaptureTax > 0, netSaleProceeds > 0
- After exit year, no rental-specific snapshot fields
- (Since exit = final year, no "post-exit" years exist in this profile)

**Commit:** `test(engine): add Preston defaults integration test`

---

## Task 11: Integration Tests — Golden Run 2 (Conservative Couple)

**Files:**
- Create: `src/engine/__tests__/integration-couple.test.ts`

### Test profile: "Conservative Couple"

This profile exercises code paths that Preston's defaults don't hit.

```typescript
const coupleInputs: ScenarioInputs = {
  personal: {
    age: 42,
    annualGrossIncome: 150_000,
    annualSalaryGrowthRate: 0.02,
    filingStatus: 'married_filing_jointly',
    stateIncomeTaxRate: 0.0,         // Texas
    monthlyLivingExpenses: 4_500,
    monthlyDebtPayments: 500,         // car payment
    liquidSavings: 15_000,
  },
  retirement: {
    iraBalance: 50_000,
    iraType: 'roth',                  // Roth — different tax treatment
    iraExpectedAnnualReturn: 0.07,
    annualIRAContributionScenarioA: 7_000,
    annualIRAContributionScenarioB: 0,
    hasEmployerMatch: false,
    employerMatchPercentage: 0.0,
    hasOtherRetirementSavings: false,
    otherRetirementBalance: 0,
  },
  currentHome: {
    homeValue: 400_000,
    mortgageBalance: 280_000,
    interestRate: 0.035,
    originalLoanTermYears: 30,
    yearsIntoLoan: 7,
    annualPropertyTaxRate: 0.022,
    annualInsurance: 3_200,
    landlordInsurancePremiumIncrease: 0.20,
    maintenanceReserveRate: 0.01,
    monthlyHOA: 150,
    expectedMonthlyRent: 2_800,
    annualRentGrowthRate: 0.03,
    vacancyRate: 0.08,
    propertyManagementFeeRate: 0.10,  // Couple hires manager (unlike Preston)
    tenantTurnoverFrequencyYears: 2,
    costPerTurnover: 4_000,
    sellingCostsRate: 0.07,
    annualAppreciationRate: 0.03,
  },
  newHome: {
    purchasePrice: 500_000,
    interestRate: 0.065,
    loanTermYears: 30,
    downPaymentPercentScenarioA: 0.20,
    downPaymentPercentScenarioB: 0.10,
    annualPMIRate: 0.007,
    annualPropertyTaxRate: 0.022,
    annualInsurance: 3_600,
    closingCostsRate: 0.03,
    annualAppreciationRate: 0.035,
  },
  commute: {
    currentRoundTripMiles: 60,
    workDaysPerYear: 250,
    irsMileageRate: 0.725,
    currentMonthlyTolls: 400,
    newRoundTripMiles: 15,
    newMonthlyTolls: 50,
    commuteTimeSavedPerDayHours: 2.0,
    landlordHoursPerMonth: 3,         // Less — they have a property manager
  },
  costs: {
    movingCosts: 5_000,
    insuranceEscalationRate: 0.03,
    propertyTaxEscalationRate: 0.02,
    generalInflationRate: 0.025,
    additionalTaxPrepCost: 800,
    umbrellaInsuranceAnnualCost: 400,
  },
  projection: {
    timeHorizonYears: 10,
    plannedRentalExitYear: 5,         // Mid-projection exit!
  },
}
```

### What this profile exercises differently

| Feature | Preston | Couple | Why it matters |
|---|---|---|---|
| Filing status | single | married_filing_jointly | Different tax brackets, standard deduction |
| IRA type | traditional | roth | No income tax on withdrawal (only penalty) |
| AGI vs passive loss | $100k (full offset) | $150k (ZERO offset) | Tests full phase-out |
| Rental exit | Year 20 (final year) | Year 5 (mid-projection) | Tests post-exit continuation |
| Debt payments | $0 | $500/mo | Pushes DTI higher |
| Property manager | No (0%) | Yes (10%) | Reduces rental cash flow |
| HOA | $0 | $150/mo | Additional rental expense |
| Liquid savings | $0 | $15,000 | Different capital position |
| Time horizon | 20 years | 10 years | Different loop length |

### Assertions

**Structure:**
- All three scenarios have exactly 10 yearly snapshots
- Scenario B rentalExitTaxEvent is non-null

**Roth IRA withdrawal (Scenario B):**
- No federal income tax on withdrawal (Roth contributions are tax-free)
- BUT 10% early withdrawal penalty applies (age 42 < 59.5)
- Net proceeds = 50000 - (50000 × 0.10) = $45,000
- Verify iraWithdrawalNetProceeds ≈ $45,000 in upfrontCapital

**Passive loss phase-out:**
- At $150k AGI, passive allowance = 0
- Scenario B Year 1: deductibleLoss should be 0
- taxBenefit should be 0
- Verify passiveLossAllowed = 0 in YearlySnapshot

**Mid-projection rental exit (Year 5):**
- Scenario B year 5 snapshot shows rental sale proceeds
- Cumulative depreciation = annualDepreciation(400000) × 5
  = (400000 × 0.85 / 27.5) × 5 = 12363.64 × 5 = 61,818.18
- Years 6-10 have no rental activity (rentalGrossIncome = undefined)
- Post-exit cash flow improves (no rental mortgage obligation)
- Net worth in Year 6 should reflect sale proceeds in liquid savings

**DTI with existing debt:**
- Back-end DTI includes the $500/mo car payment
- With two mortgages + car payment at $150k income: verify DTI is computed correctly
- May or may not trigger DTI warnings depending on exact numbers

**Warning differences from Preston:**
- Should trigger: passive loss phase-out (tax/info)
- Should NOT trigger: retirement critical (Roth at $150k income, higher base)
- Different warning profile validates that warnings are input-driven, not hardcoded

**Year 1 and Year 10 checkpoints:**
- Hand-compute key values using Phase 1 functions + couple inputs
- Assert net worth, IRA balance, monthly cash flow for each scenario

**Directional invariants (same as Preston — must hold for ANY inputs):**
- Scenario A IRA > Scenario B IRA at every year
- Scenario B Year 1 cash flow < Scenario A Year 1 cash flow
- All three scenarios produce exactly 10 snapshots
- Net worth components sum correctly

**Commit:** `test(engine): add Conservative Couple integration test`

---

## Phase 2 Completion Criteria

- [ ] All 4 new engine modules pass all tests: `npx vitest run`
- [ ] Both integration tests (Preston + Couple) pass
- [ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
- [ ] ESLint passes with zero warnings: `npx eslint src/`
- [ ] No `any` types anywhere in engine/
- [ ] Every function has JSDoc explaining the financial reasoning
- [ ] `runModel(defaultInputs)` returns a complete `ModelOutput` with all three scenarios
- [ ] All expected warnings fire correctly for both test profiles
- [ ] Rental exit event produces correct tax consequences
- [ ] Post-exit years correctly zero out rental activity
- [ ] `npm run build` succeeds
- [ ] All commits follow conventional commit format

**Verify completion:** Run these commands and confirm all pass:
```bash
npx vitest run
npx tsc --noEmit
npx eslint src/
npm run build
```
