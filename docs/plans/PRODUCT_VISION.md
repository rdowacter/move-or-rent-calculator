# HomeDecision — Product Vision & Roadmap

## The Problem

Every year, roughly 7 million Americans sell a home. A significant and growing portion of them — estimated at 1.1 to 1.8 million — seriously consider keeping their old home as a rental property instead of selling. The "mortgage rate lock-in effect" has amplified this: 86% of current homeowners hold rates below 6%, making their existing mortgage a financial asset they're reluctant to give up.

These homeowners face one of the most complex financial decisions of their lives. It touches mortgage math, tax law, retirement planning, cash reserves, monthly budgeting, insurance, landlord economics, and lending qualification — simultaneously. And they're making this decision with:

- **Napkin math** that models the upside but ignores taxes, reserves, vacancy, depreciation recapture, retirement impact, and monthly cash flow strain
- **Biased calculators** built by property management companies that profit when the homeowner chooses to rent, not sell
- **Shallow tools** from major finance sites that answer a different question entirely ("should I rent an apartment or buy a house" — not "should I rent OUT my house or sell it")
- **Forum posts** where they literally share their financial details with strangers on Reddit, Bogleheads, and BiggerPockets hoping someone will check their spreadsheet
- **$300-500/hour financial advisors** for a question that a well-designed tool could answer in 10 minutes

No product on the market today combines the sell-vs-rent comparison with the homeowner's full financial picture: their income, expenses, retirement accounts, cash reserves, debt-to-income ratio, tax situation, and ability to survive a bad quarter as a landlord. The tools that exist either analyze the property in isolation or require the user to already understand the financial mechanics well enough to build their own model.

The result: people make $300,000+ decisions based on incomplete information. Some keep homes they can't afford to carry. Others sell homes that would have built generational wealth. Most never see the risks until they're living them.

## The Product

HomeDecision is a free, interactive financial decision engine that shows homeowners the complete truth about selling their home versus keeping it as a rental when they relocate.

The tool answers two questions with equal weight:

**"Which path builds more wealth?"** — The long-term net worth comparison across three scenarios: stay put, sell and simplify, or keep and rent. This is the question the user comes in with.

**"Can you actually pull this off?"** — The upfront capital required, the monthly cash flow reality in good months and bad months, the emergency reserve gap, the debt-to-income qualification check, and what happens when real landlord expenses hit. This is the question most people forget to ask, and it's our core differentiator.

The tool is location-agnostic. It works for any homeowner in any US state contemplating any relocation. Every financial variable is adjustable. Every assumption is visible and editable. All projections update in real-time as inputs change.

## Who It's For

**Primary user: The reluctant seller.** A homeowner who's relocating (for work, family, lifestyle, or cost of living) and wondering whether they should sell their current home or keep it as an investment property. They are not real estate investors. They're regular people with a mortgage, some savings, maybe a retirement account, facing a decision they've never made before. They've done some googling, maybe run some numbers on the back of an envelope, and they suspect the rental strategy could work — but they're not sure they're seeing the whole picture.

**Secondary user: The advisor or agent.** A financial advisor, CPA, or real estate agent who needs to walk a client through this exact analysis. Today they do it with custom spreadsheets or expensive professional software. A free, well-designed tool they can use during client conversations is immediately valuable to them.

## The Narrative Arc

The tool tells a story in five acts. Each act corresponds to a section of the experience. The user moves through them naturally, and each act builds on the last.

### Act 1: "Tell Me About Your Situation"

The user enters their financial details. But it's not a sterile form — it's a guided conversation organized the way a financial advisor would walk through the situation:

- **About you** — age, income, salary growth expectations, filing status, what your life costs each month, what debts you carry, how much cash you have on hand
- **About your retirement** — IRA or 401k balance, type, how much you contribute annually, whether your employer matches, whether you have other retirement savings. This section quietly establishes that tapping retirement funds has consequences.
- **About your current home** — value, mortgage details, property taxes, insurance, what it could rent for, vacancy expectations, appreciation outlook, what it would cost to sell
- **About the home you want to buy** — price, rate, down payment, taxes, insurance, closing costs, appreciation outlook
- **About your commute and lifestyle** — current commute distance, time, and costs versus what they'd be after moving. Also: how much time landlording would take.

Every field has a researched default pre-populated but is fully editable. Defaults are clearly labeled as assumptions, not facts. The user can get a meaningful result by changing just a handful of numbers — they don't have to fill in every field to get started.

### Act 2: "Here's What You Came Here to See"

The wealth projection. Three lines on a chart: stay put, sell, and keep as rental — showing total net worth over the user's chosen time horizon (adjustable from 5 to 30 years). This is the answer to the question they arrived with.

