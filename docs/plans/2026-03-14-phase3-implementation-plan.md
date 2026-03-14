# Phase 3: Full Interactive UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete interactive UI — inputs, charts, cash flow, warnings — wired to the financial engine so users can tweak inputs and see all three scenarios update instantly.

**Architecture:** Accordion inputs + results on both mobile (tabbed) and desktop (two-column). Single `useScenarioModel` hook calls `runModel()`, debounced, with output via React context. Form state persisted to localStorage. Pre-populated with Preston's defaults.

**Tech Stack:** React 19, react-hook-form + zod, Recharts, shadcn/ui (Accordion, Card, Tabs, Input, Select, Label, Alert), Tailwind CSS v4, Vitest + React Testing Library.

**Depends on:** Phase 2 engine (`runModel()`, `ModelOutput`). Tasks 1–7 are Phase 2-independent. Tasks 8+ require Phase 2.

---

## Part A: Phase 2-Independent (build now)

### Task 1: Install dependencies and shadcn components

**Files:**
- Modify: `package.json`

**Step 1: Install Recharts**

Run: `npm install recharts`

**Step 2: Add shadcn/ui components**

Run each:
```bash
npx shadcn@latest add accordion
npx shadcn@latest add card
npx shadcn@latest add tabs
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add alert
npx shadcn@latest add slider
npx shadcn@latest add badge
npx shadcn@latest add collapsible
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): install recharts and shadcn/ui components"
```

---

### Task 2: Zod schema for ScenarioInputs

**Files:**
- Create: `src/schemas/scenarioInputs.ts`
- Test: `src/schemas/__tests__/scenarioInputs.test.ts`

**Step 1: Write tests for the zod schema**

Test that:
- Default inputs (`DEFAULT_*_INPUTS` from `constants.ts`) pass validation
- Invalid values are rejected (negative age, negative income, rate > 1, etc.)
- The parsed output matches the `ScenarioInputs` type shape
- Edge cases: zero values where valid (e.g., $0 debt), boundary values

**Step 2: Run tests, verify they fail**

Run: `npx vitest run src/schemas/__tests__/scenarioInputs.test.ts`

**Step 3: Implement the schema**

Create the zod schema in `src/schemas/scenarioInputs.ts`. It should:
- Mirror the structure of `ScenarioInputs` from `types.ts` (personal, retirement, currentHome, newHome, commute, costs, projection)
- Add min/max constraints per field (e.g., age: 18–80, rates: 0–1, currency: ≥ 0)
- Export the schema and the inferred type
- Export a `defaultValues` object assembled from `DEFAULT_*_INPUTS`

Reference `src/engine/types.ts` for the exact field names and types. Reference `src/engine/constants.ts` for the default values.

**Step 4: Run tests, verify they pass**

Run: `npx vitest run src/schemas/__tests__/scenarioInputs.test.ts`

**Step 5: Verify full build**

Run: `npm run build && npm run test`

**Step 6: Commit**

```bash
git add src/schemas/
git commit -m "feat(ui): add zod validation schema for scenario inputs"
```

---

### Task 3: Formatter utilities

**Files:**
- Create: `src/utils/formatters.ts`
- Test: `src/utils/__tests__/formatters.test.ts`

**Step 1: Write tests**

Test these formatters:
- `formatCurrency(1234.56)` → `"$1,235"` (rounded, no cents for large numbers)
- `formatCurrency(1234.56, { cents: true })` → `"$1,234.56"`
- `formatCurrency(-500)` → `"-$500"` (negative handling)
- `formatCurrency(0)` → `"$0"`
- `formatPercent(0.0325)` → `"3.25%"`
- `formatPercent(0)` → `"0%"`
- `formatNumber(12345)` → `"12,345"`
- `formatCompactCurrency(1_500_000)` → `"$1.5M"`
- `formatCompactCurrency(250_000)` → `"$250K"`

**Step 2: Run tests, verify they fail**

Run: `npx vitest run src/utils/__tests__/formatters.test.ts`

**Step 3: Implement formatters**

