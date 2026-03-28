# Reduce Friction — Design Document

## Goal

Transform the tool from an 89-input form requiring full completion into a streamlined experience where users get results after filling 13 core fields. All inputs remain visible and editable — nothing is hidden — but the distinction between "required to get started" and "optional with smart defaults" reduces friction dramatically.

This work also rebrands the IRA section to "Retirement (401k/IRA)" and drops age from the required input set.

## Design Decisions

### 1. Simple vs Advanced Fields

**13 required fields** (blank, must fill to see results):

| Section | Fields |
|---------|--------|
| About You | Annual Gross Income, Filing Status, Liquid Savings, Monthly Living Expenses, Monthly Debt Payments |
| Current Home | Home Value, Mortgage Balance, Interest Rate, Expected Monthly Rent |
| New Home | Purchase Price, Interest Rate, Down Payment % (Scenario A), Down Payment % (Scenario B) |

**Advanced fields** (visible behind a collapsible "Advanced" toggle per section, pre-populated with defaults, editable anytime):

- Everything else — all 76 remaining inputs across all sections
- No field exists only in code. Every input the engine uses is visible in the form one way or another.

### 2. Section Organization

Sections that contain both simple and advanced fields:
- **About You** — 5 simple fields, advanced toggle reveals salary growth rate, state tax rate
- **Current Home** — 4 simple fields, advanced toggle reveals mortgage term, years into loan, property tax rate, insurance, all rental assumptions (vacancy, management, turnover, etc.)
- **New Home** — 4 simple fields, advanced toggle reveals loan term, PMI rate, property tax rate, insurance, closing costs rate, appreciation rate

Sections that are entirely advanced (collapsed by default, all fields defaulted to zero or sensible values):
- **Retirement (401k/IRA)** — all fields default to zero, making retirement a non-factor unless the user opts in
- **Commute** — all fields default to zero, making commute savings a non-factor unless the user opts in
- **Costs & Projection** — all fields have sensible structural defaults (escalation rates, moving costs, etc.)

### 3. Default Value Changes

**Personal defaults that change to zero:**

| Field | Current Default | New Default | Reason |
|-------|----------------|-------------|--------|
| Age | 37 | Moved to advanced (Retirement section) | Only matters for early withdrawal penalty |
| Retirement balance | $30,000 | $0 | Not relevant unless user opts in |
| Retirement withdrawal (B) | $30,000 | $0 | Preston-specific |
| Annual contribution (A) | $7,000 | $0 | Preston-specific |
| Annual contribution (B) | $0 | $0 | Already zero |
| Commute miles (current) | 44 | 0 | Not relevant unless user opts in |
| Commute tolls | $500 | $0 | Preston-specific |
| Time saved per day | 2.5 hrs | 0 | Preston-specific |
| Landlord hours/month | 5 | 0 | Reasonable zero default |

**Personal defaults that change to blank (required):**

| Field | Current Default | New Default |
|-------|----------------|-------------|
| Annual gross income | $100,000 | Blank |
| Liquid savings | $0 | Blank |
| Monthly living expenses | $3,000 | Blank |
| Monthly debt payments | $0 | Blank |
| Current home value | $270,000 | Blank |
| Mortgage balance | $199,000 | Blank |
| Mortgage rate | 2% | Blank |
| Expected monthly rent | $2,000 | Blank |
| New home purchase price | $300,000 | Blank |
| New home interest rate | 6% | Blank |
| Down payment % (A) | 20% | Blank |
| Down payment % (B) | 10% | Blank |

**Structural defaults that stay as-is** (industry-standard, well-sourced):
- Vacancy rate (8%), rent growth (3%), selling costs (6%), appreciation rates (3%/3.5%), property tax rates, insurance amounts, PMI rate, escalation rates, depreciation split (85/15), DTI credit (75%), turnover frequency/cost, maintenance reserve, salary growth (3%), state tax (0%), etc.

### 4. Results Gating

- Results panel shows a progress message until all 13 required fields are filled: "Fill in X of 13 required fields to see your analysis"
- Required fields are visually distinguished (e.g., subtle highlight or required indicator)
- Once all 13 are filled, results render immediately and update live as inputs change
- Time horizon slider lives in the results area, defaults to 20 years

### 5. Retirement (401k/IRA) Rebranding

UI label changes only — engine types/variables stay as `ira*` internally:

| Current Label | New Label |
|--------------|-----------|
| "Retirement" section title | "Retirement (401k/IRA)" |
| "IRA Balance" | "Retirement Balance" |
| "IRA Type" | "Account Type" |
| "IRA Expected Annual Return" | "Expected Annual Return" |
| "Annual IRA Contribution" | "Annual Contribution" |
| "IRA Withdrawal Amount" | "Withdrawal Amount" |

Warning messages that reference "IRA" update to say "retirement account" or "retirement savings."

### 6. Commute Transparency

When commute time saved is non-zero, the results must show the math behind the dollar value:
- The engine values time saved by deriving an hourly rate from gross income (income / 2,080 hours)
- Wherever commute time savings appear in results, show the calculation: e.g., "2.5 hrs/day × 250 days × $48.08/hr = $30,048/yr"
- The user sees the assumption and can judge whether they agree with it

### 7. Mobile Experience

- Same stepper flow, but only sections containing simple fields are required steps
- Advanced-only sections (Retirement, Commute, Costs) are accessible but skippable

## What Does NOT Change

- Engine types/variables (`ira*`, `age`, etc.) — no internal refactor
- All engine calculation logic — untouched
- Engine tests — they use explicit inputs, not defaults
- Results components, charts, verdict engine — unchanged
- Form persistence to localStorage — unchanged
- The full input experience is still accessible — nothing is removed, just reorganized

## Relationship to Generalization Plan

This design overlaps with and partially supersedes the generalization plan's tasks 11-12 (remove personal defaults, gate results behind validation). The generalization plan's de-personalization work (tasks 1-10, removing Kyle/Austin references) is complementary and should be executed in the same effort.
