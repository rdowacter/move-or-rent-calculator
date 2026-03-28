# Phase 1 Generalization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the tool from a hardcoded Kyle/Austin scenario analyzer into a generic sell-vs-rent decision engine any US homeowner can use.

**Architecture:** The engine layer is already 100% generic. All changes are in the UI/schema layer: (1) replace hardcoded city names with generic labels, (2) add user-configurable home name fields that propagate through all components, (3) remove personal defaults and gate results behind validation, (4) convert time horizon text input to a slider. No engine changes needed.

**Tech Stack:** React, TypeScript, Zod, react-hook-form, shadcn/ui (Slider component already exists), Tailwind CSS, Vitest + RTL.

---

## Task 1: De-personalize InputAccordion section titles

**Files:**
- Modify: `src/components/InputAccordion.tsx:80,97`

**Step 1: Update section titles**

Change line 80 from:
```tsx
<div className="text-sm font-semibold">Current Home (Kyle)</div>
```
to:
```tsx
<div className="text-sm font-semibold">Current Home</div>
```

Change line 97 from:
```tsx
<div className="text-sm font-semibold">New Home (Austin)</div>
```
to:
```tsx
<div className="text-sm font-semibold">New Home</div>
```

**Step 2: Run tests**

Run: `npx vitest run src/components/__tests__/InputAccordion.test.tsx`
Expected: PASS (tests may need updates if they assert on "Current Home (Kyle)")

**Step 3: Commit**

```bash
git add src/components/InputAccordion.tsx
git commit -m "refactor(ui): remove Kyle/Austin from accordion section titles"
```

---

## Task 2: De-personalize CurrentHomeSection descriptions

**Files:**
- Modify: `src/components/sections/CurrentHomeSection.tsx:124,172`

**Step 1: Update field descriptions**

Line 124 — change property tax description from:
```tsx
description="As a percentage of assessed value (e.g. 2.15% for Kyle, TX)"
```
to:
```tsx
description="As a percentage of assessed value"
```

Line 172 — change selling costs description from:
```tsx
description="Agent commissions + closing costs (typically 6-8% in Texas)"
```
to:
```tsx
description="Agent commissions + closing costs (typically 6-8%)"
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/sections/CurrentHomeSection.tsx
git commit -m "refactor(ui): remove Kyle/TX-specific examples from CurrentHomeSection"
```

---

## Task 3: De-personalize NewHomeSection descriptions

**Files:**
- Modify: `src/components/sections/NewHomeSection.tsx:8,23,50,57,96`

**Step 1: Update descriptions**

Line 8 — JSDoc comment: change "New Home (Austin)" to "New Home"

Line 23 — change:
```tsx
description="Target purchase price for the Austin home"
```
to:
```tsx
description="Target purchase price for the new home"
```

Line 50 — change:
```tsx
description="Down payment if selling Kyle (larger, from sale proceeds)"
```
to:
```tsx
description="Down payment if selling current home (larger, from sale proceeds)"
```

Line 57 — change:
```tsx
description="Down payment if keeping Kyle as rental (smaller, from savings + IRA)"
```
to:
```tsx
description="Down payment if keeping current home as rental (smaller, from savings + IRA)"
```

Line 96 — change:
```tsx
description="Expected annual home value appreciation for Austin area"
```
to:
```tsx
description="Expected annual home value appreciation"
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/sections/NewHomeSection.tsx
git commit -m "refactor(ui): remove Austin-specific text from NewHomeSection"
```

---

## Task 4: De-personalize CommuteSection descriptions

**Files:**
- Modify: `src/components/sections/CommuteSection.tsx:25`

**Step 1: Update description**

Line 25 — change:
```tsx
description="Round-trip commute distance from Kyle to Austin"
```
to:
```tsx
description="Current round-trip commute distance"
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/sections/CommuteSection.tsx
git commit -m "refactor(ui): remove Kyle/Austin from CommuteSection"
```

---