Use `Intl.NumberFormat` for locale-safe formatting. Keep it simple — these are thin wrappers.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/utils/formatters.ts src/utils/__tests__/
git commit -m "feat(ui): add currency, percent, and number formatters"
```

---

### Task 4: FormField and specialized input components

**Files:**
- Create: `src/components/FormField.tsx`
- Create: `src/components/CurrencyInput.tsx`
- Create: `src/components/PercentInput.tsx`
- Test: `src/components/__tests__/FormField.test.tsx`

**Step 1: Write tests**

Test that:
- `FormField` renders a label and input, associates them via `htmlFor`/`id`
- `FormField` displays error messages from react-hook-form when present
- `CurrencyInput` renders with `$` prefix and `inputMode="decimal"`
- `PercentInput` renders with `%` suffix and `inputMode="decimal"`
- Changing the input value calls the `onChange` handler from react-hook-form's `Controller`

**Step 2: Run tests, verify they fail**

**Step 3: Implement components**

- `FormField` wraps shadcn `Label` + `Input` + error display. Takes `name`, `label`, `control` (from react-hook-form), and optional `description` for context.
- `CurrencyInput` wraps `FormField` with `$` prefix styling.
- `PercentInput` wraps `FormField` with `%` suffix styling. Accepts values as decimals (0.03) and displays as percentages (3). Converts on input/display.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/FormField.tsx src/components/CurrencyInput.tsx src/components/PercentInput.tsx src/components/__tests__/
git commit -m "feat(ui): add FormField, CurrencyInput, PercentInput components"
```

---

### Task 5: Input accordion sections

**Files:**
- Create: `src/components/InputAccordion.tsx`
- Create: `src/components/sections/AboutYouSection.tsx`
- Create: `src/components/sections/RetirementSection.tsx`
- Create: `src/components/sections/CurrentHomeSection.tsx`
- Create: `src/components/sections/NewHomeSection.tsx`
- Create: `src/components/sections/CommuteSection.tsx`
- Test: `src/components/__tests__/InputAccordion.test.tsx`

**Step 1: Write tests**

Test that:
- `InputAccordion` renders all 5 section headers
- Clicking a section header expands it, showing its input fields
- Each section renders the correct primary fields (always visible when expanded)
- Each section has an "Advanced" toggle that reveals advanced fields
- All fields are wired to react-hook-form (wrap test in `FormProvider` with the zod schema from Task 2)

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- `InputAccordion` uses shadcn `Accordion` (type="multiple" so multiple sections can be open).
- Each section component renders its fields using `CurrencyInput`, `PercentInput`, and standard shadcn `Input`/`Select` for non-currency/percent fields.
- Filing status and IRA type use shadcn `Select`.
- Advanced fields wrapped in shadcn `Collapsible` with a toggle button.
- All fields use react-hook-form `Controller` with names matching the zod schema (e.g., `personal.age`, `retirement.iraBalance`, `currentHome.expectedMonthlyRent`).
- Reference the design doc [phase3-full-interactive-ui.md](docs/plans/2026-03-14-phase3-full-interactive-ui.md) "Input Sections" table for which fields are primary vs advanced.

**Step 4: Run tests, verify they pass**

**Step 5: Verify build**

Run: `npm run build && npm run test`

**Step 6: Commit**

```bash
git add src/components/InputAccordion.tsx src/components/sections/
git commit -m "feat(ui): add input accordion with all 5 sections and progressive disclosure"
```

---

### Task 6: Layout shells (desktop + mobile)

**Files:**
- Create: `src/components/DesktopLayout.tsx`
- Create: `src/components/MobileLayout.tsx`
- Create: `src/hooks/useMediaQuery.ts`
- Test: `src/components/__tests__/Layout.test.tsx`

**Step 1: Write tests**

