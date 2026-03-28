# Reduce Friction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce input friction from 23 required fields to 13, hide retirement/commute sections behind advanced toggles, rebrand IRA to "Retirement (401k/IRA)", and zero out Preston-specific defaults — so any US homeowner can get a directional answer in under 5 minutes.

**Architecture:** The engine layer is untouched — it already accepts all inputs generically. Changes are confined to: (1) `constants.ts` default values, (2) `scenarioInputs.ts` schema defaults and required fields, (3) UI section components gaining Advanced collapsibles, (4) label changes for IRA → Retirement rebranding. The results gating infrastructure (`checkRequiredFields`, `useScenarioModel`, `ResultsGate`) already exists and just needs its field list updated.

**Tech Stack:** React, TypeScript, Zod, react-hook-form, Tailwind CSS, shadcn/ui Collapsible, Vitest

**Design doc:** `docs/plans/2026-03-20-reduce-friction-design.md`

---

## Task 1: Update engine default constants

**Files:**
- Modify: `src/engine/constants.ts` — `DEFAULT_PERSONAL_INPUTS`, `DEFAULT_RETIREMENT_INPUTS`, `DEFAULT_COMMUTE_INPUTS`

**What to do:**

1. `DEFAULT_PERSONAL_INPUTS`: Keep age at a generic value (30 instead of 37). All other values stay as-is — they're structural.

2. `DEFAULT_RETIREMENT_INPUTS`: Zero out `iraBalance`, `annualIRAContributionScenarioA`, and `iraWithdrawalAmountScenarioB`. Keep `iraType` as `'traditional'` and `iraExpectedAnnualReturn` at `0.07` — these are structural. The goal: with these defaults, retirement is a non-factor in the comparison.

3. `DEFAULT_COMMUTE_INPUTS`: Zero out `currentRoundTripMiles`, `currentMonthlyTolls`, `newRoundTripMiles`, `newMonthlyTolls`, `commuteTimeSavedPerDayHours`, and `landlordHoursPerMonth`. Keep `workDaysPerYear` (250) and `irsMileageRate` (0.725) — they're structural.

**Verify:** Run `npm run test -- --run src/engine/`. All engine tests should pass — they use explicit inputs, not defaults.

**Commit:** `refactor(engine): zero out Preston-specific defaults for retirement and commute`

---

## Task 2: Update schema — new required fields and form defaults

**Files:**
- Modify: `src/schemas/scenarioInputs.ts` — `formDefaultValues`, `REQUIRED_FIELDS`

**What to do:**

1. **Update `REQUIRED_FIELDS`** — reduce from 23 to exactly these 13:

   About You (5): `personal.annualGrossIncome`, `personal.filingStatus`, `personal.liquidSavings`, `personal.monthlyLivingExpenses`, `personal.monthlyDebtPayments`

   Current Home (4): `currentHome.homeValue`, `currentHome.mortgageBalance`, `currentHome.interestRate`, `currentHome.expectedMonthlyRent`

   New Home (4): `newHome.purchasePrice`, `newHome.interestRate`, `newHome.downPaymentPercentScenarioA`, `newHome.downPaymentPercentScenarioB`

   Removed from required: `personal.age`, all `retirement.*`, `currentHome.originalLoanTermYears`, `currentHome.yearsIntoLoan`, `currentHome.annualPropertyTaxRate`, `currentHome.annualInsurance`, `newHome.annualPropertyTaxRate`, `newHome.annualInsurance`, `commute.currentRoundTripMiles`

2. **Update `formDefaultValues`** — only the 13 required fields should be `undefined`. Everything else should pull from `DEFAULT_*_INPUTS` constants. This means:
   - `personal.age` → gets default (no longer undefined)
   - All `retirement.*` → get defaults (no longer undefined)
   - `currentHome.originalLoanTermYears`, `yearsIntoLoan`, `annualPropertyTaxRate`, `annualInsurance` → get defaults (no longer undefined)
   - `newHome.annualPropertyTaxRate`, `annualInsurance` → get defaults (no longer undefined)
   - All `commute.*` → get defaults (no longer undefined)
   - `personal.monthlyDebtPayments` → becomes undefined (now required)

**Verify:** Run `npm run test -- --run src/schemas/`. Fix any test assertions that reference the old 23-field count or old undefined fields.

**Commit:** `refactor(schema): reduce required fields from 23 to 13`

---

## Task 3: Add Advanced collapsible to AboutYouSection

**Files:**
- Modify: `src/components/sections/AboutYouSection.tsx`

**What to do:**

Reorganize the fields into two groups:

**Simple** (visible by default): Annual Gross Income, Filing Status, Liquid Savings, Monthly Living Expenses, Monthly Debt Payments

**Advanced** (behind a collapsible toggle): Age, Annual Salary Growth Rate, State Income Tax Rate

Use the shadcn/ui `Collapsible` component (already available in `src/components/ui/collapsible.tsx`). The toggle should say "Advanced" with a chevron indicator. Place the simple fields first, then the collapsible below.

**Verify:** `npm run dev` — About You shows 5 fields. Clicking "Advanced" reveals 3 more.

**Commit:** `feat(ui): add advanced toggle to About You section`

---

## Task 4: Add Advanced collapsible to CurrentHomeSection

**Files:**
- Modify: `src/components/sections/CurrentHomeSection.tsx`

**What to do:**

**Simple** (visible by default): Home Value, Mortgage Balance, Interest Rate, Expected Monthly Rent

