# Phase 3: Full Interactive UI — Design Document

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Phase 2 (complete financial engine with `runModel()` producing `ModelOutput`)

**Goal:** Build the complete interactive UI so a user can enter financial inputs, see all three scenarios compared across net worth, IRA trajectory, cash flow, capital requirements, and risk warnings — with instant updates on every input change.

**Reference docs:**
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `docs/plans/2026-03-14-phase2-complete-engine.md` — engine API this UI consumes
- `CLAUDE.md` — coding standards, domain expertise, financial logic reminders

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Chart library | Recharts | Smaller bundle (~45kb), declarative JSX API, adequate mobile touch support, good responsive containers |
| Mobile layout | Tabbed (Inputs / Results) | Avoids tedious scrolling past 5 accordion sections to reach results during iterative tweaking |
| Desktop layout | Two-column (inputs left, results right) | Side-by-side enables instant feedback loop: tweak input, see result |
| Input layout | Accordion on both mobile and desktop | No stepper — pre-populated with defaults, user jumps right into tweaking |
| Computation strategy | Single `useScenarioModel` hook calling `runModel()` | Engine runs in microseconds; layered memoization adds complexity for zero perceptible benefit |
| State persistence | localStorage (most recent inputs) | Prevents losing work on refresh |
| Print/export | Cut from scope | Not needed |

---

## Component Architecture

```
<App>
  <FormProvider>                      ← react-hook-form context, zod validation
    <ScenarioModelProvider>           ← watches form, runs engine, provides ModelOutput
      <DesktopLayout>                 ← ≥768px: CSS grid, two columns
        <InputPanel>
          <InputAccordion />
        </InputPanel>
        <ResultsPanel>
          <ResultsSections />
        </ResultsPanel>
      </DesktopLayout>

      <MobileLayout>                  ← <768px: full-width, tabbed
        <TabBar tabs={["Inputs", "Results"]} />
        <InputTab>
          <InputAccordion />          ← same component as desktop
        </InputTab>
        <ResultsTab>
          <ResultsSections />         ← same components as desktop
        </ResultsTab>
      </MobileLayout>
    </ScenarioModelProvider>
  </FormProvider>
</App>
```

- **One `InputAccordion`** component used in both layouts — layout-agnostic
- **Same results components** in both layouts — just rendered in different containers
- **Layout switching** via `useMediaQuery(768)` or Tailwind responsive classes (`hidden md:block` / `md:hidden`)
- Shared form state means no data synchronization between layouts

---

## Data Flow & State Management

```
Zod schema (validation + type inference)
  → react-hook-form FormProvider (manages ~60 inputs, debounced)
    → useWatch() in ScenarioModelProvider
      → debounce 150ms
        → runModel(inputs) → ModelOutput
          → React context: { modelOutput, isComputing }
            → Results components consume via useContext
```

### ScenarioModelProvider

Single React context provider that:
1. Subscribes to form values via `useWatch()`
2. Debounces changes (150ms) to avoid recomputing on every keystroke
3. Calls `runModel(inputs)` from the engine
4. Exposes `{ modelOutput: ModelOutput, isComputing: boolean }` via context
5. `isComputing` allows results to show a subtle loading state during debounce

### Form Initialization & Persistence

```
On mount:
  1. Check localStorage for saved inputs
  2. If found and passes zod validation → use as form defaults
  3. If not found or invalid → use DEFAULT_*_INPUTS from constants.ts

On input change (debounced 500ms):
  → serialize full form state to localStorage

"Reset to Defaults" button:
  → clear localStorage
  → reset form to DEFAULT_*_INPUTS
```

### Zod Schema

Mirrors the existing TypeScript interfaces in `types.ts`, organized by input section. Each field gets min/max constraints. The schema is the single source of truth for both runtime validation and TypeScript types.

```typescript
const scenarioInputsSchema = z.object({
  personal: z.object({ ... }),
  retirement: z.object({ ... }),
  currentHome: z.object({ ... }),
  newHome: z.object({ ... }),
  commute: z.object({ ... }),
  costs: z.object({ ... }),
  projection: z.object({ ... }),
})
```

Validation errors display inline below the relevant input field.

---

## Input Sections

Five accordion sections with progressive disclosure (primary fields always visible, advanced fields behind a toggle).