## Task 5: De-personalize AboutYouSection

**Files:**
- Modify: `src/components/sections/AboutYouSection.tsx:115`

**Step 1: Update state tax description**

Line 115 — change:
```tsx
description="0% for Texas residents"
```
to:
```tsx
description="Your state's income tax rate (0% if no state income tax)"
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/sections/AboutYouSection.tsx
git commit -m "refactor(ui): remove Texas-specific text from AboutYouSection"
```

---

## Task 6: De-personalize ExecutiveSummary scenario labels

**Files:**
- Modify: `src/components/results/ExecutiveSummary.tsx:31-35`

**Step 1: Update SCENARIO_LABELS**

Change the hardcoded labels from:
```tsx
const SCENARIO_LABELS = {
  baseline: { short: 'Baseline', full: 'Stay in Kyle, keep the IRA, keep commuting' },
  scenarioA: { short: 'Scenario A', full: 'Sell Kyle, buy Austin, keep IRA intact + contributing' },
  scenarioB: { short: 'Scenario B', full: 'Keep Kyle as rental, withdraw IRA for down payment, buy Austin' },
} as const
```
to:
```tsx
const SCENARIO_LABELS = {
  baseline: { short: 'Baseline', full: 'Stay in current home, keep the IRA, keep commuting' },
  scenarioA: { short: 'Scenario A', full: 'Sell current home, buy new home, keep IRA intact + contributing' },
  scenarioB: { short: 'Scenario B', full: 'Keep current home as rental, withdraw IRA for down payment, buy new home' },
} as const
```