**Advanced** (behind collapsible): Everything else — loan term, years into loan, property tax rate, insurance, all rental assumptions (vacancy, management fee, turnover, etc.), sale assumptions (selling costs, appreciation), depreciation split, DTI credit rate

Use the same Collapsible pattern as Task 3.

**Verify:** `npm run dev` — Current Home shows 4 fields. "Advanced" reveals the full rental/mortgage detail set.

**Commit:** `feat(ui): add advanced toggle to Current Home section`

---

## Task 5: Add Advanced collapsible to NewHomeSection

**Files:**
- Modify: `src/components/sections/NewHomeSection.tsx`

**What to do:**

**Simple** (visible by default): Purchase Price, Interest Rate, Down Payment % (Scenario A), Down Payment % (Scenario B)

**Advanced** (behind collapsible): Loan Term, PMI Rate, Property Tax Rate, Annual Insurance, Closing Costs Rate, Annual Appreciation Rate

Same Collapsible pattern.

**Verify:** `npm run dev` — New Home shows 4 fields. "Advanced" reveals 6 more.

**Commit:** `feat(ui): add advanced toggle to New Home section`

---

## Task 6: Collapse Retirement, Commute, and Costs sections by default

**Files:**
- Modify: `src/components/InputAccordion.tsx`

**What to do:**

Change the accordion's default-open state so that only About You, Current Home, and New Home are expanded on initial load. Retirement (401k/IRA), Commute, and Costs & Projection should start collapsed — they're entirely advanced sections with sensible defaults.

**Verify:** `npm run dev` — only 3 sections are open on page load. The other 3 are collapsed but expandable.

**Commit:** `feat(ui): collapse advanced-only sections by default`

---

## Task 7: Rebrand IRA → Retirement (401k/IRA) in UI labels

**Files to modify (user-facing labels only, NOT engine types/variables):**

- `src/components/InputAccordion.tsx` — section subtitle (line 67: "IRA balance, withdrawal, contributions")
- `src/components/sections/RetirementSection.tsx` — all field labels and descriptions that say "IRA"
- `src/components/sections/NewHomeSection.tsx` — Scenario B down payment description (line 57: "from savings + IRA")
- `src/components/results/ExecutiveSummary.tsx` — scenario descriptions (lines 35-37: "keep the IRA", "keep IRA intact", "withdraw IRA") and column labels (lines 167, 235: "IRA at Xyr")
- `src/components/results/ResultsSections.tsx` — trajectory description (line 107: "IRA balance comparison")
- `src/components/results/IRATrajectoryChart.tsx` — any user-facing labels/tooltips
- `src/components/results/NetWorthComposition.tsx` — legend label (lines 145, 207: "IRA Balance")
- `src/components/results/NetWorthBreakdown.tsx` — row label (line 59: "IRA Balance")
- `src/components/results/YearByYearTable.tsx` — column header (line 165: "IRA Balance")
- `src/components/results/UpfrontCapital.tsx` — line item label (line 111: "IRA Withdrawal")
- `src/components/results/AssumptionsDisclosure.tsx` — assumption text (lines 37, 41)

**Rebranding rules:**
- "IRA Balance" → "Retirement Balance"
- "IRA Type" → "Account Type"
- "IRA Withdrawal" → "Retirement Withdrawal"
- "IRA at Xyr" → "Retirement at Xyr"
- "keep the IRA" / "keep IRA intact" → "keep retirement intact"
- "withdraw IRA" → "withdraw from retirement"
- Descriptions referencing "IRA account" → "retirement account (401k/IRA)"

**Do NOT change:** Engine types (`iraBalance`, `IRAType`, etc.), engine variable names, file names (`IRATrajectoryChart.tsx`), or internal constants.

**Verify:** Run `npm run test -- --run`. Fix any component tests that match on old "IRA" text (InputAccordion tests, UpfrontCapital tests, IRATrajectoryChart tests).

**Commit:** `feat(ui): rebrand IRA to Retirement (401k/IRA) across all labels`

---

## Task 8: Update warning messages in scenarios.ts

**Files:**
- Modify: `src/engine/scenarios.ts` — warning message strings around lines 1243-1290

**What to do:**

Find all warning messages that reference "IRA" and update to "retirement account". There are 3 messages:
1. Line ~1243: shortfall warning mentioning "The IRA withdrawal after taxes..."
2. Line ~1278: full withdrawal warning ("Withdrawing your entire IRA at age...")
3. Line ~1285: partial withdrawal warning ("Withdrawing $X from your IRA at age...")

**Verify:** Run `npm run test -- --run src/engine/`. Fix any test assertions matching on old warning text.

**Commit:** `feat(engine): update warning messages from IRA to retirement account`

---

## Task 9: Full verification

**No files to modify — verification only.**

1. `npm run test -- --run` — all tests pass
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm run lint` — zero warnings
4. `npm run dev` — smoke test in browser:
   - About You shows 5 simple fields, "Advanced" reveals 3 more
   - Current Home shows 4 simple fields, "Advanced" reveals rental details
   - New Home shows 4 simple fields, "Advanced" reveals costs/rates
   - Retirement collapsed, zero defaults when expanded
   - Commute collapsed, zero defaults when expanded
   - Costs & Projection collapsed with structural defaults
   - All labels say "Retirement" not "IRA"
   - Results gated until 13 fields are filled
   - After filling 13 fields, results render and update live
   - Expanding Retirement and entering values changes results
   - localStorage persistence works
5. Grep for remaining user-facing "IRA" strings in `.tsx` files and warning messages — should find none

**Commit any remaining fixes:** `fix: address remaining issues from friction reduction verification`
