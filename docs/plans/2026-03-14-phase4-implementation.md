# Phase 4: Verdict + Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a plain-language verdict engine, breakeven sensitivity analysis, and mobile polish so the user gets a clear recommendation, understands how robust it is, and can use the tool comfortably on their phone.

**Architecture:** Two new engine modules (`verdict.ts`, `sensitivity.ts`) following the same pure-function pattern as Phase 1-2. Two new UI components (`VerdictSection`, `SensitivitySection`) consuming their output. Mobile refinements are a testing/fix pass, not a new feature.

**Tech Stack:** TypeScript (strict), Vitest, React, Tailwind, shadcn/ui, Recharts, Playwright (E2E)

**Reference docs:**
- `docs/plans/2026-03-14-phase4-verdict-polish.md` — approved design document (READ THIS FIRST)
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `CLAUDE.md` — coding standards, financial logic reminders, domain expertise
- `src/engine/types.ts` — all TypeScript interfaces
- `src/engine/scenarios.ts` — `runModel()` and `ModelOutput`
- `src/engine/constants.ts` — all named constants and default inputs

**Prerequisite:** Phase 3 must be merged to main. All engine modules from Phase 1-2 are available.

**Verify before starting:** `npx vitest run` passes, `npx tsc --noEmit` clean, `npm run build` succeeds.

---

## Task 1: Verdict Engine Types

**Files:**
- Modify: `src/engine/types.ts`

**What to do:**
Add the `VerdictResult` interface to `types.ts`. Fields:
- `recommendation` — which scenario is recommended, or `'none'` if all have dealbreakers
- `headline` — one-line summary (e.g., "Scenario A is the stronger choice")
- `reasoning` — array of 2-4 sentences explaining why, with dollar amounts
- `dealbreakers` — array of `{ scenario: string, reasons: string[] }` for eliminated scenarios
- `keyMetrics` — array of `{ label: string, baseline: string, scenarioA: string, scenarioB: string }` for side-by-side comparison

**Acceptance criteria:**
- TypeScript compiles clean
- No existing types modified

**Commit:** `feat(engine): add VerdictResult type`

---

## Task 2: Verdict Engine — Dealbreaker Detection (TDD)

**Files:**
- Create: `src/engine/verdict.ts`
- Create: `src/engine/__tests__/verdict.test.ts`

**What to do:**
Implement the first step of the verdict cascade: scanning each scenario's warnings and computed values for critical dealbreakers.