Alongside the net worth chart: a dedicated retirement account trajectory comparison. If the user is considering tapping their IRA, show two lines — one where the IRA stays intact and grows with ongoing contributions, and one where it's withdrawn and they start over (or don't contribute at all). The gap between these lines at year 20 is often $300,000-$500,000. This is frequently the single most eye-opening visualization in the entire tool.

### Act 3: "Here's What You Haven't Thought About"

This is the section that earns the product's existence. It should feel as prominent and important as the net worth chart.

Three questions, answered in plain language with real numbers:

**"Can you afford to start?"** — How much cash is needed upfront for each scenario. Compare that against the user's actual savings. If they're short, say so directly: "You are $X short of being able to execute this plan with your current savings."

**"Can you afford to live?"** — Real monthly disposable income in each scenario. Not just housing costs — take-home pay minus ALL housing costs minus living expenses minus debt payments minus retirement contributions. For the rental scenario, show two versions: the good month (tenant paying, no issues) and the bad month (property vacant, carrying both mortgages on salary alone). If the bad month shows negative cash flow, that's the most important number on the page. Also: how many months can they carry both mortgages with zero rental income before savings run out? If that number is less than 6, it needs to be unmissable.

**"Can you survive a bad quarter?"** — What reserves they should have versus what they'd actually have after closing. What happens when a $7,000 HVAC replacement hits, or a tenant stops paying for 3 months, or they face an eviction. These aren't hypotheticals — they're normal landlord expenses. Can the user absorb them, or does one bad event trigger a cascade?

### Act 4: "Here's What the Numbers Don't Fully Capture"

Contextual warnings that appear based on the user's specific inputs — not a generic list of risks. If their debt-to-income ratio is fine, don't mention it. If it exceeds 43%, tell them a lender may reject the second mortgage.

Categories of contextual risk:

- **Lending risk** — DTI may block the new mortgage. Show both the standard calculation and the version where the lender credits 75% of expected rent.
- **Retirement risk** — if the IRA is their only retirement savings and they're withdrawing it, show the dollar gap at retirement age. Not "you'll have less" — show exactly how much less.
- **Liquidity risk** — if post-closing reserves are below recommended minimums, they're one surprise away from a missed payment.
- **Tax risk** — depreciation recapture at 25% when selling the rental, capital gains exposure after losing the primary residence exclusion, the tax bracket bump from the IRA withdrawal.
- **Landlord risk** — tenant turnover costs, eviction costs, major repair estimates, the time cost valued at their hourly rate.
- **Market risk** — appreciation is an assumption, not a guarantee. Property taxes and insurance in many states have been rising faster than home values.

### Act 5: "Here's How to Think About This"

A dynamic verdict that synthesizes everything into clear, honest language. It adapts based on the numbers:

- If one scenario clearly wins on wealth AND is financially feasible, say so confidently.
- If the rental strategy wins on paper but the monthly cash flow is dangerously thin, acknowledge the upside while being honest about the fragility.
- If the rental strategy isn't financially feasible with their current savings, say so directly — and show what would need to change to make it work (more savings, higher rent, different down payment).
- If the scenarios are close, frame the tiebreaker as risk and complexity — the modest upside of the rental strategy versus the additional risk and burden.
- Always reinforce that the commute savings are a win regardless of which property strategy they choose.

The verdict explicitly calls out: which scenario wins and by how much, whether the plan is actually feasible right now, the retirement impact in dollars, the monthly cash flow margin, the reserve shortfall, and what to discuss with a CPA or advisor.

---

## Phases

### Phase 1: The Core Tool

**Goal:** Ship the free tool. Validate that people use it, find it valuable, and engage with the "can you afford it" section — not just the wealth chart.

**What ships:**
- The complete input experience (Act 1) with all variable groups, sensible defaults, and collapsible sections
- The wealth projection (Act 2) — net worth comparison chart and IRA trajectory comparison
- The reality check (Act 3) — upfront capital, monthly cash flow (best and worst case), reserve analysis, zero-income runway, stress testing
- The contextual warnings (Act 4) — driven by the user's inputs, not static
- The dynamic verdict (Act 5)
- A time horizon slider (5-30 years) that updates everything instantly
- Mobile-responsive design
- Shareable URL — the user's configuration encoded in the URL so they can bookmark it, share it with a spouse, or send it to an advisor

**What doesn't ship yet:**
- Paid report
- Affiliate integrations
- Email capture
- User accounts