Note: These will become dynamic in Task 10 when home names are wired through. This step is just removing hardcoded city names.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/results/ExecutiveSummary.tsx
git commit -m "refactor(ui): remove Kyle/Austin from ExecutiveSummary labels"
```

---

## Task 7: De-personalize MonthlyCashFlow breakdown headers

**Files:**
- Modify: `src/components/results/MonthlyCashFlow.tsx:243,251-256`

**Step 1: Update breakdown section headers**

Line 243 — change:
```tsx
<BreakdownSectionHeader title="Housing (Austin)" />
```
to:
```tsx
<BreakdownSectionHeader title="Housing (New Home)" />
```

Line 251 — change:
```tsx
<BreakdownSectionHeader title="Rental Property (Kyle)" />
```
to:
```tsx
<BreakdownSectionHeader title="Rental Property" />
```

Lines 253-256 — change "Kyle" labels:
```tsx
<BreakdownLine label="Kyle Mortgage" ...
<BreakdownLine label="Kyle Property Tax" ...
<BreakdownLine label="Kyle Insurance" ...
```
to:
```tsx
<BreakdownLine label="Rental Mortgage" ...
<BreakdownLine label="Rental Property Tax" ...
<BreakdownLine label="Rental Insurance" ...
```

**Step 2: Run tests**

Run: `npx vitest run src/components/results/__tests__/MonthlyCashFlow.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/results/MonthlyCashFlow.tsx
git commit -m "refactor(ui): remove Kyle/Austin from MonthlyCashFlow headers"
```

---

## Task 8: De-personalize YearByYearTable column headers

**Files:**
- Modify: `src/components/results/YearByYearTable.tsx:74-75`

**Step 1: Update column labels**

Change:
```tsx
{ key: 'kyle', label: 'Kyle Equity', align: 'right' as const },
{ key: 'austin', label: 'Austin Equity', align: 'right' as const },
```
to:
```tsx
{ key: 'currentHome', label: 'Current Home Equity', align: 'right' as const },
{ key: 'newHome', label: 'New Home Equity', align: 'right' as const },
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/results/YearByYearTable.tsx
git commit -m "refactor(ui): remove Kyle/Austin from YearByYearTable columns"
```

---

## Task 9: Add home name fields to schema and types

**Files:**
- Modify: `src/engine/types.ts:231-239` — add `homeNames` to `ScenarioInputs`
- Modify: `src/schemas/scenarioInputs.ts` — add home names sub-schema + defaults
- Modify: `src/engine/constants.ts` — add `DEFAULT_HOME_NAMES`

**Step 1: Add HomeNames interface to types.ts**

After the `ProjectionInputs` interface (line 225), add:

```typescript
/** User-configurable display names for the two properties. */
export interface HomeNames {
  /** Display name for the current home (e.g. "Denver Condo"). */
  currentHomeName: string
  /** Display name for the new home (e.g. "Austin House"). */
  newHomeName: string
}
```

Add `homeNames: HomeNames` to the `ScenarioInputs` interface:

```typescript
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
```

**Step 2: Add defaults to constants.ts**

After `DEFAULT_PROJECTION_INPUTS` (around line 380), add:

```typescript
/** Default display names for the two properties. */
export const DEFAULT_HOME_NAMES = {
  currentHomeName: 'Current Home',
  newHomeName: 'New Home',
} satisfies Record<string, unknown>
```

**Step 3: Add schema to scenarioInputs.ts**

Add the sub-schema before the top-level schema:

```typescript
const homeNamesSchema = z.object({
  /** Display name for the current home. */
  currentHomeName: z.string().min(1).max(50),
  /** Display name for the new home. */
  newHomeName: z.string().min(1).max(50),
})
```

Add to the top-level schema:

```typescript
export const scenarioInputsSchema = z.object({
  personal: personalInputsSchema,
  retirement: retirementInputsSchema,
  currentHome: currentHomeInputsSchema,
  newHome: newHomeInputsSchema,
  commute: commuteInputsSchema,
  costs: costInputsSchema,
  projection: projectionInputsSchema,
  homeNames: homeNamesSchema,
})
```

Add to defaultValues:

```typescript
export const defaultValues: ScenarioInputs = {
  ...existing fields...,
  homeNames: DEFAULT_HOME_NAMES,
}
```

Import `DEFAULT_HOME_NAMES` at the top of scenarioInputs.ts.

**Step 4: Update engine/scenarios.ts to pass through homeNames**

The `runModel` function receives `ScenarioInputs` but the engine doesn't use `homeNames` — it's purely for the UI. However, `runModel` currently constructs `ScenarioOutput.name` strings. Check if the engine sets scenario names, and if so, update them to use `inputs.homeNames`.

Look at `src/engine/scenarios.ts` for where `name` is set on `ScenarioOutput` objects. Update those strings to use `inputs.homeNames.currentHomeName` and `inputs.homeNames.newHomeName`.

**Step 5: Run type checker and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TypeScript may flag missing `homeNames` in test fixtures. Fix any test fixtures that construct `ScenarioInputs` directly — add `homeNames: { currentHomeName: 'Current Home', newHomeName: 'New Home' }`.

**Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/constants.ts src/schemas/scenarioInputs.ts src/engine/scenarios.ts
git commit -m "feat(schema): add homeNames field to ScenarioInputs"
```

---

## Task 10: Add home name inputs to the UI and wire through components

**Files:**
- Modify: `src/components/sections/AboutYouSection.tsx` — add two text inputs at top
- Modify: `src/components/InputAccordion.tsx` — use `useWatch` to read home names for section titles
- Modify: `src/components/results/ExecutiveSummary.tsx` — use home names in scenario labels
- Modify: `src/components/results/MonthlyCashFlow.tsx` — use home names in breakdown headers
- Modify: `src/components/results/YearByYearTable.tsx` — use home names in column headers

**Step 1: Add home name inputs to AboutYouSection**

At the top of the component, before the "Primary info" div, add:

```tsx
{/* Home names */}
<div className="space-y-3 pb-4 border-b">
  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Homes</p>
  <FormField
    name="homeNames.currentHomeName"
    label="Current Home Name"
    control={control}
    type="text"
    description="Give your current home a name"
    placeholder="e.g., Denver Condo, Our Ranch House"
  />
  <FormField
    name="homeNames.newHomeName"
    label="New Home Name"
    control={control}
    type="text"
    description="Give the home you're buying a name"
    placeholder="e.g., Austin House, The New Place"
  />
</div>
```

