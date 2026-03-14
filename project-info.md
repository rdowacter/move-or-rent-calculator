# Product Brief: Real Estate Financial Scenario Analyzer

## The Human Story

A 37-year-old man spends 3 hours every day sitting in his car commuting between Kyle, TX and Austin, TX. That's 625 hours a year — 26 full days of his life — lost to a highway. He pays $500/month in tolls on top of gas, wear on his car, and the slow erosion of his energy and wellbeing. He wants to move to Austin and end this.

He owns a home in Kyle worth $270,000 with a $199,000 mortgage at a 2% interest rate — a rate that no longer exists in today's market. He's looking at homes in Austin around $300,000 at today's 6% rates.

He has an idea: keep the Kyle house, rent it out for $2,000/month, and use it as an investment property. To make this work, he'd pull $30,000 from his IRA — his only retirement savings — to help cover the down payment on the Austin home. He's done some quick math and believes the two-house strategy will make him more money over the long run than leaving the $30k in his IRA.

His brother-in-law isn't so sure. And that's why this tool exists.

**This tool's job is to show the complete truth** — not to tell him what to do, but to make sure he sees every cost, every risk, every hidden tax, and every month-to-month cash flow reality before he signs anything. The napkin math might be right about year 20. But can he survive year 1?

---

## The Narrative Arc

The tool tells a story in five acts. Each section of the UI corresponds to an act. The user should be able to move through them naturally, and each act should build on the last.

### Act 1: "Set the Stage"
**Purpose:** Get the user's real numbers into the tool.

This is the input panel. But it's not just a form — it's a guided conversation. The inputs are grouped into sections that mirror how a financial advisor would walk through the situation:

1. **"Tell me about yourself"** — age, income, filing status, salary growth, monthly living expenses, debts, liquid savings. The tool needs to know not just what he earns, but what his life actually costs. Without monthly living expenses and liquid savings, we can't tell him whether he can afford any of this.

2. **"Tell me about your retirement"** — IRA balance, type, expected return, ongoing contributions, employer match. This section should feel slightly heavy. The tool is quietly establishing that this $30k might be more important than he thinks.

3. **"Tell me about your current home"** — the Kyle property details. Value, mortgage, rate, taxes, insurance, what it could rent for. Everything needed to model it as either an asset to sell or an investment to keep.

4. **"Tell me about the home you want to buy"** — the Austin property. Price, rate, down payment, costs. The key tension: how much down payment in each scenario? 20% if he sells Kyle (more cash), 10% if he keeps it (less cash, plus PMI).

5. **"Tell me about your commute"** — current miles, tolls, time. And what it would be after moving. This section should feel like relief — the numbers here universally support moving, regardless of which property strategy he picks.

Every input has a sensible default pre-filled (based on our research and his known numbers), but everything is editable. The defaults are assumptions — and the tool should make that word visible. An "Assumptions" label or indicator on defaulted values reminds the user that these are starting points, not facts.

### Act 2: "Here's What You Think Is True"
**Purpose:** Show the headline comparison he's expecting to see.

This is the net worth projection — the chart with three lines showing total wealth over 10, 20, or 30 years for each scenario. This is the chart that confirms or challenges his napkin math.

But it's not the whole story. It's the opening argument, not the verdict.

