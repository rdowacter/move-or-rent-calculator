# Phase 2: Complete Financial Engine — Design Document

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Phase 1 (all 5 independent engine modules must be implemented and tested)

**Goal:** Build the composite domain logic and scenario orchestrator that ties all Phase 1 modules together into a complete financial model. After Phase 2, `runModel(inputs)` returns year-by-year projections for all three scenarios with warnings, capital analysis, and DTI — ready for UI consumption in Phase 3.

**Architecture:** Per-scenario projection functions with shared stepping helpers (Approach B). Each scenario is independently testable. The rental exit is modeled as a discrete event in the year-by-year loop.

**Reference docs:**
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `docs/plans/2026-03-14-phase1-foundation.md` — Phase 1 modules this builds on
- `CLAUDE.md` — coding standards, financial logic reminders, domain expertise

---

## Module Overview & Dependencies

Phase 2 adds 4 files to `src/engine/`:

```
rental.ts    → depends on: mortgage, tax, appreciation, constants
capital.ts   → depends on: mortgage, tax, ira, constants
dti.ts       → depends on: mortgage, constants
scenarios.ts → depends on: ALL modules (orchestrator)
```

Build order: `rental.ts`, `capital.ts`, and `dti.ts` are independent of each other and can be built in parallel. `scenarios.ts` comes last since it depends on all of them.

---

## New Types (add to `types.ts`)

```typescript
/** rental.ts results */
RentalCashFlowResult {
  grossRent: number
  effectiveGrossRent: number       // after vacancy
  totalExpenses: number
  netOperatingIncome: number
  mortgagePayment: number
  cashFlow: number                 // NOI - mortgage P&I
  itemizedExpenses: {
    propertyTax: number
    insurance: number
    maintenance: number
    hoa: number
    managementFee: number
    vacancyAllowance: number
  }
}

ScheduleETaxResult {
  grossRentalIncome: number
  totalDeductions: number          // expenses + interest + depreciation
  netRentalIncome: number          // can be negative (rental loss)
  depreciation: number
  deductibleLoss: number           // after passive activity loss rules
  taxBenefit: number               // deductibleLoss × marginalTaxRate
}

RentalSaleTaxResult {
  salePrice: number
  sellingCosts: number
  adjustedBasis: number            // original basis - cumulative depreciation
  totalGain: number
  depreciationRecapture: number    // cumulative depreciation × 25%
  capitalGain: number              // appreciation above original basis
  capitalGainTax: number
  totalTax: number
  netSaleProceeds: number          // salePrice - sellingCosts - totalTax - mortgage payoff
}

/** capital.ts results */
StressTestResult {
  vacancyAndMaintenance: {
    shockCost: number              // 3 months vacancy + major repair
    monthsOfReserves: number       // reserves / (burn rate + shock amortized)
  }
  incomeDisruption: {
    reducedMonthlyIncome: number   // 80% of normal
    monthlyShortfall: number       // obligations - reduced income
    monthsUntilCrisis: number      // reserves / shortfall
  }
  marketDownturn: {
    currentEquity: number
    newEquity: number              // after 10% value drop
    underwaterBy: number           // 0 if still positive equity
    forcedSaleLoss: number         // loss if forced to sell at depressed price
  }
}

/** scenarios.ts internals (not exported from module) */
MortgageYearStep {
  endingBalance: number
  principalPaid: number
  interestPaid: number
}
```

**Boundary rule:** These types go in `types.ts` alongside the existing output types. Engine modules import them but never define types inline. The existing types (`ScenarioInputs`, `YearlySnapshot`, `UpfrontCapital`, `DTIResult`, `Warning`, `ScenarioOutput`, `ModelOutput`) should not need modification — if they do, investigate before changing.

---

## Module 1: `rental.ts` — Rental Property Cash Flow Engine

### Functions

#### `annualDepreciation(homeValue: number): number`
Straight-line depreciation on residential rental property.
- Depreciable basis = homeValue × (1 - LAND_VALUE_PERCENTAGE) per IRS §168
- Annual depreciation = depreciable basis / RESIDENTIAL_DEPRECIATION_YEARS (27.5)

