# Architecture Design: Move or Rent Calculator

**Date:** 2026-03-14
**Status:** Approved

## Summary

A mobile-first web app that compares three financial scenarios for someone deciding whether to sell their current home or keep it as a rental when buying a new one. The tool shows net worth projections, IRA impact, monthly cash flow reality, risk flags, and a plain-language verdict — so the user sees the complete truth, not just the napkin math.

Three scenarios:
- **Baseline:** Stay in current home, keep IRA, keep commuting
- **Scenario A:** Sell current home, buy new home, keep IRA intact + contributing
- **Scenario B:** Keep current home as rental, withdraw IRA for down payment, buy new home

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Build phases | 4 phases (Foundation → Complete Engine → Full UI → Verdict + Polish) | Merged PM's Layers 2+3 — net worth chart without cash flow reality check is actively misleading |
| Computation strategy | Layered selective memoization (Approach B) | Each engine module memoized independently; changing commute inputs doesn't recompute amortization. Better for mobile performance and debugging. |
| State management | react-hook-form + zod | Purpose-built for 60+ input form. Handles validation, debouncing, touched/dirty states. Replaces hand-rolled useReducer. |
| Component library | shadcn/ui (Radix + Tailwind) | Copy-paste components, not a dependency. Gives us Accordion, Stepper patterns, Slider, Cards, Alerts — all Tailwind-native. |
| Chart library | Evaluate Recharts vs Nivo in Phase 1 | Pick based on mobile touch quality, 375px rendering, bundle size, API ergonomics |
| Mobile UX | Stepper (one input section per screen) | Better for thumb-friendly mobile interaction than scrolling through 60 fields |
| Desktop UX | Two-column: accordion inputs (left) + live results (right) | All sections visible, results update live as inputs change |
| Input complexity | Progressive disclosure | ~15-20 primary inputs visible, advanced fields collapsed under "Advanced" toggle per section |
| Deployment | Vercel, auto-deploy from main | Static SPA, no backend, no env vars |
| Audience | General-purpose, defaulting to Preston's numbers | All inputs parameterized. Texas-specific defaults but works for any state. |

## Phase Structure

### Phase 1: Foundation
Scaffolding + types + core financial primitives.

- Project setup: Vite, TypeScript strict, Vitest, Tailwind, shadcn/ui, ESLint/Prettier, react-hook-form, zod
- All TypeScript interfaces (ScenarioInputs, ScenarioYearResult, ScenarioOutput, ModelOutput)
- All named constants with IRS citations
- Independent pure math modules (TDD):
  - `mortgage.ts` — amortization, P&I, remaining balance, original loan recovery
  - `tax.ts` — federal brackets, marginal/effective rates, IRA withdrawal tax+penalty
  - `ira.ts` — growth projections, contribution compounding, withdrawal net proceeds
  - `appreciation.ts` — home value over time, equity
  - `commute.ts` — cost/time savings

**Done when:** Every function has tests with manually computed expected values and edge cases. TypeScript compiles clean in strict mode.

### Phase 2: Complete Financial Engine
Composite domain logic + scenario orchestrator.

- `rental.ts` — cash flow, NOI, depreciation, Schedule E, passive activity loss rules with AGI phase-out
- `capital.ts` — upfront cash requirements per scenario, post-closing reserves, runway
- `dti.ts` — front-end and back-end DTI with 75% rental income credit
- `scenarios.ts` — year-by-year orchestrator for all 3 scenarios
- Integration tests: full 20-year scenario runs validated against hand-built spreadsheet

**Done when:** Running `scenarios.ts` with default inputs produces year-by-year outputs for all 3 scenarios matching manual calculations. Exit taxes (depreciation recapture, capital gains, lost Section 121 exclusion) accounted for.

### Phase 3: Full Interactive UI
Everything the user sees, all at once.

- Input panel: 5 sections (About You, Retirement, Current Home, New Home, Commute)
- Mobile stepper + desktop accordion
- Progressive disclosure with "Advanced" toggles
- Net worth projection chart (3 lines, time horizon toggle)
- IRA trajectory comparison (2 lines, dollar gap callout)
- Monthly cash flow (best case + worst case for Scenario B)
- Upfront capital requirements
- Reserve gap / runway / stress tests
- Contextual warning system (DTI, liquidity, retirement, tax, landlord, market)
- Debounced inputs, memoized computations

**Done when:** User can enter numbers, see all scenarios compared across all metrics, and every warning fires correctly based on inputs. Slider changes propagate instantly on mobile.

### Phase 4: Verdict + Polish
Dynamic recommendations + production readiness.

In priority order:
1. Verdict engine — plain-language synthesis adapting to user's numbers
2. Sensitivity analysis — what-if tables for appreciation, rent, vacancy
3. Print/export summary — clean view for taking to a CPA
4. URL state — shareable configurations via query params
5. Mobile refinements

## Engine Architecture

### Module Dependency Graph