Note: Check whether `FormField` supports `type="text"` and `placeholder` — it likely does since it's a generic input wrapper. If not, add a simple text input inline.

**Step 2: Wire home names into InputAccordion section titles**

Add `useWatch` import and read home names:

```tsx
import { useWatch, useFormContext } from 'react-hook-form'
import type { ScenarioInputs } from '@/engine/types'

function InputAccordion({ defaultOpenSections = ['about-you'] }: InputAccordionProps) {
  const currentHomeName = useWatch<ScenarioInputs, 'homeNames.currentHomeName'>({ name: 'homeNames.currentHomeName' }) || 'Current Home'
  const newHomeName = useWatch<ScenarioInputs, 'homeNames.newHomeName'>({ name: 'homeNames.newHomeName' }) || 'New Home'
```

Then use `{currentHomeName}` and `{newHomeName}` in the section title divs instead of the static strings.

**Step 3: Wire into ExecutiveSummary**

Make `SCENARIO_LABELS` dynamic by reading home names from form state:

```tsx
const currentHomeName = (formValues as ScenarioInputs)?.homeNames?.currentHomeName || 'Current Home'
const newHomeName = (formValues as ScenarioInputs)?.homeNames?.newHomeName || 'New Home'

const scenarioLabels = {
  baseline: { short: 'Baseline', full: `Stay in ${currentHomeName}, keep the IRA, keep commuting` },
  scenarioA: { short: 'Scenario A', full: `Sell ${currentHomeName}, buy ${newHomeName}, keep IRA intact + contributing` },
  scenarioB: { short: 'Scenario B', full: `Keep ${currentHomeName} as rental, withdraw IRA for down payment, buy ${newHomeName}` },
}
```

Replace all references to `SCENARIO_LABELS` with `scenarioLabels` (the local variable). Remove the module-level `SCENARIO_LABELS` constant.

**Step 4: Wire into MonthlyCashFlow**

The `RentalBreakdown` component needs home names. Options:
- Read from form context directly in the component
- Pass as props from the parent

Simplest: read from form context in `MonthlyCashFlow` and pass to `RentalBreakdown`:

```tsx
export function MonthlyCashFlow() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()
  const currentHomeName = (formValues as ScenarioInputs)?.homeNames?.currentHomeName || 'Current Home'
  const newHomeName = (formValues as ScenarioInputs)?.homeNames?.newHomeName || 'New Home'
```

Pass `currentHomeName` and `newHomeName` as props to `RentalBreakdown`, update the header strings:

```tsx
<BreakdownSectionHeader title={`Housing (${newHomeName})`} />
...
<BreakdownSectionHeader title={`Rental Property (${currentHomeName})`} />
<BreakdownLine label={`${currentHomeName} Mortgage`} ...
<BreakdownLine label={`${currentHomeName} Property Tax`} ...
<BreakdownLine label={`${currentHomeName} Insurance`} ...
```

**Step 5: Wire into YearByYearTable**

Read home names and use in column headers:

```tsx
export function YearByYearTable() {
  const { modelOutput } = useModelOutput()
  const formValues = useWatch<ScenarioInputs>()
  const currentHomeName = (formValues as ScenarioInputs)?.homeNames?.currentHomeName || 'Current Home'
  const newHomeName = (formValues as ScenarioInputs)?.homeNames?.newHomeName || 'New Home'

  // Make COLUMNS dynamic
  const columns = [
    { key: 'year', label: 'Year', align: 'left' as const },
    { key: 'income', label: 'Income', align: 'right' as const },
    { key: 'cashFlow', label: 'Monthly Cash Flow', align: 'right' as const },
    { key: 'liquid', label: 'Liquid Savings', align: 'right' as const },
    { key: 'ira', label: 'IRA Balance', align: 'right' as const },
    { key: 'currentHome', label: `${currentHomeName} Equity`, align: 'right' as const },
    { key: 'newHome', label: `${newHomeName} Equity`, align: 'right' as const },
    { key: 'netWorth', label: 'Net Worth', align: 'right' as const },
  ]
```