**Edge cases handled gracefully but not modeled:**
- 1031 exchanges — acknowledge, suggest discussing with a CPA
- Multi-unit properties — note the tool is for single-family homes
- Adjustable-rate mortgages — note not yet supported
- Self-employment income — note DTI calculations assume W-2 income
- LLC/entity structuring — note tool models individual ownership
- Short-term/Airbnb rentals — note tool models long-term leases only
- VA loans with zero down — worth adding in a future phase

**Success metrics:**
- Users complete the full input flow (not just the first section)
- Users engage with the capital/cash flow section (scroll depth, time spent)
- Users adjust inputs and re-run scenarios (indicates the tool is influencing their thinking)
- Users share the URL (organic distribution)

---

### Phase 2: Content & Distribution

**Goal:** Drive organic traffic to the tool. Build an audience. Start collecting signal on what people care about most.

**What ships:**
- Landing page with clear value proposition and social proof (once we have it)
- 5-7 SEO-targeted articles answering the exact questions people are already searching:
  - "Should I sell my house or rent it out when I move"
  - "Can I afford two mortgages on one income"
  - "IRA withdrawal for house down payment — is it worth it"
  - "What happens to my mortgage rate if I rent out my house"
  - "Depreciation recapture tax when selling rental property"
  - "Rent vs sell calculator"
- Each article links naturally to the tool as the answer to the question the article raises
- Email capture — "Save your analysis and receive a summary" — builds a list of high-intent users
- Share in communities: r/personalfinance, r/realestateinvesting, r/financialplanning, BiggerPockets forums, Bogleheads

**Success metrics:**
- Organic search traffic growth month over month
- Email list growth
- Community reception and engagement (shares, comments, follow-up questions)

---

### Phase 3: Monetization

**Goal:** Generate first revenue without compromising the user experience.

**Revenue stream 1: Financial Decision Report ($49-79 one-time)**

A polished, branded PDF that packages the user's complete analysis into a professional document they can bring to a CPA, financial advisor, or lender. It includes:

- Executive summary with the verdict in plain language
- Full scenario comparison with year-by-year projections
- All assumptions documented and labeled
- Monthly cash flow analysis for both scenarios (best and worst case)
- Capital requirements and reserve gap
- IRA impact analysis with trajectory chart
- Tax implications summary (depreciation, recapture, capital gains, bracket impact)
- Risk factors specific to their situation
- A "Questions to Ask Your CPA" section tailored to their inputs
- A "Questions to Ask Your Lender" section (DTI, rental income offset, PMI)

The value proposition: this report would cost $300-500 if a financial advisor prepared it. We generate it instantly for $49-79.

**Revenue stream 2: Contextual affiliate next steps**

After the user completes their analysis, surface the logical next action based on their decision:

- Decided to keep as rental → "Compare landlord insurance quotes," "Find a property manager in your area"
- Decided to sell → "Get a free home valuation," "Compare mortgage rates for your new home"
- Needs professional help → "Connect with a fee-only financial advisor who specializes in real estate decisions"

These are helpful next steps, not ads. They appear after the user has gotten full value from the free tool. Mortgage and advisor leads are the highest-paying affiliate categories in personal finance ($20-200+ per qualified lead).

**Revenue stream 3: Advisor consultation referral**

Partner with 2-3 fee-only financial advisors. Offer a "Review my analysis with an expert" option — the advisor reviews the user's tool output in a 45-minute consultation ($150-250). We take 20-30% as a referral fee. This positions the tool as the entry point to professional advice, not a replacement for it.

**Success metrics:**
- Report conversion rate (target: 3-5% of tool completions)
- Affiliate click-through and conversion rates
- Monthly revenue trajectory

---

### Phase 4: The Tool Suite

**Goal:** Expand from a single tool to a suite of financial decision engines. Each new tool shares the same brand, design language, and financial engine foundation. Each is a new SEO entry point and a new audience acquisition channel.

**Tool 2: "Can I Actually Afford This House?"**

The brutally honest affordability calculator. Not "what mortgage can you qualify for" (which every bank calculator answers, because they want you to borrow more), but "what will your life actually look like after you buy this house." Take-home pay minus mortgage minus real living expenses minus debt payments minus retirement contributions = what's truly left. Show the house-poor danger zone. This tool serves users EARLIER in their journey — before they've even decided to move. Enormous SEO potential on "how much house can I afford."

**Tool 3: "Should I Refinance?"**

Compare current loan versus a new loan: monthly payment change, break-even point considering closing costs, total interest saved over the life of the loan. Simple, high search volume, and the highest-paying affiliate category in personal finance (mortgage leads).

**Tool 4: "How Should I Fund My Down Payment?"**