Test that:
- `useMediaQuery` returns a boolean based on window width
- `DesktopLayout` renders children in a two-column grid
- `MobileLayout` renders a tab bar with "Inputs" and "Results" tabs
- `MobileLayout` shows inputs tab by default, switches to results on tab click

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- `useMediaQuery(breakpoint)` — uses `window.matchMedia`, returns boolean. Clean up listener on unmount.
- `DesktopLayout` — CSS grid, two columns (~40/60 split). Left column: `children.inputs`. Right column: `children.results`. Both scroll independently (`overflow-y-auto`, `max-h-screen`).
- `MobileLayout` — shadcn `Tabs` component. Two tabs: "Inputs" and "Results". Full-width, single column.
- App.tsx wires them together: `useMediaQuery(768)` determines which layout renders. Both layouts receive the same `InputAccordion` and results placeholder.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/DesktopLayout.tsx src/components/MobileLayout.tsx src/hooks/useMediaQuery.ts src/components/__tests__/Layout.test.tsx
git commit -m "feat(ui): add responsive desktop and mobile layout shells"
```

---

### Task 7: Wire up App with FormProvider and localStorage persistence

**Files:**
- Modify: `src/App.tsx`
- Create: `src/hooks/useFormPersistence.ts`
- Test: `src/hooks/__tests__/useFormPersistence.test.ts`

**Step 1: Write tests for useFormPersistence**

Test that:
- On mount with empty localStorage, returns default values
- On mount with valid saved values in localStorage, returns saved values
- On mount with invalid/corrupt localStorage data, falls back to defaults
- After form values change, values are saved to localStorage (debounced)
- `resetToDefaults()` clears localStorage and returns defaults

**Step 2: Run tests, verify they fail**

**Step 3: Implement useFormPersistence**

- Reads from `localStorage.getItem('scenario-inputs')`
- Parses with the zod schema — if valid, returns parsed values; if invalid, returns defaults
- Exposes a `save(values)` function (debounced 500ms) that writes to localStorage
- Exposes a `resetToDefaults()` function

**Step 4: Wire up App.tsx**

- Create `FormProvider` with `useForm({ resolver: zodResolver(schema), defaultValues: fromPersistence })`
- Render layout with `InputAccordion` on the inputs side
- Render a placeholder "Results will appear here" on the results side (until Phase 2 engine is available)
- Add a "Reset to Defaults" button in the input panel header
- Hook up `useFormPersistence` to save on value changes

**Step 5: Run all tests**

Run: `npm run test`

**Step 6: Manual smoke test**

Run: `npm run dev`
- Verify accordion renders with all sections
- Verify fields are pre-populated with Preston's defaults
- Verify changing a field, refreshing, and seeing the value persist
- Verify "Reset to Defaults" clears custom values

**Step 7: Commit**

```bash
git add src/App.tsx src/hooks/useFormPersistence.ts src/hooks/__tests__/
git commit -m "feat(ui): wire App with form provider, accordion inputs, and localStorage persistence"
```

---

## Part B: Requires Phase 2 Engine

> **Gate:** Do not start Part B until Phase 2 is merged to main and `runModel()` is available.

### Task 8: ScenarioModelProvider (engine → UI bridge)

**Files:**
- Create: `src/hooks/useScenarioModel.ts`
- Create: `src/components/ScenarioModelProvider.tsx`
- Test: `src/hooks/__tests__/useScenarioModel.test.ts`

**Step 1: Write tests**

Test that:
- Calling `useScenarioModel` with valid default inputs returns a `ModelOutput`
- Changing an input value (via form) triggers recomputation after debounce
- The `isComputing` flag is true during debounce, false after computation
- Output matches calling `runModel()` directly with the same inputs

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- `useScenarioModel` hook: calls `useWatch()` to get form values, debounces (150ms), calls `runModel(inputs)` from `src/engine/scenarios.ts`, returns `{ modelOutput, isComputing }`.
- `ScenarioModelProvider` wraps the hook in a React context so all results components can consume via `useScenarioModel()`.
- Add `ScenarioModelProvider` into `App.tsx` between `FormProvider` and the layouts.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/hooks/useScenarioModel.ts src/components/ScenarioModelProvider.tsx src/hooks/__tests__/
git commit -m "feat(ui): add ScenarioModelProvider wiring engine to UI via context"
```