Pass `columns` as a prop to `ScenarioTable` instead of using the module-level `COLUMNS`.

**Step 6: Run type checker and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Component tests may need updates. Fix any assertion failures (e.g., tests that look for "Kyle Equity" text).

**Step 7: Commit**

```bash
git add src/components/sections/AboutYouSection.tsx src/components/InputAccordion.tsx src/components/results/ExecutiveSummary.tsx src/components/results/MonthlyCashFlow.tsx src/components/results/YearByYearTable.tsx
git commit -m "feat(ui): add user-configurable home names, wire through all components"
```

---

## Task 11: Remove personal defaults — split defaults into blank + structural

**Files:**
- Modify: `src/engine/constants.ts` — clear personal fields
- Modify: `src/schemas/scenarioInputs.ts` — make personal fields accept undefined, adjust defaultValues
- Modify: `src/engine/types.ts` — no changes (types stay required — the schema layer handles blank state)

**Step 1: Create new default values in constants.ts**

Replace the current DEFAULT_* objects. Personal/financial fields become `undefined` (or 0 as a sentinel). Structural fields keep their values.

Fields that should start **blank** (user MUST fill in):
- `personal.age` → undefined
- `personal.annualGrossIncome` → undefined
- `personal.filingStatus` → undefined
- `personal.monthlyLivingExpenses` → undefined
- `personal.liquidSavings` → undefined
- `retirement.iraBalance` → undefined
- `retirement.iraType` → undefined
- `retirement.iraWithdrawalAmountScenarioB` → undefined
- `currentHome.homeValue` → undefined
- `currentHome.mortgageBalance` → undefined
- `currentHome.interestRate` → undefined
- `currentHome.originalLoanTermYears` → undefined
- `currentHome.yearsIntoLoan` → undefined
- `currentHome.expectedMonthlyRent` → undefined
- `currentHome.annualPropertyTaxRate` → undefined
- `currentHome.annualInsurance` → undefined
- `newHome.purchasePrice` → undefined
- `newHome.interestRate` → undefined
- `newHome.downPaymentPercentScenarioA` → undefined
- `newHome.downPaymentPercentScenarioB` → undefined
- `newHome.annualPropertyTaxRate` → undefined
- `newHome.annualInsurance` → undefined
- `commute.currentRoundTripMiles` → undefined

Fields that **keep defaults** (structural/advanced assumptions):
- `personal.annualSalaryGrowthRate: 0.03`
- `personal.stateIncomeTaxRate: 0.0`
- `personal.monthlyDebtPayments: 0`
- `retirement.iraExpectedAnnualReturn: 0.07`
- `retirement.annualIRAContributionScenarioA: 7_000`
- `retirement.annualIRAContributionScenarioB: 0`
- `retirement.hasEmployerMatch: false`
- `retirement.employerMatchPercentage: 0.0`
- `retirement.hasOtherRetirementSavings: false`
- `retirement.otherRetirementBalance: 0`
- `currentHome.landlordInsurancePremiumIncrease: 0.2`
- `currentHome.maintenanceReserveRate: 0.0075`
- `currentHome.monthlyHOA: 0`
- `currentHome.annualRentGrowthRate: 0.03`
- `currentHome.vacancyRate: 0.08`
- `currentHome.propertyManagementFeeRate: 0.0`
- `currentHome.tenantTurnoverFrequencyYears: 2.5`
- `currentHome.costPerTurnover: 3_500`
- `currentHome.sellingCostsRate: 0.06`
- `currentHome.annualAppreciationRate: 0.03`
- `currentHome.landValuePercentage: 0.15`
- `currentHome.rentalIncomeDTICreditRate: 0.75`
- `newHome.loanTermYears: 30`
- `newHome.annualPMIRate: 0.007`
- `newHome.closingCostsRate: 0.025`
- `newHome.annualAppreciationRate: 0.035`
- All `costs.*` fields keep defaults
- All `projection.*` fields keep defaults
- All `commute.*` fields except `currentRoundTripMiles` keep defaults