Compare funding sources side by side: IRA withdrawal (with full penalty and tax impact), 401k loan, savings, family gift, down payment assistance programs, cash-out refinance on existing property. Show the true 20-year cost of each option including opportunity cost, taxes, and penalties. This tool does not exist anywhere on the market and it's the exact question that started this entire project.

**Tool 5: "What Happens When I Sell?"**

Capital gains modeling, primary residence exclusion rules, depreciation recapture for former rental properties, net proceeds after all selling costs and taxes. For someone who kept their home as a rental for 10 years and is now selling, the exit tax bill is often a nasty surprise. Show it clearly before they list.

**Tool 6: "I Inherited a Property — Now What?"**

Keep it, sell it, rent it out. The stepped-up basis changes the tax math entirely compared to a property you purchased. High-emotion, high-confusion moment where people desperately need clarity. Lower search volume but much higher willingness to pay for the report.

Each tool is a standalone product with its own landing page, its own SEO target, and its own entry point. But the suite creates cross-pollination: someone who finds us through the refinance calculator discovers the sell-vs-rent tool and realizes they have a bigger question to answer.

---

### Phase 5: Intelligence & Platform (If It Takes Off)

**Goal:** Transform from a tool suite into a platform with recurring value.

**AI-powered narrative analysis.** The user enters their numbers, the tool runs the model, and an AI writes a personalized 2-3 page narrative explaining what the numbers mean in plain English. Not a generic summary — a tailored analysis that addresses their specific situation, flags the risks that matter most for their inputs, and suggests what to discuss with a professional. This is the feature that makes someone say "this tool understands my situation better than anything I've found."

**Scenario saving and comparison.** Let users save multiple configurations and compare them side by side. "What if the rent is $1,800 instead of $2,000?" "What if I put 15% down instead of 10%?" "What if I wait 6 months and save another $10,000?" The ability to toggle between saved scenarios transforms a one-time analysis into an ongoing decision workspace.

**Actual-vs-projected tracking.** The user made their decision 2 years ago using our tool. Now they can come back and see how reality compares to the projections. Their Austin home appreciated 4.2% vs. the 3.5% assumption. Their Kyle rental generated $18,400 in net income vs. the $16,800 projection. This creates a reason to come back, and it's the engagement model that justifies a subscription.

**Subscription model.** Free tier = one analysis at a time. Paid tier ($8-12/month or $89-129/year) = unlimited saved scenarios, AI narrative analysis, actual-vs-projected tracking, annual financial health checks on owned properties, and early access to new tools. This only makes sense once the tool suite is mature enough to provide ongoing value beyond a single decision.

**B2B white-label.** Real estate brokerages and financial advisory firms license a branded version of the tool suite for their agents and advisors to use with clients. This is a separate sales motion (direct outreach, demos, onboarding) and only worth pursuing if the consumer product has proven demand and the product is mature.

---

## Revenue Projections (Conservative)

**Phase 1-2 (Months 1-4):** $0. Free tool, building traffic and audience.

**Phase 3 (Months 4-8):** At 1,000-2,000 monthly users with 3-5% report conversion at $59 average: $1,800-5,900/month in report sales + $500-1,500/month in affiliate revenue = **$2,300-7,400/month.**

**Phase 4 (Months 8-18):** Tool suite drives 3,000-5,000 monthly users. Report sales across multiple tools + growing affiliate revenue + advisor referrals = **$6,000-14,000/month.**

**Phase 5 (18+ months):** If subscription and B2B materialize, significantly higher — but only pursue this if the earlier phases validate demand. Don't plan for Phase 5 revenue. Let Phases 1-4 prove the market.

---

## What Good Looks Like

A user spends 10 minutes entering their real numbers. They leave understanding:

1. Which path builds more wealth — and by how much
2. Whether they can actually afford to do it — not in theory, but with their real savings, income, and expenses
3. What it costs them monthly — in good months and bad months
4. What they're giving up if they tap retirement savings — in concrete dollar terms, not vague warnings
5. What could go wrong — in dollars, not hypotheticals
6. What their real margin of safety is — months of runway, reserve gaps, stress test results

They should be able to pull one slider and watch the entire picture shift. They should feel more informed and more confident when they're done — even if the answer is "I need to save more before I do this."

## What Good Does Not Look Like

- A wall of numbers with no narrative
- Charts without context explaining what they mean
- A polished dashboard that hides uncomfortable truths
- Technical financial jargon without plain-language explanation
- A tool that tells the user what to do instead of showing them what's true
- An experience that feels like a mortgage lender's website — optimized to get you to borrow, not to help you decide
- Warnings that are alarmist instead of informative
- An analysis that only shows the 20-year outcome without addressing whether you can survive year 1
