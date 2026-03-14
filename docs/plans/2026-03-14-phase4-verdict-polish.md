# Phase 4: Verdict + Polish — Design Document

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Phase 3 (complete interactive UI)

**Goal:** Add a plain-language verdict that tells the user what to do and why, sensitivity analysis that shows what would have to go wrong, and mobile polish so the tool works well on phones.

**Deliverables (in priority order):**
1. Verdict engine — risk-gated recommendation with dollar reasoning
2. Sensitivity analysis — breakeven thresholds ("what breaks this?")
3. Mobile refinements — testing pass and fixes at 375px

**Explicitly cut:**
- Print/export summary — not needed for the immediate decision
- URL state — too heavy for current needs

**Reference docs:**
- `docs/plans/2026-03-14-architecture-design.md` — approved architecture
- `CLAUDE.md` — coding standards, financial logic reminders, domain expertise

---

## 1. Verdict Engine

### Purpose

Evaluate all three scenarios and produce a structured, risk-gated recommendation in plain English. This is the most important thing the user sees — it answers "what should I do?"

### Architecture

A pure function in the engine layer: `generateVerdict(model: ModelOutput, inputs: ScenarioInputs): VerdictResult`. No LLM, no API, no React. Deterministic rules that produce the same output for the same inputs.

### Decision Cascade

The verdict follows a strict priority order:

**Step 1: Dealbreaker scan.** Check each scenario for critical-severity warnings:
- Upfront capital shortfall (surplus < 0)
- DTI exceeds QM hard maximum (> 43%)
- Negative monthly cash flow from day one
- Reserve runway < 3 months
- Stress test failure (vacancy + maintenance exhausts reserves immediately)

Any scenario with a dealbreaker is eliminated from recommendation. The user sees a clear explanation of why: "Scenario B is not viable — you're $20,100 short on closing costs and your DTI of 48% exceeds lending thresholds."

If ALL scenarios have dealbreakers, the verdict says so: "None of these scenarios are financially viable with your current numbers. You need to [increase savings / reduce purchase price / increase income] before proceeding."

**Step 2: Viability comparison.** Of the surviving scenarios, compare on the metrics that drive the decision:
- Final net worth at time horizon (the wealth question)
- IRA balance at age 65 (the retirement question)
- Year 1 monthly cash flow best case (the affordability question)
- Total warning count weighted by severity (the risk question)

**Step 3: Verdict synthesis.** Assemble template-driven prose from ~15-20 sentence fragments that plug in actual dollar amounts from the model. The verdict is not a single hardcoded string — it's constructed from the comparison results.

Example outputs:

> "**Scenario A is the stronger choice.** It builds **$187,000 more net worth** over 20 years and preserves your retirement savings ($412,000 vs $0 at age 65). Monthly cash flow is tight but positive at $340/mo. Scenario B is not viable — you're $20,100 short on upfront capital."

> "**Stay in your current home (Baseline).** Neither moving scenario is financially safe — Scenario A leaves you with only 2.1 months of reserves, and Scenario B requires $20,100 you don't have. Consider saving for 12-18 months before revisiting."

> "**Scenario B wins on net worth but carries significant risk.** It builds $43,000 more wealth than Scenario A over 20 years, but requires managing a rental property, starts with zero retirement savings, and your monthly cushion is only $180/mo. One major repair could put you in crisis."

### Output Type

```typescript
VerdictResult {
  /** Which scenario is recommended, or 'none' if all have dealbreakers */
  recommendation: 'baseline' | 'scenarioA' | 'scenarioB' | 'none'
  /** One-line summary: "Scenario A is the stronger choice" */
  headline: string
  /** 2-4 sentences explaining why, with dollar amounts */
  reasoning: string[]
  /** Scenarios eliminated and why */
  dealbreakers: { scenario: string, reasons: string[] }[]
  /** Side-by-side comparison of key metrics across all three */
  keyMetrics: { label: string, baseline: string, scenarioA: string, scenarioB: string }[]
}
```

### Where It Lives

- **Engine:** `src/engine/verdict.ts` — pure function, testable in isolation
- **UI:** `VerdictSection` component placed **above** all charts/results in the results view. This is the first thing the user reads after entering their numbers.

### Testing Requirements

- Inputs where Scenario A clearly wins → verify recommendation and reasoning
- Inputs where Scenario B clearly wins → verify recommendation and reasoning
- Inputs where Baseline wins (both move scenarios have dealbreakers) → verify recommendation
- Inputs where no scenario is viable → verify 'none' recommendation with actionable guidance
- Inputs where two scenarios are close → verify the verdict picks the better one and acknowledges the tradeoff
- Verify dealbreaker detection matches the warning system (same thresholds)
- Verify dollar amounts in reasoning strings are correct (pulled from model, not hardcoded)
- Preston's default inputs → verify the verdict makes sense for his actual situation

---

## 2. Sensitivity Analysis — "What Breaks This?"

### Purpose

Answer the question: "How confident should I be in this recommendation?" by finding the breakeven thresholds — the values at which key assumptions would flip the verdict or make the recommended scenario non-viable.

### Architecture

A pure function: `analyzeBreakevens(inputs: ScenarioInputs, verdict: VerdictResult): BreakevenResult[]`

For each key input variable, the engine searches (binary search or stepped increments) to find the value where:
- The recommended scenario's net worth advantage disappears (another scenario overtakes)
- The recommended scenario hits a dealbreaker (cash shortfall, DTI failure, negative cash flow)