### About You
| Field | Type | Primary | Default |
|---|---|---|---|
| Age | number | yes | 37 |
| Annual gross income | currency | yes | $100,000 |
| Filing status | select | yes | Single |
| Monthly living expenses | currency | yes | $3,000 |
| Liquid savings | currency | yes | $0 |
| Salary growth rate | percent | advanced | 3% |
| Monthly debt payments | currency | advanced | $0 |
| State income tax rate | percent | advanced | 0% |

### Retirement
| Field | Type | Primary | Default |
|---|---|---|---|
| IRA balance | currency | yes | $30,000 |
| IRA type | select | yes | Traditional |
| Annual contribution (Scenario A) | currency | yes | $7,000 |
| Annual contribution (Scenario B) | currency | yes | $0 |
| Expected annual return | percent | advanced | 7% |
| Employer match | toggle + percent | advanced | No |
| Other retirement savings | toggle + currency | advanced | No |

### Current Home (Kyle)
| Field | Type | Primary | Default |
|---|---|---|---|
| Home value | currency | yes | $270,000 |
| Mortgage balance | currency | yes | $199,000 |
| Interest rate | percent | yes | 2% |
| Years into loan | number | yes | 5 |
| Expected monthly rent | currency | yes | $2,000 |
| Annual property tax rate | percent | advanced | 2.15% |
| Annual insurance | currency | advanced | $2,400 |
| Landlord insurance premium increase | currency | advanced | $600 |
| Maintenance reserve rate | percent | advanced | 0.75% |
| Monthly HOA | currency | advanced | $0 |
| Vacancy rate | percent | advanced | 8% |
| Management fee rate | percent | advanced | 0% |
| Annual appreciation rate | percent | advanced | 3% |
| Selling costs rate | percent | advanced | 6% |
| Annual rent growth rate | percent | advanced | 3% |
| Turnover frequency (years) | number | advanced | 2.5 |
| Cost per turnover | currency | advanced | $3,500 |

### New Home (Austin)
| Field | Type | Primary | Default |
|---|---|---|---|
| Purchase price | currency | yes | $300,000 |
| Interest rate | percent | yes | 6% |
| Down payment % (Scenario A) | percent | yes | 20% |
| Down payment % (Scenario B) | percent | yes | 10% |
| Loan term | select | advanced | 30 years |
| Annual PMI rate | percent | advanced | 0.7% |
| Annual property tax rate | percent | advanced | 2% |
| Annual insurance | currency | advanced | $2,400 |
| Closing costs rate | percent | advanced | 2.5% |
| Annual appreciation rate | percent | advanced | 3.5% |

### Commute
| Field | Type | Primary | Default |
|---|---|---|---|
| Current round-trip miles | number | yes | 44 |
| Daily time saved (hours) | number | yes | 2.5 |
| Current monthly tolls | currency | yes | $500 |
| Work days per year | number | advanced | 250 |
| IRS mileage rate | currency | advanced | $0.725 |
| New round-trip miles | number | advanced | 10 |
| New monthly tolls | currency | advanced | $0 |
| Landlord hours/month | number | advanced | 5 |

### Projection (not its own accordion section — render as controls near the results)
| Field | Type | Default |
|---|---|---|
| Time horizon (years) | slider or toggle (5/10/15/20) | 20 |
| Planned rental exit year | number | 20 |

---

## Results Sections

Six sections, rendered in priority order. All consume `ModelOutput` from context.

### 1. Net Worth Projection Chart
- Recharts `LineChart`, 3 lines (Baseline, Scenario A, Scenario B)
- X-axis: years (0 → time horizon). Y-axis: net worth ($)
- Tooltip on hover/tap shows all 3 values
- Time horizon control (5/10/15/20 years) displayed above the chart — modifies the form's `timeHorizonYears` value, triggering engine recomputation
- Color-coded legend with scenario labels

### 2. IRA Trajectory Chart
- Recharts `LineChart`, 2 lines (Scenario A, Scenario B)
- Baseline omitted (identical to Scenario A)
- Callout below chart showing the dollar gap at end of time horizon (e.g., "Scenario A IRA is $187,000 higher at year 20")

### 3. Monthly Cash Flow
- Side-by-side comparison cards for all 3 scenarios
- Breakdown: gross income, taxes, housing costs (PITI + PMI), living expenses, debt payments, rental cash flow (Scenario B only), net monthly cash flow
- Scenario B shows both best-case and worst-case columns
- Negative cash flow highlighted in red