A scenario is eliminated if ANY of these are true:
- `upfrontCapital.surplus < 0` (can't afford it)
- `dtiResult.backEndDTI > DTI_HARD_MAX` (lender won't approve)
- Year 1 `monthlyCashFlowBestCase < 0` (bleeding money from day one)
- `monthlyReserveRunwayMonths < 3` (one emergency away from crisis)

Export a function that takes a `ScenarioOutput` and returns `{ isViable: boolean, reasons: string[] }`. The reasons should include the actual dollar amounts or percentages from the scenario (not generic messages).

**Test expectations:**
- Scenario with surplus of -$20,100 → not viable, reason mentions the shortfall amount
- Scenario with DTI of 0.48 → not viable, reason mentions 48%
- Scenario with negative month-1 cash flow → not viable, reason mentions the monthly loss
- Scenario with 2.1 months reserve runway → not viable, reason mentions months
- Scenario with multiple dealbreakers → all reasons listed
- Scenario with no dealbreakers → viable, empty reasons
- Use Preston's default inputs via `runModel()` to test against real model output

**Commit:** `feat(engine): add verdict dealbreaker detection + tests`

---

## Task 3: Verdict Engine — Comparison and Synthesis (TDD)

**Files:**
- Modify: `src/engine/verdict.ts`
- Modify: `src/engine/__tests__/verdict.test.ts`

**What to do:**
Implement the full `generateVerdict(model: ModelOutput, inputs: ScenarioInputs): VerdictResult` function. This uses dealbreaker detection from Task 2, then compares viable scenarios and synthesizes the recommendation.

**Decision logic after dealbreaker filtering:**
- If 0 scenarios viable → recommendation is `'none'`, headline says so, reasoning suggests what to change
- If 1 scenario viable → that's the recommendation by default, reasoning explains why others were eliminated
- If 2-3 scenarios viable → compare on: final net worth, IRA at age 65, year 1 monthly cash flow, warning severity count. The scenario that wins on the most important metrics gets recommended. Reasoning explains the tradeoffs with dollar amounts.

**Synthesis requirements:**
- The `headline` is one short sentence: "Scenario A is the stronger choice" / "Stay in your current home" / "None of these scenarios work with your current numbers"
- The `reasoning` array has 2-4 sentences. Each references specific dollar amounts from the model (net worth difference, IRA gap, monthly cash flow). No vague language — every claim has a number.
- The `keyMetrics` array shows 4-5 rows: "Net worth at year N", "IRA at age 65", "Monthly cash flow (Year 1)", "Upfront cash needed", "Reserve runway"
- Dollar amounts in reasoning should use the formatters from `src/utils/formatters.ts`

**Test expectations:**
- Preston defaults → verify recommendation makes sense for his situation (read CLAUDE.md "Project Context" to understand what the right answer should be)
- Conservative Couple inputs (from `integration-couple.test.ts`) → verify a different verdict
- All scenarios have dealbreakers → `recommendation: 'none'`, actionable headline
- Only baseline viable → `recommendation: 'baseline'`
- Two scenarios close in net worth but one has much worse cash flow → verify reasoning mentions the cash flow risk
- Verify `keyMetrics` values match the actual model output numbers
- Verify reasoning strings contain actual dollar amounts, not placeholders

**Commit:** `feat(engine): add verdict comparison and synthesis + tests`

---

## Task 4: Verdict UI Component

**Files:**
- Create: `src/components/results/VerdictSection.tsx`
- Modify: `src/components/results/ResultsSections.tsx` (or wherever results are assembled)

**What to do:**
Build a `VerdictSection` component that renders the `VerdictResult`. It should be the **first thing** in the results view — above all charts and tables.

**Requirements:**
- Headline rendered prominently (large text, bold)
- Reasoning rendered as readable paragraphs
- Dealbreakers rendered with clear visual severity (red/destructive styling for eliminated scenarios)
- Key metrics rendered as a compact comparison table (3 columns: Baseline / A / B)
- If recommendation is `'none'`, the entire section should have a warning/destructive visual treatment
- Component consumes `VerdictResult` from the model context (same pattern as other results components)
- Responsive: readable at 375px without horizontal overflow

**Testing:**
- Smoke test: renders without crashing given a valid VerdictResult
- Renders headline, reasoning, and metrics
- Renders dealbreakers when present
- Verify accessibility: heading hierarchy, no missing alt text, warning states announced

**Commit:** `feat(ui): add verdict section to results view`

---

## Task 5: Sensitivity Engine Types

**Files:**
- Modify: `src/engine/types.ts`

**What to do:**
Add the `BreakevenResult` interface to `types.ts`. Fields:
- `inputName` — human-readable name (e.g., "Home appreciation rate")
- `currentValue` — the user's current input value
- `breakevenValue` — value at which the verdict would change
- `direction` — `'below'` or `'above'` (which direction breaks it)
- `consequence` — what happens at the breakeven (e.g., "Scenario B overtakes in net worth")
- `margin` — `'comfortable'` | `'thin'` | `'at_risk'`

Also add a `SensitivityResult` type that wraps an array of `BreakevenResult` plus a summary field.

**Commit:** `feat(engine): add sensitivity analysis types`

---

## Task 6: Sensitivity Engine — Breakeven Analysis (TDD)

**Files:**
- Create: `src/engine/sensitivity.ts`
- Create: `src/engine/__tests__/sensitivity.test.ts`

**What to do:**
Implement `analyzeBreakevens(inputs: ScenarioInputs, verdict: VerdictResult): BreakevenResult[]`.

For each of 5 key variables (appreciation rate, monthly rent, new home interest rate, vacancy rate, income), search for the value that would flip the verdict:
- Clone the inputs, override the variable being tested
- Run `generateVerdict(runModel(modifiedInputs), modifiedInputs)`
- Binary search or step through reasonable increments to find where `recommendation` changes
- Record the breakeven value, direction, consequence, and margin

**Variables to test and their search ranges:**
1. **Home appreciation rate** — search from current value down to -5% (or up if testing upside)
2. **Monthly rent** — search from current value down to $0
3. **New home interest rate** — search from current value up to 15%
4. **Vacancy rate** — search from current value up to 50%
5. **Income** — search from current value down to $0

**Margin classification:**
- `comfortable` — current value has more than 2x buffer to breakeven
- `thin` — 1-2x buffer
- `at_risk` — less than 1x buffer
- The "buffer" metric varies per variable. For rates, use absolute difference. For dollar amounts, use percentage difference. The implementing engineer should define sensible thresholds per variable and comment the reasoning.

**Edge cases:**
- If verdict recommendation is `'none'` → return empty array (nothing to break)
- If no breakeven found within the search range → return a result with `breakevenValue` indicating the recommendation holds across all tested values, and `margin: 'comfortable'`

**Performance requirement:** Total analysis must complete in under 2 seconds with default inputs. The engine runs in <10ms per call, so 50-100 iterations should be well within budget.

**Test expectations:**
- Preston defaults → verify at least 2-3 variables produce meaningful breakevens
- Verify a known breakeven: manually compute (or find by experimentation) the appreciation rate that flips the verdict, then assert the function finds approximately the same value
- Verdict is 'none' → returns empty array
- Variable where recommendation holds across entire range → `margin: 'comfortable'`, consequence indicates stability
- Verify margin classification: construct an input where the current value is very close to breakeven → `'at_risk'`

**Commit:** `feat(engine): add breakeven sensitivity analysis + tests`

---

## Task 7: Sensitivity UI Component

**Files:**
- Create: `src/components/results/SensitivitySection.tsx`
- Modify: `src/components/results/ResultsSections.tsx`

**What to do:**
Build a `SensitivitySection` component that renders the breakeven analysis results. Placed after the verdict section.

**Requirements:**
- Section title: "How robust is this recommendation?" (or similar)
- Each `BreakevenResult` rendered as a row showing:
  - Variable name and current value
  - Breakeven threshold and what happens
  - Margin indicator with visual treatment (green/comfortable, yellow/thin, red/at_risk)
- If a variable has no breakeven (holds across all values), show it as a confidence signal: "Holds regardless of [variable]"
- If the verdict is 'none' (no recommendation), this section should either be hidden or show a message like "No recommendation to analyze"
- **Lazy computation:** The breakeven analysis should only run when this section is visible (in viewport or expanded), not on every input change. Use an intersection observer, a "Show Analysis" button, or similar lazy pattern.

**Testing:**
- Smoke test: renders without crashing
- Renders all breakeven results with correct labels
- Margin indicators have correct visual treatment
- Empty results (verdict is 'none') shows appropriate message
- Responsive at 375px

**Commit:** `feat(ui): add sensitivity analysis section to results view`

---

## Task 8: Mobile Refinements — Testing Pass

**Files:**
- Various component files — fixes as discovered

**What to do:**
Open the app at 375px viewport width in browser dev tools. Walk through every screen using the checklist below. Fix issues as found. Each fix is its own commit.

**Input checklist:**
- [ ] All touch targets ≥ 44px
- [ ] Number inputs trigger correct on-screen keyboard
- [ ] PercentInput and CurrencyInput decimal entry works
- [ ] Accordion sections open/close smoothly, no overflow
- [ ] Advanced toggles discoverable and tappable
- [ ] Select dropdown tappable and readable
- [ ] Labels not truncated or overlapping

**Results checklist:**
- [ ] Charts render without clipping at 375px
- [ ] Chart legends readable, not overlapping
- [ ] Cash flow cards don't overflow
- [ ] Warning cards readable with long text
- [ ] Dollar amounts don't wrap mid-number
- [ ] Verdict section readable with long text
- [ ] Sensitivity section readable

**Navigation checklist:**
- [ ] Tab switching responsive
- [ ] Scrolling smooth
- [ ] No content hidden behind headers/nav
- [ ] No horizontal scroll on any screen

**General checklist:**
- [ ] Font sizes ≥ 14px for body text
- [ ] Focus management stable
- [ ] Loading state visible during recomputation

**Commit pattern:** One commit per fix, descriptive message: `fix(ui): increase touch target on accordion trigger` / `fix(ui): prevent chart legend overlap at 375px`

---

## Task 9: Mobile E2E Test

**Files:**
- Create: `e2e/mobile.spec.ts` (or appropriate Playwright test location)

**What to do:**
Write a Playwright E2E test at 375px viewport width that verifies the app is usable on mobile.

**Test scenarios:**
1. Navigate to the app at 375×812 viewport
2. Verify input sections are visible and interactable
3. Switch to results tab
4. Verify verdict section renders with non-empty text
5. Verify at least one chart renders
6. Verify warnings section renders
7. Assert no horizontal overflow: `document.body.scrollWidth <= window.innerWidth`

**Prerequisites:**
- Playwright must be installed and configured. If not already set up, install it as part of this task.
- The app must be running (use `npm run dev` or Playwright's `webServer` config).

**Commit:** `test(e2e): add mobile viewport smoke test`

---

## Phase 4 Completion Criteria

- [ ] `generateVerdict()` produces correct recommendations for Preston defaults and Conservative Couple inputs
- [ ] `analyzeBreakevens()` finds meaningful breakevens for at least 3 variables
- [ ] Verdict section is the first thing visible in results
- [ ] Sensitivity section renders breakevens with margin indicators
- [ ] All engine tests pass: `npx vitest run`
- [ ] TypeScript compiles clean: `npx tsc --noEmit`
- [ ] ESLint passes: `npx eslint src/`
- [ ] Build succeeds: `npm run build`
- [ ] No horizontal overflow at 375px viewport
- [ ] Playwright mobile test passes
- [ ] All commits follow conventional commit format