Each variable is tested in the direction that would hurt the recommended scenario (e.g., if Scenario A is recommended, test lower appreciation rates, higher interest rates).

### Variables to Test

Not all 60+ inputs — just the ones that materially affect which scenario wins:

1. **Home appreciation rate** — drives net worth divergence
2. **Monthly rent** — drives Scenario B cash flow viability
3. **Interest rate on new home** — drives affordability
4. **Vacancy rate** — drives Scenario B worst-case
5. **Income** — drives affordability across all scenarios

### Output Type

```typescript
BreakevenResult {
  /** Human-readable name: "Home appreciation rate" */
  inputName: string
  /** Current value in the user's inputs */
  currentValue: number
  /** Value at which the verdict would change */
  breakevenValue: number
  /** Direction of the breakeven: "below 1.2%" or "above 8%" */
  direction: 'below' | 'above'
  /** What happens at the breakeven: "Scenario B overtakes in net worth" */
  consequence: string
  /** How far the current value is from breakeven */
  margin: 'comfortable' | 'thin' | 'at_risk'
}
```

### Margin Classification

- **comfortable** — current value is more than 2x the distance to breakeven (e.g., appreciation at 3% with breakeven at 1.2% — 1.8% buffer vs 1.8% to breakeven)
- **thin** — current value is within 1-2x the distance
- **at_risk** — current value is within 1x the distance to breakeven (the assumption doesn't have much room to be wrong)

The exact thresholds for margin classification should be tuned per variable since they have different scales. The implementing engineer should define sensible defaults and comment the reasoning.

### Performance

This calls `runModel()` multiple times — roughly 5 variables × 10-20 iterations each = 50-100 engine runs. The engine runs in <10ms, so total is under 1 second. No web worker needed.

However, this should be computed **lazily** — only when the user scrolls to or opens the sensitivity section, not on every input change. Use the same debounce pattern as the main model computation.

### Cases Where No Breakeven Exists

If one scenario dominates at all reasonable values of a variable (e.g., Scenario A wins at 0% appreciation and 10% appreciation), report: "Your recommendation holds across all tested values of [variable]." This is a strong confidence signal.

### UI

A section below the verdict titled something like "How robust is this recommendation?" Displays each breakeven as a simple row:

- Variable name + current value
- Breakeven threshold + what happens
- Margin indicator (color + text: "comfortable buffer" / "thin margin" / "at risk")

Not a chart — clear prose with numbers. The user should be able to read it in 30 seconds and understand whether their assumptions need to be very precise or have room for error.

### Testing Requirements

- Known inputs where a specific appreciation rate drop flips the verdict → verify breakeven value
- Inputs where no breakeven exists → verify the "holds across all values" response
- Verify margin classification is correct at each threshold
- Verify the function handles edge cases: what if the recommended scenario is 'none'? (skip analysis — nothing to break)
- Performance test: verify total computation time is under 2 seconds for default inputs

---

## 3. Mobile Refinements

### Purpose

Structured testing and fix pass at 375px viewport (iPhone SE — smallest common target). No new features. The goal is to find and fix issues that make the tool frustrating or unusable on phones.

### Process

The engineer opens the app at 375px in browser dev tools, walks through every screen, and fixes issues as discovered. Each fix is its own commit. The checklist drives discovery — there is no predetermined list of code changes.

### Testing Checklist

**Inputs:**
- [ ] All touch targets meet 44px minimum height/width
- [ ] Number inputs trigger the correct on-screen keyboard (`inputMode="decimal"` for currency/percent, `inputMode="numeric"` for integers like age)
- [ ] PercentInput and CurrencyInput are usable — decimals work, no accidental issues
- [ ] Accordion sections open/close smoothly, content doesn't overflow container
- [ ] Advanced field toggles ("Show Advanced") are discoverable and tappable
- [ ] Select dropdown (filing status) is tappable and readable at small width
- [ ] Labels are not truncated or overlapping inputs

**Results:**
- [ ] Recharts line charts render without clipping or overlap at 375px
- [ ] Chart legends are readable — not truncated, not overlapping data
- [ ] Chart tooltips are usable on touch (tap to see values)
- [ ] Cash flow cards don't overflow horizontally
- [ ] Warning cards are readable with long messages — text wraps, doesn't clip
- [ ] Dollar amounts don't wrap mid-number (e.g., "$412," on one line and "000" on the next)
- [ ] Verdict section is readable with long recommendation text

**Navigation:**
- [ ] Tab switching (Inputs / Results) is responsive — no lag
- [ ] Scrolling within each tab is smooth
- [ ] No content hidden behind fixed headers, tab bars, or safe area insets
- [ ] Switching between tabs preserves scroll position (or resets to top — either is fine, but not to a random position)

**General:**
- [ ] No horizontal scroll on any screen
- [ ] Font sizes readable without zooming (minimum 14px for body text)
- [ ] Focus management doesn't jump unexpectedly
- [ ] Loading/computing state visible while model recalculates

### Automated Testing

Add a Playwright E2E test at 375px viewport width that:
- Navigates through all input sections
- Switches to results tab
- Verifies results render (verdict, charts, warnings)
- Verifies no horizontal overflow: `document.body.scrollWidth <= window.innerWidth`

---

## What Success Looks Like

When Phase 4 is complete, the user can:
1. Enter their numbers and immediately read a plain-English verdict telling them what to do
2. Understand how sensitive that verdict is to their assumptions (and whether to worry about being wrong)
3. Use the tool comfortably on their phone
4. Walk away with a confident, informed decision