### 4. Upfront Capital Requirements
- Per-scenario breakdown: down payment, closing costs, moving costs, funding sources (home sale proceeds / IRA withdrawal net), surplus or shortfall
- Baseline: "No capital event"
- Shortfall displayed as a critical alert

### 5. Reserve Runway
- Months of reserves post-closing per scenario
- Scenario B stress test results: vacancy + maintenance shock, income disruption, market downturn
- Displayed as metric cards with clear labels, not charts (these are single numbers)

### 6. Warnings List
- Sorted by severity: critical → warning → info
- Each warning shows: category icon, message text, dollar impact (where applicable)
- Driven by `Warning[]` from each `ScenarioOutput`
- Grouped by scenario or interleaved — start grouped, iterate based on clarity

---

## Responsive Layout

### Desktop (≥768px)
- CSS grid: two columns, ~40% inputs / ~60% results
- Both columns scroll independently
- Input accordion and results visible simultaneously
- Change an input → results update in the adjacent column

### Mobile (<768px)
- Full-width, single column
- Fixed tab bar at top: "Inputs" | "Results"
- Each tab scrolls independently
- Subtle indicator on "Results" tab when inputs change (dot badge or similar)
- Same accordion component, same results components — just in different containers

### Shared
- Single breakpoint at 768px. Tablet gets desktop layout.
- Touch targets ≥44px on all interactive elements
- Currency/percentage inputs use `inputmode="decimal"` for mobile numeric keyboard
- Accordion sections expand/collapse with smooth animation (shadcn/ui Accordion)

---

## UI Components to Build

### Shared / Atomic
- `CurrencyInput` — number input with `$` prefix, comma formatting
- `PercentInput` — number input with `%` suffix
- `FormField` — label + input + error message wrapper (wraps react-hook-form's `Controller`)
- `AdvancedToggle` — "Advanced" expand/collapse per accordion section
- `MetricCard` — label + value + optional subtitle (for reserve runway, upfront capital)
- `ScenarioComparisonCard` — side-by-side values for 3 scenarios

### Layout
- `DesktopLayout` — two-column grid
- `MobileLayout` — tabbed full-width
- `InputAccordion` — 5 collapsible sections using shadcn/ui Accordion
- `InputPanel` — scrollable container for accordion
- `ResultsPanel` — scrollable container for results sections
- `TabBar` — mobile tab switcher

### Results
- `NetWorthChart` — Recharts line chart, 3 scenarios
- `IRATrajectoryChart` — Recharts line chart, 2 scenarios + gap callout
- `MonthlyCashFlowComparison` — 3 scenario cards with line-item breakdown
- `UpfrontCapitalComparison` — 3 scenario cards with surplus/shortfall
- `ReserveRunway` — metric cards + stress test results
- `WarningsList` — severity-sorted warning display

### Utility
- `src/utils/formatters.ts` — `formatCurrency()`, `formatPercent()`, `formatNumber()`, `formatYears()`

---

## Accessibility

- All inputs have associated `<label>` elements (via FormField wrapper)
- Charts have `aria-label` descriptions summarizing the data
- Color is never the only indicator — pair with text labels (e.g., red + "Shortfall: -$4,200")
- Warning severity uses icons + text, not just color
- Keyboard navigation works for accordion expand/collapse, tab switching, all inputs
- `inputmode="decimal"` on numeric fields for mobile accessibility

---

## Testing Strategy (Phase 3)

### Vitest + React Testing Library
- **Smoke tests:** Each input section renders without crashing
- **Form integration:** Changing an input value triggers `runModel()` and updates results
- **Validation:** Invalid inputs show error messages, valid inputs clear errors
- **Warnings:** Setting DTI > 43% renders critical warning; setting it below clears it
- **Responsive:** Components render in both layout contexts
- **localStorage:** Values persist across unmount/remount, "Reset to Defaults" clears them

### Not in Phase 3
- E2E tests (Playwright) — defer to Phase 4 or a follow-up
- Visual regression tests — manual QA during development

---

## What's Explicitly Out of Scope

- Print/export functionality
- URL state / shareable configurations
- Verdict engine (plain-language synthesis)
- Sensitivity analysis / what-if tables
- E2E tests
- Multiple saved configurations
- Stepper / guided onboarding flow