**Step 2: Update Zod schema for optional personal fields**

For fields that start blank, change from required number to `z.number().optional()` (or `z.string().optional()` for enums). The schema should validate as optional for form state, but the engine still requires all fields.

Create a new `formDefaultValues` export that has `undefined` for blank fields and values for structural fields. Keep the existing `defaultValues` for engine tests (with all fields populated).

Actually, the simplest approach: keep the Zod schema unchanged (all fields required), but change `defaultValues` to have `undefined` for blank fields. react-hook-form will treat those as empty inputs. The form won't pass Zod validation until all required fields are filled — which is exactly what we want for the results gating.

Wait — that won't work because the Zod schema requires numbers, not undefined. We need to make the personal fields `.optional()` in the Zod schema, or use a separate "form schema" vs "engine schema."

Best approach: **Make personal fields `.optional()` in the Zod schema** and create a type guard / validation function that checks if all required fields are present before running the engine. The engine types stay unchanged (all required).

```typescript
// In scenarioInputs.ts
const personalInputsSchema = z.object({
  age: z.number().int().min(18).max(80).optional(),
  annualGrossIncome: currency().optional(),
  filingStatus: z.enum([...]).optional(),
  monthlyLivingExpenses: currency().optional(),
  liquidSavings: currency().optional(),
  // These keep defaults and stay required:
  annualSalaryGrowthRate: rate(),
  stateIncomeTaxRate: rate(),
  monthlyDebtPayments: currency(),
})
```

Create a helper:

```typescript
/**
 * List of field paths that must be filled before the engine can run.
 * Used by the results gate and progress indicator.
 */
export const REQUIRED_FIELDS: string[] = [
  'personal.age',
  'personal.annualGrossIncome',
  'personal.filingStatus',
  'personal.monthlyLivingExpenses',
  'personal.liquidSavings',
  'retirement.iraBalance',
  'retirement.iraType',
  'currentHome.homeValue',
  'currentHome.mortgageBalance',
  'currentHome.interestRate',
  'currentHome.originalLoanTermYears',
  'currentHome.yearsIntoLoan',
  'currentHome.expectedMonthlyRent',
  'currentHome.annualPropertyTaxRate',
  'currentHome.annualInsurance',
  'newHome.purchasePrice',
  'newHome.interestRate',
  'newHome.downPaymentPercentScenarioA',
  'newHome.downPaymentPercentScenarioB',
  'newHome.annualPropertyTaxRate',
  'newHome.annualInsurance',
  'commute.currentRoundTripMiles',
]

/** Check if all required fields are filled (not undefined/null). */
export function areRequiredFieldsFilled(values: unknown): values is ScenarioInputs {
  // Walk REQUIRED_FIELDS, check that each path resolves to a non-null/undefined value
  ...
}
```

**Step 3: Update defaultValues**

Create `formDefaultValues` (for the UI — blank personal fields) alongside the existing `defaultValues` (for engine tests — all fields populated):

```typescript
export const formDefaultValues = {
  personal: {
    age: undefined,
    annualGrossIncome: undefined,
    filingStatus: undefined,
    monthlyLivingExpenses: undefined,
    liquidSavings: undefined,
    annualSalaryGrowthRate: 0.03,
    stateIncomeTaxRate: 0.0,
    monthlyDebtPayments: 0,
  },
  retirement: {
    iraBalance: undefined,
    iraType: undefined,
    iraWithdrawalAmountScenarioB: undefined,
    iraExpectedAnnualReturn: 0.07,
    annualIRAContributionScenarioA: 7_000,
    annualIRAContributionScenarioB: 0,
    hasEmployerMatch: false,
    employerMatchPercentage: 0.0,
    hasOtherRetirementSavings: false,
    otherRetirementBalance: 0,
  },
  // ... etc for each section
  homeNames: DEFAULT_HOME_NAMES,
}
```