```
Independent (no engine dependencies):
  mortgage.ts
  tax.ts
  ira.ts
  appreciation.ts
  commute.ts

Composite (depend on independent modules):
  rental.ts    → mortgage, tax, appreciation
  capital.ts   → mortgage, tax, ira
  dti.ts       → mortgage

Orchestrator:
  scenarios.ts → all modules
```

### Data Flow with Selective Memoization

```
zod schema (defines valid inputs + TypeScript types)
  → react-hook-form (manages form state, validation)
    → useWatch() provides current values
      ├─ useMemo(mortgageCalcs,     [mortgage inputs])
      ├─ useMemo(taxCalcs,          [income, filing inputs])
      ├─ useMemo(iraCalcs,          [ira inputs])
      ├─ useMemo(appreciationCalcs, [home value inputs])
      ├─ useMemo(commuteCalcs,      [commute inputs])
      │
      ├─ useMemo(rentalCalcs,       [mortgageCalcs, taxCalcs, rental inputs])
      ├─ useMemo(capitalCalcs,      [mortgageCalcs, taxCalcs, iraCalcs, ...])
      ├─ useMemo(dtiCalcs,          [mortgageCalcs, income inputs])
      │
      └─ useMemo(scenarioResults,   [all above calcs, time horizon])
           │
           └─ Components render from scenarioResults
```

Engine functions remain pure. Memoization lives in the hooks layer. Engine is testable in plain Vitest with zero React.

### Key Types

```typescript
ScenarioInputs      // All ~60 user inputs, fully typed, generated from zod schema
ScenarioYearResult  // One year of one scenario: net worth, cash flow, IRA, equity, taxes
ScenarioOutput      // Full projection: yearResults[], upfrontCapital, dti, warnings[]
ModelOutput         // { baseline, scenarioA, scenarioB } — the complete model
Warning             // { category, severity, message, dollarImpact }
```

## UI Architecture

### Component Hierarchy

```
<App>
  <FormProvider>               ← react-hook-form context
    <ComputationProvider>      ← memoized engine results context
      <DesktopLayout>          ← ≥768px, two-column
        <InputAccordion />
        <ResultsPanel />
      </DesktopLayout>
      <MobileLayout>           ← <768px, stepper
        <InputStepper />
        <ResultsView />
      </MobileLayout>
    </ComputationProvider>
  </FormProvider>
</App>
```

### Input Sections

| Section | Primary Fields | Advanced Fields |
|---|---|---|
| About You | Age, income, filing status, living expenses, liquid savings | Salary growth, debts, state tax rate |
| Retirement | IRA balance, type, contributions (A vs B) | Expected return, employer match, other retirement |
| Current Home | Value, mortgage balance, rate, years in, expected rent | Taxes, insurance, maintenance, vacancy, HOA, appreciation, turnover, management fee |
| New Home | Price, interest rate, down payment % (A vs B) | PMI rate, taxes, insurance, closing costs, appreciation |
| Commute | Current miles, tolls, time saved | Work days/year, new commute miles/tolls, landlord hours |

### Results Sections (single scrollable view)

1. Net Worth Projection — 3-line chart, time horizon toggle
2. IRA Trajectory — 2-line chart, dollar gap callout
3. Monthly Cash Flow — side-by-side budgets, worst case for Scenario B
4. Upfront Capital — surplus/shortfall per scenario
5. Reserve Runway — months of coverage, stress test results
6. Risk Flags — contextual, input-driven warnings
7. Verdict (Phase 4) — dynamic plain-language synthesis

## Testing Strategy

### Testing Pyramid

1. **Vitest unit tests** — engine math is correct
   - Every function: happy path with manual math in comments, edge cases, bracket boundaries
   - Golden run: default Preston inputs → expected outputs snapshot
   - 100% function coverage for engine/

2. **Vitest + React Testing Library** — UI components respond correctly
   - Smoke tests per section
   - Input changes propagate to results
   - Warnings appear/disappear based on input thresholds
   - Form validation rejects invalid inputs

3. **Playwright E2E** — displayed numbers match engine outputs
   - Golden path: default inputs → verify key numbers on screen
   - Input change: modify rent, verify updated values display
   - Warning triggers: set DTI > 43%, verify warning appears
   - Mobile stepper: navigate all sections, verify results render

## Deployment

- **Repo:** github.com/rdowacter/move-or-rent-calculator
- **Hosting:** Vercel, auto-deploy from main
- **Build:** `npm run test && npm run build` — tests fail = deploy fails
- **Branch strategy:** main is production, feature branches per phase

## What We Explicitly Cut

- **Save/compare scenarios** — URL state handles this
- **Employer 401k match deep modeling** — input exists, but kept simple (add match dollars to separate balance)
- **Visual/screenshot tests** — manual QA during development
- **Web Worker computation** — overengineering for sub-10ms calculations
- **Backend/auth/database** — purely client-side static SPA