---

### Task 9: Net Worth Projection Chart

**Files:**
- Create: `src/components/results/NetWorthChart.tsx`
- Test: `src/components/results/__tests__/NetWorthChart.test.tsx`

**Step 1: Write tests**

Test that:
- Component renders without crashing when given valid `ModelOutput`
- Renders 3 lines (Baseline, Scenario A, Scenario B)
- Renders correct number of data points (matching `timeHorizonYears`)
- Displays a legend with scenario names

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- Recharts `ResponsiveContainer` → `LineChart` with 3 `Line` components.
- X-axis: year. Y-axis: net worth, formatted with `formatCompactCurrency`.
- `Tooltip` shows all 3 values formatted as currency.
- Use `--chart-1`, `--chart-2`, `--chart-3` CSS variables for line colors.
- Consume `modelOutput` from `useScenarioModel()` context.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/NetWorthChart.tsx src/components/results/__tests__/
git commit -m "feat(ui): add net worth projection chart with 3 scenario lines"
```

---

### Task 10: IRA Trajectory Chart

**Files:**
- Create: `src/components/results/IRATrajectoryChart.tsx`
- Test: `src/components/results/__tests__/IRATrajectoryChart.test.tsx`

**Step 1: Write tests**

Test that:
- Renders 2 lines (Scenario A, Scenario B)
- Renders a callout showing the dollar gap at the final year
- Handles edge case where Scenario B IRA is $0 for many years

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- Same Recharts pattern as NetWorthChart but with 2 lines.
- Below the chart, render a text callout: "Scenario A IRA is {formatCurrency(gap)} higher at year {N}".
- Gap = Scenario A final IRA - Scenario B final IRA.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/IRATrajectoryChart.tsx src/components/results/__tests__/
git commit -m "feat(ui): add IRA trajectory chart with dollar gap callout"
```

---

### Task 11: Monthly Cash Flow Comparison

**Files:**
- Create: `src/components/results/MonthlyCashFlow.tsx`
- Test: `src/components/results/__tests__/MonthlyCashFlow.test.tsx`

**Step 1: Write tests**

Test that:
- Renders 3 scenario cards side-by-side (or stacked on mobile)
- Each card shows line items: income, taxes, housing, living expenses, debts, rental (B only), net
- Scenario B shows both best-case and worst-case net cash flow
- Negative cash flow values are styled distinctively (red text or similar)

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- Use shadcn `Card` for each scenario.
- Line items pulled from year 1 of `yearlySnapshots` (to show the immediate cash flow reality).
- Use `formatCurrency` for all values.
- Negative values get `text-destructive` class.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/MonthlyCashFlow.tsx src/components/results/__tests__/
git commit -m "feat(ui): add monthly cash flow comparison cards"
```

---

### Task 12: Upfront Capital Requirements

**Files:**
- Create: `src/components/results/UpfrontCapital.tsx`
- Test: `src/components/results/__tests__/UpfrontCapital.test.tsx`

**Step 1: Write tests**

Test that:
- Renders breakdown for each scenario: down payment, closing, moving, funding sources, surplus/shortfall
- Baseline shows "No capital event"
- Shortfall (negative surplus) renders with destructive styling and an alert

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- One `Card` per scenario with line-item breakdown.
- Use `UpfrontCapital` type from `ModelOutput`.
- Shortfall renders a shadcn `Alert` with `variant="destructive"`.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/UpfrontCapital.tsx src/components/results/__tests__/
git commit -m "feat(ui): add upfront capital requirements comparison"
```

---

### Task 13: Reserve Runway & Stress Tests

**Files:**
- Create: `src/components/results/ReserveRunway.tsx`
- Test: `src/components/results/__tests__/ReserveRunway.test.tsx`

**Step 1: Write tests**