**Step 4: Update useFormPersistence to use formDefaultValues**

Change the import and usage in `src/hooks/useFormPersistence.ts` to use `formDefaultValues` instead of `defaultValues` for new users. The `resetToDefaults` function should also reset to `formDefaultValues`.

**Step 5: Run type checker and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Engine tests still use `defaultValues` (all fields populated) and pass. Component tests may need updates.

**Step 6: Commit**

```bash
git add src/engine/constants.ts src/schemas/scenarioInputs.ts src/hooks/useFormPersistence.ts
git commit -m "feat(schema): make personal fields optional, split form defaults from engine defaults"
```

---

## Task 12: Gate results behind required field validation

**Files:**
- Modify: `src/hooks/useScenarioModel.ts` — add validation gate
- Create: `src/components/results/ResultsGate.tsx` — empty state UI
- Modify: `src/components/results/ResultsSections.tsx` — wrap in ResultsGate

**Step 1: Write the ResultsGate component test**

Create `src/components/results/__tests__/ResultsGate.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// ... test that when required fields are missing, it shows the empty state message
// ... test that when all required fields are filled, it renders children
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/results/__tests__/ResultsGate.test.tsx`
Expected: FAIL — component doesn't exist yet

**Step 3: Implement useScenarioModel validation gate**

In `src/hooks/useScenarioModel.ts`, import `areRequiredFieldsFilled` and check before running:

```typescript
export interface UseScenarioModelResult {
  modelOutput: ModelOutput | null
  isComputing: boolean
  /** True when all required fields are filled and the engine can run. */
  isReady: boolean
  /** Number of required fields that are filled. */
  filledCount: number
  /** Total number of required fields. */
  totalRequired: number
}
```

In the effect, only call `runModel` if `areRequiredFieldsFilled(formValues)` returns true. Otherwise, set `modelOutput` to null and `isReady` to false.

**Step 4: Implement ResultsGate component**

```tsx
// src/components/results/ResultsGate.tsx
import { useModelOutput } from '@/components/ScenarioModelProvider'

export function ResultsGate({ children }: { children: React.ReactNode }) {
  const { isReady, filledCount, totalRequired } = useModelOutput()

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Fill in the highlighted fields to see your analysis
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {filledCount} of {totalRequired} required fields completed
        </p>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(filledCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

**Step 5: Wrap ResultsSections content in ResultsGate**

In `src/components/results/ResultsSections.tsx`, wrap the content:

```tsx
import { ResultsGate } from './ResultsGate'

export function ResultsSections() {
  return (
    <ResultsGate>
      <div className="space-y-10" data-testid="results-sections">
        {/* ... existing content ... */}
      </div>
    </ResultsGate>
  )
}
```

Note: The time horizon control should still be visible above the gate, or move it into the inputs section. Since we're converting it to a slider in the results panel (Task 13), keep it outside the gate.

**Step 6: Update ScenarioModelProvider**

The `ScenarioModelProvider` currently only exposes `modelOutput` and `isComputing`. It needs to also expose `isReady`, `filledCount`, and `totalRequired`. Update the context type and provider to include the new fields from `useScenarioModel`.

**Step 7: Run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS. Component tests that mock `useModelOutput` may need to include the new fields.

**Step 8: Commit**

```bash
git add src/hooks/useScenarioModel.ts src/components/results/ResultsGate.tsx src/components/results/ResultsSections.tsx src/components/ScenarioModelProvider.tsx
git commit -m "feat(ui): gate results behind required field validation with progress indicator"
```

---

## Task 13: Convert time horizon to slider

**Files:**
- Modify: `src/components/results/ResultsSections.tsx:42-58` — replace FormField with Slider

**Step 1: Replace text input with Slider**

Replace the current time horizon `FormField` with a shadcn Slider:

```tsx
import { Slider } from '@/components/ui/slider'
import { Controller } from 'react-hook-form'