Key design choice: **show a dedicated IRA trajectory comparison** alongside the net worth chart. Two lines — one showing his IRA if he keeps it and contributes annually ($30k + $7k/year at 7%), and one showing what happens if he withdraws it (starts at $0, maybe contributes, maybe doesn't). This is often the single most eye-opening visual in the entire tool because most people dramatically underestimate how much compounding they're destroying. The gap between these two lines at year 20 is likely $300,000–$500,000. Let that number breathe.

### Act 3: "Here's What You Haven't Thought About"
**Purpose:** This is the act that earns the tool's existence. Show the capital requirements, monthly cash flow reality, and reserve gaps.

**This section should be impossible to miss.** It should feel as weighty as the net worth chart, not like a footnote below it.

Three questions, answered clearly:

**"Can you afford to start?"** — Upfront capital analysis.
- Scenario A: How much cash does he need after the Kyle sale proceeds cover the Austin down payment? Does he have surplus, or does he need more?
- Scenario B: How much cash does he need after the IRA proceeds (post-tax, post-penalty) cover the Austin down payment? The IRA only nets ~$20,400 after the government takes 32%. Is that enough? What's the gap?
- Compare both against his actual liquid savings. If either scenario requires more cash than he has, say so plainly: **"You are $X,XXX short of being able to execute this plan."**

**"Can you afford to live?"** — Monthly cash flow reality.
- Show his real monthly disposable income in each scenario: take-home pay minus ALL housing costs minus living expenses minus debt payments minus retirement contributions. Not just "what are my housing costs" but "what's left over to actually live."
- For Scenario B, show two versions: the best case (tenant pays on time, no issues) and the worst case (property is vacant — he's paying both mortgages out of pocket with no rental income). If the worst case leaves him with negative monthly cash flow, that's the most important number on the entire page.
- Show it as a simple monthly budget: income in, expenses out, remainder. Anyone can read a budget.

**"Can you survive a bad month?"** — Reserve and stress test analysis.
- What reserves should he have? What will he actually have after closing?
- How many months can he carry both mortgages with zero rental income? If the answer is "2 months" — he needs to see that in large, clear text. That's his margin of error for his entire financial life.
- What happens when real landlord expenses hit: a $7,000 HVAC replacement, a 3-month vacancy, an eviction that costs $3,000 in legal fees? Can he absorb these, or does one bad event trigger a cascade?

The emotional arc of this section: *"Oh. I need to think about this differently."*

### Act 4: "Here's What the Numbers Don't Show"
**Purpose:** Surface the risks, hidden costs, and considerations that no spreadsheet captures fully.

These aren't static bullet points. They're **contextual warnings that appear based on the user's actual inputs.** If his DTI is fine, don't lecture him about DTI. If it's over 43%, tell him the bank might say no. If his IRA is his only retirement savings, surface the retirement risk. If his monthly surplus is under $300, flag the house-poor danger.

Categories of risk, triggered by input conditions:

- **Lending risk** (triggered when DTI exceeds thresholds): The bank may not approve the second mortgage. Show both the standard calculation and the version where the lender credits 75% of expected rent.
- **Retirement risk** (triggered when IRA is only savings and Scenario B contributions are $0): Show the dollar gap at retirement age. Not "you'll have less" — show exactly how much less.
- **Liquidity risk** (triggered when post-closing reserves are below recommended minimums): He's one surprise away from a missed mortgage payment.
- **Tax risk** (always shown for Scenario B): Depreciation recapture at 25% + capital gains when he eventually sells the rental. Most people don't know about depreciation recapture until they owe $30,000+ at closing. Also: loss of the primary residence exclusion after 3 years as rental.
- **Landlord risk** (always shown for Scenario B): Tenant turnover costs, eviction costs, major repair estimates, the time cost valued at his hourly rate. Being a landlord from 22 miles away is still being a landlord.
- **Market risk** (always shown): Austin corrected 18% from its 2022 peak. Kyle has been softening. Appreciation is an assumption, not a guarantee. Property taxes and insurance in Texas have been rising faster than home values.

The tone of this section should be informative, not alarming. The goal is clarity, not fear. Every risk should include a rough dollar estimate so it's concrete, not abstract.

### Act 5: "Here's What I'd Think About"
**Purpose:** A dynamic verdict that synthesizes everything into clear language.

This section changes based on the numbers. It doesn't say "do this" — it says "here's what the model shows, and here's what that means."

Scenarios the verdict engine should handle:

- **Scenario A wins on net worth AND Scenario B is infeasible** (not enough cash, DTI too high): The verdict should be clear and direct. The rental strategy doesn't work with his current financial position.
- **Scenario B wins on net worth BUT monthly cash flow is dangerously thin**: The long-term math works, but he's one vacancy away from crisis. The verdict should acknowledge the upside while being honest about the fragility.
- **Scenario B wins on net worth AND cash flow is sustainable**: The rental strategy works both on paper and month-to-month. The verdict should still surface the risks (retirement gap, landlord burden, exit taxes) but acknowledge it's a viable path.
- **The two scenarios are close** (within 10-15% of each other): When the outcomes are similar, the tiebreaker is risk and simplicity. The verdict should frame it that way — "the upside of the rental strategy is modest relative to the additional risk and complexity."
- **In all cases**: The commute savings are a win regardless. The tool should always reinforce that moving to Austin is the strongest financial and quality-of-life decision, independent of the property strategy.

The verdict should explicitly call out:
- Which scenario wins and by how much
- Whether Scenario B is financially feasible right now (cash + DTI)
- The retirement gap in dollar terms
- The monthly cash flow margin (comfortable, tight, or negative)
- The reserve shortfall (if any)
- One sentence on the commute savings

---

## What Good Looks Like

A user spends 10 minutes entering their real numbers. Then they understand:

1. **Which path builds more wealth** — and by how much, with a chart they can toggle between 10, 20, and 30 years
2. **Whether they can actually do it** — not in theory, but with their actual savings, income, and expenses
3. **What it costs them monthly** — in the good months and in the bad months
4. **What they're giving up** — the IRA compounding they'll never get back, in concrete dollar terms, not vague warnings
5. **What could go wrong** — in dollars, not in hypotheticals
6. **What their real margin of safety is** — how many months of runway, how much one bad event costs them

They should be able to pull one slider — change the rent from $2,000 to $1,800 — and watch the entire picture shift. They should be able to toggle the time horizon from 10 to 30 years and see the compounding diverge. They should be able to change their cash on hand from $0 to $15,000 and watch the feasibility warnings appear or disappear.

When they're done, they should be able to print or export a clean summary to bring to a CPA or financial advisor. The tool does the modeling. The professional validates the approach.

**What good does NOT look like:**
- A wall of numbers with no narrative
- Charts without context
- A pretty dashboard that hides the uncomfortable truths
- Technical financial jargon without plain-language explanation
- A tool that tells him what to do instead of showing him what's true

---

## Feature Priority

Build in this order. Each layer is usable on its own.

**Layer 1 — The Engine (build and test first, no UI)**
All financial calculations as pure functions with comprehensive tests. Mortgage amortization, tax brackets, IRA growth with contributions, rental cash flow with depreciation and tax treatment, scenario orchestration, capital requirements, DTI, stress tests. Every function tested against manually calculated values. This is the foundation — if this is wrong, nothing else matters.

**Layer 2 — The Core Experience**
Input panel with all variables. Net worth projection chart (3 lines). IRA trajectory comparison. Monthly cash flow breakdown (best case and worst case). These four views together tell the core story.

**Layer 3 — The Safety Check**
Upfront capital analysis. Reserve gap calculation. Zero-income runway. DTI check with pass/fail. Stress test scenarios. Contextual warnings driven by inputs. This layer is what separates this tool from a basic calculator.

**Layer 4 — The Verdict**
Dynamic recommendation engine that synthesizes all outputs into clear, honest language that adapts to the user's specific situation.

**Layer 5 — Polish**
Print/export summary. URL state for sharing configurations. Sensitivity analysis (what-if tables for different appreciation rates, rent levels). Save/compare scenarios. Mobile optimization.

---

## All Variables (Reference for Implementation)

This is the complete list of every adjustable input. Defaults are based on the real scenario and market research.

### Personal & Tax Profile
| Variable | Default | Why It Matters |
|---|---|---|
| Age | 37 | Early withdrawal penalty applies under 59.5 |
| Annual gross income | $100,000 | Drives tax brackets, DTI, savings capacity |
| Annual salary growth rate | 3% | Income at year 20 is ~$180k, not $100k — changes everything over time |
| Filing status | Single | Tax bracket thresholds differ significantly by status |
| State income tax rate | 0% | Texas has none, but tool should work for other states |
| Monthly non-housing living expenses | $3,000 | Food, utilities, transportation, entertainment — everything that isn't housing or debt. Essential for real cash flow |
| Monthly non-housing debt payments | $0 | Car loans, student loans, credit cards — affects DTI and disposable income |
| Current liquid savings / cash on hand | $0 | Determines whether either plan is actually executable |

### Retirement & Savings
| Variable | Default | Why It Matters |
|---|---|---|
| IRA balance | $30,000 | The asset he's considering destroying |
| IRA type | Traditional | Roth has different withdrawal rules — contributions come out tax/penalty-free |
| IRA expected annual return | 7% | Long-term S&P 500 average |
| Annual IRA contribution — Scenario A & Baseline | $7,000 | 2024 max for under 50. Ongoing contributions are the hidden superpower of keeping the IRA |
| Annual IRA contribution — Scenario B | $0 | Can he afford to contribute while carrying two mortgages? This gap compounds enormously |
| Has employer 401k with match | No | A 4% match on $100k = $4,000/year in free money, separate from the IRA question |
| Employer match percentage | 0% | Only shown if above is Yes |
| Has other retirement savings | No | If yes, the IRA withdrawal is less catastrophic |
| Other retirement balance | $0 | Only shown if above is Yes |

### Current Home (Kyle)
| Variable | Default | Why It Matters |
|---|---|---|
| Home value | $270,000 | Determines sale proceeds or rental asset value |
| Mortgage balance | $199,000 | Equity = value minus balance |
| Interest rate | 2.00% | This rate is irreplaceable — any forced refi destroys the rental math |
| Original loan term | 30 years | Needed for amortization schedule |
| Years into loan | 5 | App back-calculates original loan amount |
| Annual property tax rate | 2.15% | Hays County combined rate. No homestead exemption on rental. |
| Annual homeowners insurance | $2,400 | Landlord policies cost 15-25% more |
| Landlord insurance premium increase | 20% | Applied in Scenario B only |
| Maintenance reserve (% of value/yr) | 0.75% | Lower for newer homes; 1-1.5% for older |
| Monthly HOA | $0 | |
| Expected monthly rent | $2,000 | The revenue that makes or breaks Scenario B |
| Annual rent growth rate | 3% | Not guaranteed — oversupply could pressure rents |
| Vacancy rate | 8% | ~1 month/year. Optimistic for a first-time landlord |
| Property management fee (% of rent) | 0% | Self-managing. 8-10% if he hires out later |
| Tenant turnover frequency (years) | 2.5 | Average tenure; triggers turnover costs |
| Cost per turnover | $3,500 | Cleaning, repairs, re-listing, screening |
| Selling costs (% of sale price) | 6% | Agent commissions + seller closing costs |
| Annual appreciation rate | 3% | Kyle 10-yr avg was ~7.5%, but recent years negative |

### New Home (Austin)
| Variable | Default | Why It Matters |
|---|---|---|
| Purchase price | $300,000 | The commitment |
| Mortgage interest rate | 6.00% | Current market |
| Loan term | 30 years | |
| Down payment % — Scenario A | 20% | More cash available from Kyle sale; no PMI |
| Down payment % — Scenario B | 10% | Less cash available; triggers PMI |
| PMI rate (% of loan/yr) | 0.70% | Pure cost, zero return. Drops at 78% LTV |
| Annual property tax rate | 2.00% | Travis County |
| Annual homeowners insurance | $2,400 | |
| Buyer closing costs (% of price) | 2.5% | |
| Annual appreciation rate | 3.5% | Austin 25-yr CAGR ~5%, but 18% correction from 2022 peak |

### Commute & Lifestyle
| Variable | Default | Why It Matters |
|---|---|---|
| Current round-trip commute (miles) | 44 | 22 miles each way |
| Work days per year | 250 | |
| IRS mileage rate ($/mile) | $0.725 | 2026 rate — represents full vehicle operating cost |
| Current monthly tolls | $500 | Confirmed — this alone is $6,000/year |
| New round-trip commute (miles) | 10 | After moving to Austin |
| New monthly tolls | $0 | |
| Commute time saved per day (hours) | 2.5 | Quality-of-life metric |
| Landlord time commitment (hours/month) | 5 | Valued at hourly rate to show invisible cost |

### Costs & Escalation
| Variable | Default | Why It Matters |
|---|---|---|
| Moving costs | $3,000 | One-time |
| Insurance escalation rate/yr | 3% | TX insurance rising faster than inflation |
| Property tax escalation rate/yr | 2% | Assessments tend to rise even when rates hold |
| General inflation rate | 2.5% | For escalating maintenance and living costs |
| Additional tax prep cost for rental/yr | $500 | Schedule E adds CPA complexity |
| Umbrella insurance annual cost | $300 | Recommended for landlords |

### Projection Settings
| Variable | Default | Why It Matters |
|---|---|---|
| Time horizon | 20 years | Slider: 5–30 |
| Planned rental exit year | Same as horizon | When he'd sell Kyle — affects capital gains and depreciation recapture |

---

## Key Financial Calculations

The engine must get these right. Each should be a pure, tested function.

### IRA Withdrawal Tax (Scenario B)
The withdrawal stacks on top of his salary. At $100k income (single), adding $30k pushes into the 24% bracket (~$100,525 threshold). Calculate the blended effective rate on the withdrawal, not a flat rate. Include the 10% early withdrawal penalty for age < 59.5. Net proceeds are typically ~$20,400 from $30,000.

### IRA Growth With Contributions (All Scenarios)
This is the variable that may settle the entire debate. Formula: FV = existing_balance × (1 + r)^n + annual_contribution × [((1 + r)^n − 1) / r]. In Scenario A: $30k existing + $7k/year at 7%. In Scenario B: $0 + maybe $0/year. Over 25 years, the gap is likely $400,000+.

### Rental Income Tax Treatment
Rental income is taxable, but offset by: mortgage interest deduction, property tax deduction (no SALT cap on Schedule E), insurance, maintenance, management fees, and depreciation (structure value ÷ 27.5 years, land excluded at ~15% of value). Depreciation often creates a paper loss even when cash flow is positive, generating a tax benefit. But passive activity loss rules limit the offset: full $25k offset at AGI < $100k, phasing out to $0 at $150k. His salary growth pushes him out of this benefit within a few years.

### Depreciation Recapture + Capital Gains on Rental Sale
When Kyle is eventually sold: all claimed depreciation is recaptured at 25% (not the capital gains rate). Capital gains on appreciation are taxed at 15-20%. The primary residence exclusion ($250k single) is lost after the property has been a rental for >3 years of the last 5. These exit taxes materially reduce the realized value of Scenario B.

### DTI Ratio
Front-end DTI = housing costs / gross monthly income (target: <28%). Back-end DTI = (housing + all debt) / gross monthly income (target: <36%, hard max ~43%). For Scenario B, lenders typically credit only 75% of expected rental income against the rental mortgage. If DTI exceeds 43%, the Austin mortgage may not be approved — this is a hard blocker, not a risk factor.

### Monthly Cash Flow
The real monthly budget: gross income → minus taxes → minus ALL housing costs (one mortgage or two, plus tax/insurance/PMI) → minus living expenses → minus debt payments → minus retirement contributions → equals what's left. Show this for both scenarios, and show Scenario B in both best case (tenant paying) and worst case (vacant).

---

## Technical Notes

- React (Vite or Next.js), TypeScript, Tailwind CSS, Recharts
- All calculations client-side — no backend needed
- Financial engine is a pure function library with zero UI dependencies, 100% testable in isolation
- TDD: tests with manually verified expected values written before implementation
- Memoize scenario calculations with useMemo; debounce numeric inputs
- Responsive — must work on mobile
- URL query params for sharing configurations
- Print/export summary option
- Refer to CLAUDE.md for architecture, code standards, and development practices
- Refer to AGENT_PERSONA.md for behavioral expectations and domain expertise

### Financial Disclaimers (display at bottom)
- "This tool is for educational and informational purposes only and does not constitute financial, tax, or legal advice."
- "All projections are based on assumptions that may not reflect actual future outcomes. Past performance does not guarantee future results."
- "Consult a qualified CPA, financial advisor, and real estate attorney before making major financial decisions."
- "Tax calculations are simplified estimates. Your actual liability depends on your complete financial picture and current tax law."