Test that:
- Renders months of reserves for each scenario
- Renders stress test results for Scenario B (vacancy + maintenance, income disruption, market downturn)
- Low reserve runway (< 3 months) renders with critical styling
- Adequate runway (≥ 6 months) renders normally

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- Metric cards (label + value) for reserve months per scenario.
- Scenario B stress test section with 3 sub-cards showing each stress scenario's impact.
- Use `formatNumber` for months, `formatCurrency` for dollar impacts.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/ReserveRunway.tsx src/components/results/__tests__/
git commit -m "feat(ui): add reserve runway and stress test display"
```

---

### Task 14: Warnings List

**Files:**
- Create: `src/components/results/WarningsList.tsx`
- Test: `src/components/results/__tests__/WarningsList.test.tsx`

**Step 1: Write tests**

Test that:
- Renders warnings sorted by severity (critical first)
- Each warning shows category, message, and dollar impact (if present)
- Critical warnings use destructive styling
- Info warnings use muted styling
- Empty warnings array renders nothing (no empty state needed)

**Step 2: Run tests, verify they fail**

**Step 3: Implement**

- Map over combined warnings from all 3 scenarios, sorted by severity.
- Use shadcn `Alert` per warning. Icon per category (from lucide-react).
- `formatCurrency` for dollar impact.

**Step 4: Run tests, verify they pass**

**Step 5: Commit**

```bash
git add src/components/results/WarningsList.tsx src/components/results/__tests__/
git commit -m "feat(ui): add warnings list with severity-based styling"
```

---

### Task 15: Wire results into layouts and final integration

**Files:**
- Create: `src/components/results/ResultsSections.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/__tests__/Integration.test.tsx`

**Step 1: Write integration test**

Test that:
- App renders with default inputs and produces results
- Changing an input value updates the results (debounced)
- Warnings appear when thresholds are exceeded (e.g., DTI > 43%)
- "Reset to Defaults" resets all inputs and recomputes results

**Step 2: Run test, verify it fails**

**Step 3: Implement ResultsSections**

- `ResultsSections` is a simple wrapper that renders all 6 results components in order:
  1. `NetWorthChart`
  2. `IRATrajectoryChart`
  3. `MonthlyCashFlow`
  4. `UpfrontCapital`
  5. `ReserveRunway`
  6. `WarningsList`

**Step 4: Replace placeholder results in App.tsx**

- Swap "Results will appear here" placeholder with `<ResultsSections />`
- Ensure both `DesktopLayout` and `MobileLayout` render `ResultsSections`

**Step 5: Run all tests**

Run: `npm run test`

**Step 6: Manual smoke test**

Run: `npm run dev`
- Desktop: two-column layout, inputs left, results right, live updates
- Mobile (use browser dev tools, 375px): tabs work, inputs and results switch cleanly
- Change income → net worth chart updates
- Change IRA balance → IRA trajectory updates
- Set high DTI → warning appears

**Step 7: Verify build**

Run: `npm run build`

**Step 8: Commit**

```bash
git add src/components/results/ResultsSections.tsx src/App.tsx src/components/__tests__/Integration.test.tsx
git commit -m "feat(ui): wire all results sections into layouts — Phase 3 complete"
```

---

## Task Summary

| Task | Description | Phase 2 Required? |
|------|-------------|-------------------|
| 1 | Install Recharts + shadcn components | No |
| 2 | Zod schema for ScenarioInputs | No |
| 3 | Formatter utilities | No |
| 4 | FormField + CurrencyInput + PercentInput | No |
| 5 | Input accordion with 5 sections | No |
| 6 | Layout shells (desktop + mobile) | No |
| 7 | App wiring with FormProvider + localStorage | No |
| 8 | ScenarioModelProvider (engine bridge) | **Yes** |
| 9 | Net Worth Projection Chart | **Yes** |
| 10 | IRA Trajectory Chart | **Yes** |
| 11 | Monthly Cash Flow Comparison | **Yes** |
| 12 | Upfront Capital Requirements | **Yes** |
| 13 | Reserve Runway & Stress Tests | **Yes** |
| 14 | Warnings List | **Yes** |
| 15 | Final integration wiring | **Yes** |