#### `monthlyRentalCashFlow(inputs): RentalCashFlowResult`
```typescript
inputs: {
  monthlyRent: number
  monthlyMortgagePI: number
  annualPropertyTax: number      // full rate, no homestead exemption
  annualInsurance: number
  annualMaintenance: number
  monthlyHOA: number
  vacancyRate: number            // e.g., 0.05 for 5%
  managementFeeRate: number      // e.g., 0.08 for 8%
}
```
Computes effective gross rent (after vacancy), itemizes all expenses, calculates NOI, subtracts mortgage P&I for final cash flow.

#### `scheduleETaxImpact(inputs): ScheduleETaxResult`
```typescript
inputs: {
  annualRentalIncome: number
  annualRentalExpenses: number   // everything except mortgage principal
  annualMortgageInterest: number
  annualDepreciation: number
  agi: number                    // for passive loss phase-out
  marginalTaxRate: number
}
```
Calculates net rental income/loss after depreciation, then applies passive activity loss rules:
- Full $25k deduction at AGI ≤ $100k
- Linear phase-out: `allowable = max(0, 25000 × (1 - (agi - 100000) / 50000))`
- Zero deduction at AGI ≥ $150k
- Deductible loss is capped at the lesser of actual loss and passive allowance
- Tax benefit = deductibleLoss × marginalTaxRate

#### `rentalSaleTax(inputs): RentalSaleTaxResult`
```typescript
inputs: {
  salePrice: number
  originalBasis: number          // value at conversion to rental
  totalDepreciationClaimed: number
  sellingCostRate: number
  yearsOwned: number
  taxableIncome: number          // for capital gains bracket lookup
  filingStatus: FilingStatus
  mortgageBalance: number        // remaining balance at time of sale
}
```
- Adjusted basis = originalBasis - totalDepreciationClaimed
- Total gain = salePrice - sellingCosts - adjustedBasis
- Depreciation recapture = totalDepreciationClaimed × 25% (IRC §1250, always 25%)
- Capital gain = total gain - depreciation recapture amount (the appreciation portion)
- Capital gain tax at long-term rate (looked up from brackets using taxableIncome + filingStatus)
- No Section 121 exclusion (property is no longer primary residence)
- Net proceeds = salePrice - sellingCosts - totalTax - mortgageBalance

#### `worstCaseRentalCashFlow(baseCashFlow, maintenanceShockMonthly): number`
Returns base cash flow minus maintenance shock amortized monthly.

---

## Module 2: `capital.ts` — Upfront Cash & Reserve Analysis

### Functions

#### `calculateUpfrontCapital(inputs): UpfrontCapital`
```typescript
inputs: {
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  homePrice: number
  downPaymentPercent: number
  closingCostPercent: number
  movingCosts: number
  liquidSavings: number
  homeSaleNetProceeds?: number     // Scenario A only
  iraWithdrawalNetProceeds?: number // Scenario B only
}
```
- Baseline: no capital event (stays in place)
- Scenario A: down payment + closing + moving, funded by home sale proceeds + savings
- Scenario B: down payment + closing + moving, funded by IRA withdrawal net + savings
- Returns `UpfrontCapital` with surplus/shortfall

#### `monthlyBurnRate(inputs): number`
```typescript
inputs: {
  monthlyIncome: number
  primaryMortgagePI: number
  primaryTaxInsurance: number
  rentalMortgagePI?: number      // Scenario B only
  livingExpenses: number
  debtPayments: number
}
```
Net monthly cash position: income minus all fixed obligations. Negative means bleeding reserves.

#### `reserveRunwayMonths(postClosingLiquidSavings, monthlyBurnRate): number`
- If burn rate ≤ 0 (positive cash flow), returns Infinity
- Otherwise: postClosingLiquidSavings / monthlyBurnRate

