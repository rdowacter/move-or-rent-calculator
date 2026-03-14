# Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the project and build all independent financial engine modules with TDD, producing a fully tested pure math library with zero UI.

**Architecture:** Pure TypeScript functions in `src/engine/`, each module covering one financial domain. No React, no DOM, no browser APIs. Every function tested in Vitest with manually verified expected values. Types defined upfront as the contract between engine and future UI.

**Tech Stack:** Vite + React + TypeScript (strict), Tailwind CSS, shadcn/ui, react-hook-form + zod, Vitest, ESLint + Prettier

**Reference docs:**
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `CLAUDE.md` — coding standards, financial logic reminders, domain expertise
- `project-info.md` — full variable list with defaults and explanations

---

## Task 1: Project Scaffolding

**Files to create:** Full Vite + React + TS project structure

**Steps:**

1. Initialize Vite project with React + TypeScript template in the current directory
2. Install dependencies:
   - Dev: `tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom eslint prettier`
   - Runtime: `react-hook-form @hookform/resolvers zod`
   - Defer chart library to Phase 3 (don't install yet — evaluate Recharts vs Nivo then)
3. Configure TypeScript `strict: true` in tsconfig
4. Configure Vitest in `vite.config.ts` with jsdom environment
5. Configure Tailwind
6. Initialize shadcn/ui (`npx shadcn@latest init`) — we won't use components until Phase 3 but the config should be in place
7. Set up ESLint + Prettier with reasonable defaults
8. Create directory structure:
   ```
   src/
   ├── engine/        # Pure financial math
   ├── components/    # (empty, Phase 3)
   ├── hooks/         # (empty, Phase 3)
   └── utils/         # (empty, Phase 3)
   ```
9. Verify: `npm run build` succeeds, `npx vitest run` runs (even with no tests)
10. Commit: `chore: scaffold project with Vite, TypeScript, Tailwind, Vitest`

---

## Task 2: Types + Constants

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/constants.ts`

### types.ts Requirements

Define all input and output interfaces. Refer to `project-info.md` "All Variables" section for the complete list.

**Input types** — group by input section:
- `PersonalInputs` — age, income, salary growth, filing status, state tax rate, living expenses, debts, liquid savings
- `RetirementInputs` — IRA balance, type (traditional/roth), expected return, contributions for Scenario A vs B, employer match fields, other retirement
- `CurrentHomeInputs` — value, mortgage balance, rate, original term, years in, property tax rate, insurance, landlord insurance increase, maintenance %, HOA, expected rent, rent growth, vacancy, management fee, turnover frequency, turnover cost, selling costs %, appreciation
- `NewHomeInputs` — price, rate, term, down payment % for A vs B, PMI rate, property tax rate, insurance, closing costs %, appreciation
- `CommuteInputs` — current/new round-trip miles, work days/year, IRS mileage rate, current/new tolls, time saved/day, landlord hours/month
- `CostInputs` — moving costs, insurance/tax/inflation escalation rates, tax prep cost, umbrella insurance
- `ProjectionInputs` — time horizon years, planned rental exit year
- `ScenarioInputs` — combines all of the above

**Output types:**
- `YearlySnapshot` — one year of one scenario: net worth, IRA balance, home equities, mortgage balances, cash flow (monthly best/worst), cumulative commute savings, income
- `UpfrontCapital` — total cash needed, cash available, surplus/shortfall, component breakdown (down payment, closing, moving, IRA net proceeds or sale proceeds)
- `DTIResult` — front-end DTI, back-end DTI, passes threshold boolean, rental income credit
- `Warning` — category (lending/retirement/liquidity/tax/landlord/market), severity (info/warning/critical), message, dollar impact
- `ScenarioOutput` — name, yearly snapshots array, upfront capital, DTI, warnings, final net worth, total IRA value, reserve runway months
- `ModelOutput` — { baseline, scenarioA, scenarioB }

**Utility types:**
- `FilingStatus` = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household'
- `IRAType` = 'traditional' | 'roth'
- `WarningCategory`, `WarningSeverity` as union types

### constants.ts Requirements

Every constant must have a JSDoc comment with its source (IRS publication, IRC section, industry standard, or stated assumption).

**Tax constants:**
- 2024 federal tax brackets for all filing statuses — source: IRS Rev. Proc. 2023-34
- Standard deductions by filing status
- Early withdrawal penalty rate (10%) and age threshold (59.5) — IRC §72(t)
- IRA contribution limits (under 50: $7,000, 50+: $8,000) — IRC §219(b)(5)(A)
- Long-term capital gains rate thresholds — 0%/15%/20%
- Depreciation recapture rate (25%) — IRC §1250

**Property constants:**
- Residential depreciation period (27.5 years) — IRC §168(c)(1)
- Land value percentage (15%) — industry estimate, not depreciable
- PMI auto-cancellation LTV (78%) — Homeowners Protection Act of 1998
- PMI request cancellation LTV (80%)

**Lending constants:**
- DTI thresholds: front-end target (28%), back-end target (36%), hard max (43%)
- Rental income DTI credit rate (75%)

**Other:**
- Section 121 exclusion ($250k single), residency requirement (2 of last 5 years)
- Passive activity loss: max offset ($25k), phase-out range ($100k-$150k AGI)
- MONTHS_PER_YEAR = 12

**Commit:** `feat(engine): add TypeScript types and financial constants`

---

## Task 3: Mortgage Module (TDD)

**Files:**
- Create: `src/engine/mortgage.ts`
- Create: `src/engine/__tests__/mortgage.test.ts`

### Functions to implement

**`calculateMonthlyPayment(principal, annualRate, termYears): number`**
- Standard amortization formula: P × [r(1+r)^n] / [(1+r)^n - 1]
- **Edge case:** 0% interest rate — formula divides by zero. Handle as: principal / (termYears × 12)
- **Edge case:** 0 principal — return 0

**`calculateRemainingBalance(principal, annualRate, termYears, paymentsMade): number`**
- Formula: P × [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
- After all payments made, balance should be 0 (or negligible float)

**`calculateOriginalLoanAmount(currentBalance, annualRate, originalTermYears, yearsElapsed): number`**
- Back-calculates original principal from current state. Needed because Preston knows his current balance ($199k) but we need the original loan amount for amortization.
- Inverse of remaining balance formula.

**`calculateYearInterestPaid(principal, annualRate, termYears, year): number`**
- Total interest portion of payments in a given year (1-indexed). Critical for Schedule E rental deductions.
- Sum the interest portion of each of the 12 monthly payments in that year.

**`calculateYearPrincipalPaid(principal, annualRate, termYears, year): number`**
- Total principal portion for a given year. Complement of interest.

### Test expectations

Each test must include a comment showing the manual math derivation. Use `toBeCloseTo` with appropriate precision (0-2 decimal places).

**Happy path tests:**
- Monthly payment on $240,000 at 6% for 30 years ≈ $1,438.92
- Monthly payment on $200,000 at 2% for 30 years ≈ $739.24
- Remaining balance on $240,000 at 6% after 60 payments (5 years) — verify against standard amortization table
- Year 1 interest paid vs year 1 principal paid should sum to 12 × monthly payment

**Edge cases:**
- 0% interest rate: monthly payment = principal / total months
- 0 principal: all functions return 0
- After all payments: remaining balance ≈ 0

**Regression:**
- Back-calculate original loan from Preston's known numbers ($199k balance, 2%, 30yr, 5yr in), then verify remaining balance at year 5 matches $199k

**Commit:** `feat(engine): add mortgage amortization calculations + tests`

---

## Task 4: Tax Module (TDD)

**Files:**
- Create: `src/engine/tax.ts`
- Create: `src/engine/__tests__/tax.test.ts`

### Functions to implement

**`calculateFederalIncomeTax(taxableIncome, filingStatus): number`**
- Marginal bracket calculation — NOT flat rate. Walk through each bracket, taxing only the portion that falls within it.

**`calculateMarginalTaxRate(taxableIncome, filingStatus): number`**
- Returns the rate of the bracket the taxpayer's last dollar falls into.

**`calculateEffectiveTaxRate(taxableIncome, filingStatus): number`**
- Total tax / taxable income. Returns 0 for 0 income.

**`getStandardDeduction(filingStatus): number`**
- Simple lookup from constants.

**`calculateIRAWithdrawalTax(withdrawalAmount, annualGrossIncome, filingStatus, age, iraType): { federalTax, earlyWithdrawalPenalty, totalTax, netProceeds, effectiveWithdrawalTaxRate }`**
- This is the critical function. The withdrawal STACKS on top of salary income.
- For Traditional IRA: withdrawal is fully taxable as ordinary income. Calculate the incremental tax (tax on income+withdrawal minus tax on income alone).
- For Roth IRA: contributions come out tax-free; only earnings are taxed. For simplicity, assume the full balance is contributions (conservative — benefits the user). Flag with a comment that this is a simplification.
- Early withdrawal penalty: 10% of taxable portion if age < 59.5.
- Net proceeds = withdrawal - federalTax - penalty.

### Test expectations

**Happy path:**
- Federal tax on $85,400 taxable income (single, $100k gross minus $14,600 standard deduction): verify against IRS tax table
- Marginal rate at $85,400 should be 22%
- IRA withdrawal: $30k on top of $100k gross income (single, age 37, traditional). Calculate the incremental federal tax on the withdrawal, plus 10% penalty. Net proceeds should be approximately $20,400.

**Edge cases:**
- $0 income: tax = 0, effective rate = 0
- Income exactly at a bracket boundary
- Roth withdrawal: no federal tax on contributions, but still gets early withdrawal penalty on earnings

**Key verification — the PM's claim:** "$30k withdrawal nets ~$20,400 after the government takes 32%." Verify this is approximately correct and show the math breakdown (marginal tax on the withdrawal + 10% penalty).

**Commit:** `feat(engine): add federal tax bracket and IRA withdrawal calculations + tests`

---

## Task 5: IRA Module (TDD)

**Files:**
- Create: `src/engine/ira.ts`
- Create: `src/engine/__tests__/ira.test.ts`

### Functions to implement

**`calculateIRAFutureValue(currentBalance, annualContribution, annualReturnRate, years): number`**
- Formula: balance × (1+r)^n + contribution × [((1+r)^n - 1) / r]
- **Edge case:** 0% return rate — formula divides by zero. Handle as: balance + (contribution × years)
- **Edge case:** 0 contribution — just compound growth on existing balance

**`generateIRAProjection(currentBalance, annualContribution, annualReturnRate, years): Array<{ year, balance, totalContributions, totalGrowth }>`**
- Year-by-year breakdown. Each year: new balance = previous × (1+r) + contribution.
- This is the data behind the "jaw drop" IRA comparison chart.

### Test expectations

**Happy path:**
- $30,000 at 7% for 25 years with $7,000/year contributions — this is the Scenario A IRA. Verify the final value.
- $0 at 7% for 25 years with $0/year contributions — this is Scenario B IRA (worst case). Should be $0.
- $0 at 7% for 25 years with $7,000/year contributions — Scenario B if he restarts contributions. Verify.

**Key verification:** The gap between "keep IRA + contribute" and "withdraw + don't contribute" over 25 years. The PM claims this is $300k-$500k. Verify with actual calculation.

**Edge cases:**
- 0% return: future value = balance + (contribution × years)
- 0 years: future value = current balance
- Negative balance: should not happen, but handle gracefully

**Commit:** `feat(engine): add IRA growth projection calculations + tests`

---

## Task 6: Appreciation Module (TDD)

**Files:**
- Create: `src/engine/appreciation.ts`
- Create: `src/engine/__tests__/appreciation.test.ts`

### Functions to implement

**`calculateFutureHomeValue(currentValue, annualAppreciationRate, years): number`**
- Simple compound growth: value × (1 + rate)^years

**`calculateHomeEquity(homeValue, mortgageBalance): number`**
- value - balance. Can be negative (underwater).

**`generateAppreciationSchedule(currentValue, annualAppreciationRate, years): Array<{ year, value }>`**
- Year-by-year home values.

### Test expectations

- $270,000 at 3% for 20 years. Verify against manual calculation.
- $300,000 at 3.5% for 20 years.
- 0% appreciation: value unchanged.
- Negative appreciation (depreciation): verify value decreases.
- Equity when underwater (value < balance): returns negative number.

**Commit:** `feat(engine): add home appreciation and equity calculations + tests`

---

## Task 7: Commute Module (TDD)

**Files:**
- Create: `src/engine/commute.ts`
- Create: `src/engine/__tests__/commute.test.ts`

### Functions to implement

**`calculateAnnualCommuteCost(roundTripMiles, workDaysPerYear, irsMileageRate, monthlyTolls): number`**
- (miles × days × mileageRate) + (tolls × 12)

**`calculateAnnualCommuteSavings(currentInputs, newInputs): number`**
- Difference between current and new annual commute costs. Should always be positive if moving closer.

**`calculateAnnualTimeSavedHours(dailyTimeSavedHours, workDaysPerYear): number`**
- Simple multiplication.

**`calculateTimeSavedValue(dailyTimeSavedHours, workDaysPerYear, annualGrossIncome): number`**
- Hours saved × hourly rate (income / 2080 work hours per year). This is the "invisible cost" of commuting.

### Test expectations

Using Preston's defaults:
- Current: 44 miles RT × 250 days × $0.725/mile + $500/month × 12 = $7,975 + $6,000 = $13,975/year
- New: 10 miles RT × 250 days × $0.725/mile + $0 = $1,812.50/year
- Savings: ~$12,162.50/year
- Time saved: 2.5 hours/day × 250 days = 625 hours/year
- Time value: 625 × ($100,000/2080) ≈ $30,048/year

**Edge cases:**
- 0 miles: cost is just tolls
- Same commute (no savings): returns 0
- 0 income: time value is 0

**Commit:** `feat(engine): add commute cost and savings calculations + tests`

---

## Phase 1 Completion Criteria

- [ ] All 5 engine modules pass all tests: `npx vitest run`
- [ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
- [ ] ESLint passes with zero warnings: `npx eslint src/`
- [ ] No `any` types anywhere in engine/
- [ ] Every function has JSDoc explaining the financial reasoning
- [ ] Every constant has a source citation comment
- [ ] `npm run build` succeeds
- [ ] All commits follow conventional commit format