// Inside the component:
<div className="ml-auto flex items-center gap-3 min-w-[200px]">
  <Controller
    name="projection.timeHorizonYears"
    control={control}
    render={({ field }) => (
      <div className="flex items-center gap-3 w-full">
        <Slider
          min={5}
          max={30}
          step={1}
          value={[field.value]}
          onValueChange={([val]) => field.onChange(val)}
          className="flex-1"
        />
        <span className="text-sm font-medium tabular-nums w-12 text-right">
          {field.value} yr
        </span>
      </div>
    )}
  />
</div>
```

Remove the old `FormField` import if no longer used in this file.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 3: Visually verify**

Run: `npm run dev`
Check that the slider renders correctly, snaps to integer values, shows the current year label, and updates projections in real time.

**Step 4: Commit**

```bash
git add src/components/results/ResultsSections.tsx
git commit -m "feat(ui): convert time horizon from text input to slider (5-30 years)"
```

---

## Task 14: Update component tests for de-personalized labels

**Files:**
- Modify: `src/components/results/__tests__/MonthlyCashFlow.test.tsx` — update any assertions referencing Kyle/Austin
- Modify: `src/components/__tests__/InputAccordion.test.tsx` — update assertions
- Modify: any other test files with Kyle/Austin references

**Step 1: Search for remaining Kyle/Austin references in test files**

Run: `grep -rn "Kyle\|Austin" src/components/ --include="*.test.*"`

Fix all found references to use the new generic labels.

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update component tests for de-personalized labels"
```

---

## Task 15: Clear localStorage for existing users

**Files:**
- Modify: `src/hooks/useFormPersistence.ts` — add schema version migration

**Step 1: Add a schema version check**

Existing users have localStorage with the old schema (no `homeNames` field, old defaults). When the new code loads, `safeParse` will fail because `homeNames` is missing, and it'll fall back to `formDefaultValues` — which is blank fields.

This is actually the correct behavior: existing users get a fresh start with the generic tool. But if you want to be gentler, you could try to merge old values with the new schema. The simplest approach is to let `safeParse` handle it: if the saved data matches the new schema, use it; otherwise, start fresh.

Verify this works by checking that `readFromStorage` already handles the case where saved data doesn't match the schema (it does — falls back to defaults on parse failure).

No code change needed if the existing fallback behavior is acceptable. Just verify.

**Step 2: Run the full test suite and TypeScript check**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All PASS

**Step 3: Commit (if any changes)**

```bash
git commit -m "chore: verify localStorage migration for schema changes"
```

---

## Task 16: Final verification and cleanup

**Step 1: Search for any remaining Kyle/Austin/Preston references**

Run: `grep -rn "Kyle\|Austin\|Preston" src/ --include="*.ts" --include="*.tsx"`

The only acceptable remaining references are:
- Comments in `engine/constants.ts` explaining the project origin (if any)
- Integration test files (`integration-preston.test.ts`) — these are test personas, not UI text

Fix any that appear in UI-facing code.

**Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: All PASS

**Step 3: Run TypeScript strict check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Run linter**

Run: `npx eslint src/`
Expected: No warnings or errors

**Step 5: Visual smoke test**

Run: `npm run dev`
- Verify home name inputs appear in About You section
- Verify accordion titles update when home names are typed
- Verify results show "Fill in the highlighted fields" when form is empty
- Verify progress bar fills as fields are completed
- Verify results appear once all required fields are filled
- Verify time horizon slider works (5-30, updates projections)
- Verify all city-specific references are gone from the UI

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 generalization — tool is now generic for any US homeowner"
```
