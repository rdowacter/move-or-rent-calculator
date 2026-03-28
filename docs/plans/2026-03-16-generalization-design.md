# Phase 1: Generalization Design

## Goal

Transform the tool from a hardcoded Kyle/Austin/Preston scenario analyzer into a generic sell-vs-rent decision engine any US homeowner can use.

## Scope

Four workstreams, done in order:

### 1. De-Personalize UI Labels

Remove all Kyle, Austin, and Preston references from the UI. The engine layer is already 100% generic — this is purely a component-layer change.

**Files affected (~10 components):**
- `InputAccordion.tsx` — section titles
- `CurrentHomeSection.tsx` — field descriptions (5 Kyle refs)
- `NewHomeSection.tsx` — field descriptions (2 Austin refs)
- `CommuteSection.tsx` — field descriptions (2 Kyle/Austin refs)
- `AboutYouSection.tsx` — example text ("0% for Texas residents")
- `ExecutiveSummary.tsx` — hardcoded scenario descriptions
- `MonthlyCashFlow.tsx` — "Housing (Austin)" / "Rental Property (Kyle)" headers
- `YearByYearTable.tsx` — "Kyle Equity" / "Austin Equity" columns (6 occurrences)
- Chart legend labels if they reference city names

**Approach:** Replace city-specific text with generic equivalents ("Current Home", "New Home") as an interim step. Workstream 3 makes these dynamic.

### 2. Blank Personal Fields + Results Gating

Remove default values for all personal/financial inputs. Users must enter their own numbers. Gate results behind required field validation.

**Default values removed (start blank/empty):**
- Age, annual income, filing status, monthly living expenses, current savings
- IRA balance, IRA type, withdrawal amount, contributions
- Home value, mortgage balance, interest rate, remaining term
- Expected monthly rent, purchase price, down payment percentages
- Commute distance, tolls, time saved

**Default values kept (structural assumptions users likely won't change):**
- Tax brackets, standard deductions (IRS 2024 data)
- Depreciation: 27.5 years, 85% depreciable basis
- Selling costs: 7%
- Vacancy rate: 8%
- Appreciation rates: 3%
- Salary growth: 3%
- Insurance/property tax escalation rates
- IRS mileage rate
- PMI rate, DTI thresholds, lender rental income credit (75%)

**Results gating:**
- Results panel shows "Fill in the highlighted fields to see your analysis" until all required fields are populated
- Progress indicator: "X of Y required fields completed"
- On mobile, Results tab shows same message with button to switch to Inputs tab
- Once all required fields filled, results calculate immediately (existing 150ms debounce)

**Required fields (minimum to run the model):**
- About You: age, annual income, filing status, monthly living expenses, current savings
- Retirement: IRA balance (can be $0), IRA type
- Current Home: home value, mortgage balance, interest rate, remaining term, expected monthly rent, property tax rate, annual insurance
- New Home: purchase price, interest rate, down payment % (A and B), property tax rate, annual insurance
- Commute: current commute distance (can be 0)

**Schema/validation changes:**
- Zod schema: change personal fields from `.default(value)` to `.optional()` or make them required without defaults
- react-hook-form: add required field indicators (asterisk or similar)
- `useScenarioModel` hook: only run engine when all required fields pass validation

### 3. User-Configurable Home Names

Two new text inputs that propagate through the entire UI.

**New fields (in "About You" section or a lightweight header):**
- "What do you call your current home?" — placeholder: "e.g., Denver Condo, Our Ranch House", default: "Current Home"
- "What do you call the home you're buying?" — placeholder: "e.g., Austin House, The New Place", default: "New Home"

**Propagation (via form state / useWatch):**
- Accordion section titles: "{currentHomeName}" / "{newHomeName}"
- ExecutiveSummary scenario descriptions (template strings):
  - Baseline: "Stay in {currentHome}, keep the IRA, keep commuting"
  - Scenario A: "Sell {currentHome}, buy {newHome}, keep IRA intact + contributing"
  - Scenario B: "Keep {currentHome} as rental, withdraw IRA for down payment, buy {newHome}"
- MonthlyCashFlow headers: "Housing ({newHome})" / "Rental Property ({currentHome})"
- YearByYearTable columns: "{currentHome} Equity" / "{newHome} Equity"
- Chart legends
- Stress test descriptions

**These are NOT required fields** — they default to "Current Home" / "New Home" if left blank.

### 4. Time Horizon Slider

Convert the existing time horizon text input to a slider.

- Range: 5 to 30 years
- Step: 1 year
- Shows current value label (e.g., "20 years")
- Updates all projections instantly (existing reactive behavior)
- shadcn/ui Slider component

## What's NOT in Scope

- Branding / renaming (deferred — easy find-and-replace later)
- Shareable URL / short link sharing (deferred — needs backend decision)
- Mobile stepper UX (current tab-based layout is sufficient)
- Landing page
- Email capture
- Scenario templates
- State tax support beyond the existing 0% default

## Architecture Impact

- **Engine layer:** No changes. Already 100% generic.
- **Zod schema:** Add 2 string fields (home names), remove defaults from personal fields, adjust validation
- **Hooks:** `useScenarioModel` gains a validation gate before running the engine
- **Components:** String replacements + threading home names through ~10 components
- **Tests:** Update component tests that reference Kyle/Austin. Engine tests unchanged. Add tests for results gating logic.

## Phasing (Implementation Order)

1. De-personalize labels (safe, no behavioral change)
2. Add home name fields + propagate through components
3. Remove personal defaults + add results gating + progress indicator
4. Time horizon slider

This order lets us ship a working generic tool after step 1, then layer improvements. Each step is independently committable and testable.