#### `stressTest(inputs): StressTestResult`
```typescript
inputs: {
  postClosingReserves: number
  monthlyBurnRate: number
  monthlyRentalCashFlow: number
  monthlyIncome: number
  homeValue: number
  mortgageBalance: number
}
```
Three stress scenarios:
1. **Vacancy + maintenance:** 3 months rent loss + $8,000 major repair. Months of reserves = reserves / (burn rate + shock cost amortized over 12 months)
2. **Income disruption:** 20% income drop for 6 months. Monthly shortfall = obligations - (income × 0.8). Months until crisis = reserves / shortfall
3. **Market downturn:** 10% home value drop. New equity = (value × 0.9) - mortgage balance. If negative, report underwater amount. Forced sale loss = selling costs + underwater amount

---

## Module 3: `dti.ts` — Debt-to-Income Ratios

### Functions

#### `frontEndDTI(monthlyHousingCost, grossMonthlyIncome): number`
Housing costs (PITI for primary residence) / gross monthly income. Returns decimal (e.g., 0.28 for 28%).

#### `backEndDTI(inputs): number`
```typescript
inputs: {
  primaryHousingCost: number
  otherDebtPayments: number
  grossMonthlyIncome: number
  rentalMortgagePayment?: number  // Scenario B
  expectedMonthlyRent?: number    // Scenario B
  rentalIncomeCredit?: number     // defaults to RENTAL_INCOME_DTI_CREDIT (0.75)
}
```
For Scenario B: effective rental debt = rentalMortgagePayment - (expectedMonthlyRent × rentalIncomeCredit). If negative (rent covers mortgage), credit is capped at zero (lenders don't add it as income).

#### `calculateDTI(inputs): DTIResult`
```typescript
inputs: {
  scenario: 'baseline' | 'scenarioA' | 'scenarioB'
  grossMonthlyIncome: number
  primaryHousingCost: number
  otherDebtPayments: number
  rentalMortgagePayment?: number
  expectedMonthlyRent?: number
}
```
Returns full `DTIResult` from `types.ts`: front-end DTI, back-end DTI, `passesLenderThreshold` (back-end ≤ 43%), rental income credit amount.

---

## Module 4: `scenarios.ts` — Year-by-Year Orchestrator

### Exported Functions

#### `runModel(inputs: ScenarioInputs): ModelOutput`
Main entry point. Calls all three projection functions, returns `{ baseline, scenarioA, scenarioB }`.

#### `projectBaseline(inputs: ScenarioInputs): ScenarioOutput`
Stay in Kyle, keep IRA, keep commuting.

Year-by-year loop:
1. Step Kyle mortgage forward (P&I at 2%)
2. Step Kyle home value forward (appreciation)
3. Step IRA forward (growth + full annual contributions)
4. Compute annual income (salary × (1 + salaryGrowth)^year)
5. Compute federal tax on income
6. Monthly cash flow = (income - tax) / 12 - mortgage PITI - living expenses - debts
7. Net worth = Kyle equity + IRA balance + liquid savings accumulation
8. Commute costs accumulate (mileage + tolls)
9. No warnings beyond baseline retirement tracking

#### `projectScenarioA(inputs: ScenarioInputs): ScenarioOutput`
Sell Kyle, buy Austin, keep IRA intact + contributing.

Setup:
- Compute Kyle sale proceeds (current value - selling costs - mortgage balance)
- Compute Austin down payment (price × downPaymentPercentA), closing costs
- Compute upfront capital via `calculateUpfrontCapital`
- Compute DTI via `calculateDTI`
- Determine initial PMI status (LTV > 80%)

Year-by-year loop:
1. Step Austin mortgage forward
2. Step Austin home value forward
3. Step IRA forward (growth + contributions at Scenario A rate)
4. Compute annual income with salary growth
5. Compute federal tax
6. Check PMI: drops when LTV reaches 78% of original Austin price
7. Monthly cash flow = (income - tax) / 12 - Austin PITI (incl PMI if applicable) - living expenses - debts
8. Net worth = Austin equity + IRA balance + liquid savings
9. Commute savings vs baseline accumulate

Warnings: DTI check, reserve runway, retirement projections.

#### `projectScenarioB(inputs: ScenarioInputs): ScenarioOutput`
Keep Kyle as rental, withdraw IRA, buy Austin.

Setup:
- Compute IRA withdrawal net proceeds via `iraWithdrawalNetProceeds` (Phase 1)
- Compute Austin down payment (price × downPaymentPercentB), closing costs
- Compute upfront capital via `calculateUpfrontCapital`
- Compute DTI via `calculateDTI` (with rental income credit)
- Initialize cumulative depreciation tracker = 0
- Determine initial PMI status for Austin

Year-by-year loop:
1. **If year < plannedRentalExitYear:**
   - Step Kyle mortgage forward (tenant pays, but we track balance)
   - Step Kyle home value forward
   - Compute rental cash flow via `monthlyRentalCashFlow`
   - Compute annual depreciation, add to cumulative tracker
   - Compute Schedule E tax impact via `scheduleETaxImpact`
   - Compute worst-case rental cash flow
2. **If year === plannedRentalExitYear:**
   - Compute Kyle sale price (appreciated value)
   - Compute rental sale tax via `rentalSaleTax` (recapture + capital gains)
   - Net sale proceeds pay off Kyle mortgage, remainder goes to liquid savings
   - Zero out all rental activity for this and subsequent years
3. **If year > plannedRentalExitYear:**
   - No rental income/expenses/depreciation
4. Step Austin mortgage forward
5. Step Austin home value forward
6. Step IRA forward (starts at $0, contributions at Scenario B rate — likely $0 initially)
7. Compute annual income with salary growth
8. Compute federal tax (adjusted for Schedule E if rental active)
9. Check PMI on Austin
10. Monthly cash flow: income - tax - Austin PITI - living expenses - debts ± rental cash flow (if active)
11. Net worth = Austin equity + Kyle equity (if still held) + IRA + liquid savings + sale proceeds (if sold)

Warnings: DTI, negative rental cash flow, passive loss phase-out, reserve runway, stress test results, retirement depletion, post-exit net worth comparison.

### Internal Helpers (not exported)

#### `stepMortgageYear(balance, annualRate, monthlyPayment): MortgageYearStep`
Runs 12 monthly iterations: each month splits payment into interest (balance × monthlyRate) and principal (payment - interest). Returns ending balance, total principal paid, total interest paid for the year.

#### `stepIRAYear(balance, annualReturn, annualContribution): number`
Returns `(balance × (1 + annualReturn)) + annualContribution`. Contribution added at end of year (conservative estimate).

#### `stepAppreciationYear(currentValue, appreciationRate): number`
Returns `currentValue × (1 + appreciationRate)`.

### Warning Generation

After each projection loop completes, check thresholds and generate `Warning[]`:

| Condition | Category | Severity | Message |
|---|---|---|---|
| Back-end DTI > 43% | lending | critical | "DTI of {x}% exceeds QM threshold of 43%" |
| Back-end DTI > 36% | lending | warning | "DTI of {x}% exceeds conventional target of 36%" |
| Monthly cash flow negative | liquidity | critical | "Negative monthly cash flow of {$x}/mo — reserves will deplete" |
| Reserve runway < 3 months | liquidity | critical | "Only {x} months of reserves after closing" |
| Reserve runway < 6 months | liquidity | warning | "Only {x} months of reserves — below 6-month recommendation" |
| IRA balance at 65 < $100k | retirement | critical | "Projected retirement savings of {$x} at age 65" |
| IRA starts at $0 (Scenario B) | retirement | warning | "Early IRA withdrawal eliminates all retirement savings at age {x}" |
| Rental cash flow negative after tax benefit | landlord | warning | "Rental property loses {$x}/mo even after tax benefits" |
| Passive loss fully phased out | tax | info | "Rental loss deduction fully phased out at AGI of {$x}" |
| Stress test: months until crisis < 6 | liquidity | critical | "Income disruption would exhaust reserves in {x} months" |
| Stress test: underwater on rental | market | warning | "10% market drop puts rental property underwater by {$x}" |

---

## Testing Strategy

### Unit Tests (per module)

#### `rental.test.ts`
- **Depreciation:** $270k home → basis = $270k × 0.85 = $229,500 → annual = $229,500 / 27.5 = **$8,345.45**
- **Monthly cash flow:** Preston defaults ($2k rent, ~$930 P&I, $484/mo tax, $200/mo insurance, $225/mo maintenance, $0 HOA, 5% vacancy, 8% management) → verify each line item and net cash flow
- **Edge cases:** Zero rent, 100% vacancy rate, zero maintenance
- **Schedule E — full offset:** $100k AGI, rental loss of $15k → full $15k deductible (under $25k cap)
- **Schedule E — partial phase-out:** $125k AGI → $12,500 max allowable → if loss is $15k, only $12,500 deductible
- **Schedule E — full phase-out:** $150k+ AGI → $0 deductible regardless of loss amount
- **Rental sale:** $270k basis, 5 years depreciation ($41,727 claimed), sale at ~$313k. Recapture = $41,727 × 0.25 = **$10,432**. Verify capital gains on remaining appreciation.
- **Worst case:** Base cash flow minus shock → verify negative number

#### `capital.test.ts`
- **Scenario A upfront:** $300k home, 20% down ($60k), 3% closing ($9k), $3k moving. Home sale proceeds from $270k home. Verify surplus/shortfall.
- **Scenario B upfront:** $300k home, 10% down ($30k), 3% closing ($9k), $3k moving. IRA net proceeds ~$20,400. Verify surplus/shortfall.
- **Reserve runway:** $5k reserves, $500/mo negative burn → **10 months**
- **Edge case:** Zero liquid savings → runway = 0
- **Edge case:** Positive cash flow → runway = Infinity
- **Stress test — vacancy + maintenance:** 3 months × $2k rent = $6k + $8k repair = $14k shock. Verify months of coverage.
- **Stress test — income disruption:** $100k income → $80k → verify monthly shortfall and months until crisis
- **Stress test — market downturn:** $270k home, $199k mortgage, 10% drop → $243k value, $44k equity (was $71k). Not underwater. Test with higher LTV that goes underwater.

#### `dti.test.ts`
- **Front-end:** $1,800 PITI / $8,333 monthly income = **21.6%**
- **Back-end Scenario A:** ($1,800 PITI + $300 debts) / $8,333 = **25.2%**
- **Back-end Scenario B:** Two mortgages. Rental mortgage $930, offset by 75% of $2k rent ($1,500). Effective rental debt = $0 (credit exceeds payment, capped at zero). Back-end = ($1,800 + $0 + $300) / $8,333 = **25.2%**
- **Back-end Scenario B — low rent:** Rent only $800, credit = $600, effective rental debt = $930 - $600 = $330. Higher back-end DTI.
- **Edge cases:** Zero debt, zero income (handle gracefully), zero rental credit (new landlord)
- **Threshold:** Verify `passesLenderThreshold` flips at 43%

#### `scenarios.test.ts`

**Tier 1: Stepping helpers**
- `stepMortgageYear`: $199,000 at 2%, monthly payment ~$735. After 1 year: verify ending balance, principal/interest split. Interest-heavy early in amortization.
- `stepIRAYear`: $30,000 at 7% + $7,000 contribution → **(30000 × 1.07) + 7000 = $39,100**
- `stepAppreciationYear`: $270,000 at 3% → **$278,100**

**Tier 2: Hand-computed checkpoints — Golden Run 1 (Preston defaults)**

Inputs: Single filer, 37yo, $100k income, 3% salary growth. Traditional IRA $30k, 7% return. Kyle home $270k, $199k mortgage at 2%. Austin $300k at 6%. 20-year horizon, rental exit year 20.

Checkpoint values (manually computed):
- **Baseline Year 1:** Net worth ≈ Kyle equity + IRA + savings. Verify each component.
- **Baseline Year 20:** 20 years of mortgage paydown, appreciation, IRA compounding.
- **Scenario A Year 1:** Kyle sold, Austin purchased at 20% down, IRA continues growing.
- **Scenario A Year 20:** Austin equity + large IRA balance.
- **Scenario B Year 1:** IRA at $0, Austin at 10% down, rental cash flow from Kyle, two mortgages.
- **Scenario B Year 20 (exit year):** Rental sale event — verify recapture tax, capital gains, net proceeds added to savings. Final net worth includes Austin equity + sale proceeds + rebuilt IRA (if any).

**Tier 2: Hand-computed checkpoints — Golden Run 2 (Conservative Couple)**

Inputs: Married filing jointly, 42yo, $150k income, 2% salary growth. Roth IRA $50k, 7% return. Current home $400k, $280k mortgage at 3.5%. New home $500k at 6.5%. 10-year horizon, rental exit year 5. $500/mo car payment. 8% vacancy rate.

This profile exercises different code paths:
- MFJ tax brackets (vs single)
- Roth withdrawal (no income tax, still 10% penalty under 59.5)
- Full passive loss phase-out at $150k AGI (zero rental deduction)
- Mid-projection rental exit at year 5 (5 post-exit years)
- Higher DTI stress from existing debt
- Different PMI dynamics at higher loan amounts

Checkpoint values:
- **Baseline Year 1 and Year 10**
- **Scenario A Year 1 and Year 10**
- **Scenario B Year 1:** Higher income but two large mortgages + car payment. Zero passive loss benefit.
- **Scenario B Year 5 (exit):** Rental sale with 5 years depreciation recapture. Verify subsequent years have zero rental activity.
- **Scenario B Year 10:** Post-exit, single mortgage, verify net worth includes sale proceeds invested.

**Tier 3: Directional invariants (must hold for ANY valid inputs)**
- Scenario A IRA balance > Scenario B IRA balance at every year
- Baseline has lowest housing cost year-over-year
- Scenario B Year 1 cash flow < Scenario A Year 1 cash flow
- Higher appreciation rate → higher net worth (monotonic)
- Rental exit year snapshot shows nonzero sale proceeds and tax
- Warning count for Scenario B ≥ warning count for Baseline
- All three scenarios produce exactly `timeHorizonYears` snapshots
- Net worth components sum correctly (equity + IRA + liquid = total)

### Integration Test: Two Golden Runs
One comprehensive test per profile using `runModel()`:
- All three `ScenarioOutput`s returned
- Key checkpoint values match hand-computed expectations
- Expected warnings fire (Preston: retirement depletion + liquidity; Couple: DTI + passive loss phase-out)
- Rental exit occurs at correct year with correct tax consequences
- Post-exit years show zero rental activity

---

## Key Financial Logic Reminders (Phase 2 Specific)

1. **Passive loss phase-out is linear, not stepped.** `allowable = max(0, 25000 × (1 - (agi - 100000) / 50000))`. At $125k AGI, allowable = $12,500. At $100k or below, full $25k.

2. **Depreciation recapture is always 25%.** Not the taxpayer's marginal rate, not the capital gains rate. Flat 25% per IRC §1250 on all depreciation previously claimed.

3. **Section 121 exclusion is lost** once the property converts from primary residence to rental. Must live in property 2 of last 5 years. After year 3 as rental, exclusion is permanently gone.

4. **Rental property loses homestead exemption.** Property tax on Kyle in Scenario B uses the full, non-homestead rate. This is already in the inputs as a separate field but the scenarios must use the correct rate per scenario.

5. **IRA in Scenario B starts at $0.** The withdrawal happens at time zero. The early withdrawal penalty (10% for traditional, 10% for Roth earnings if applicable) and income tax (traditional only) are computed upfront. Subsequent contributions rebuild from zero.

6. **Roth IRA withdrawal rules differ.** Contributions can be withdrawn tax-free and penalty-free anytime. Only earnings are subject to tax + penalty before 59.5. For simplicity, model the full balance as subject to penalty (conservative — the user likely hasn't contributed the full balance).

7. **Capital gains bracket lookup** must use the taxpayer's total taxable income to determine the applicable long-term capital gains rate (0%, 15%, or 20%).

8. **PMI on Austin** applies in both Scenario A (if down < 20%) and Scenario B (10% down guaranteed). Auto-cancels when LTV reaches 78% of original purchase price.
