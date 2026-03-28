# Contextual Warning Copy — Legal + UX Hybrid

These warnings are triggered by the user's specific inputs. They serve both a UX purpose (helping the user understand risks) and a legal purpose (disclosing material limitations at the point of reliance).

Each warning includes the trigger condition, the copy, and implementation notes.

---

## Lending Risk Warnings

### DTI Exceeds 43% (Qualified Mortgage Maximum)

**Trigger:** Back-end DTI ratio > 43%

**Copy:**
> Your estimated debt-to-income ratio is **[X]%**, which exceeds the 43% maximum for a Qualified Mortgage. Most lenders require DTI below this threshold. You may face higher interest rates, need compensating factors (strong credit, large reserves), or be unable to qualify for a conventional mortgage. This is an estimate — lenders calculate DTI using their own methods and may reach a different result. Speak with a mortgage lender to understand your actual qualification.

**Severity:** Critical

---

### DTI Exceeds 36% (Target Threshold)

**Trigger:** Back-end DTI ratio > 36% but ≤ 43%

**Copy:**
> Your estimated debt-to-income ratio is **[X]%**, which exceeds the 36% target that most lenders prefer. You may still qualify for a mortgage, but you may receive less favorable terms. Reducing other debts or increasing your down payment could improve your ratio.

**Severity:** Warning

---

## Liquidity Risk Warnings

### Capital Shortfall

**Trigger:** Required upfront capital > available liquid savings

**Copy:**
> Based on your inputs, you need approximately **$[X]** in upfront capital for this scenario, but your stated liquid savings are **$[Y]**. You are approximately **$[Z] short**. This gap must be covered by additional savings, gifts, or other sources before you can execute this plan. This estimate does not include moving costs, immediate repairs, or other expenses that may arise during the transition.

**Severity:** Critical

---

### Insufficient Emergency Reserves (Critical)

**Trigger:** Post-closing reserves < 3 months of expenses

**Copy:**
> After estimated closing costs and down payment, your projected remaining savings are **$[X]**. This covers approximately **[Y] months** of expenses at your current spending level. Most financial advisors recommend maintaining at least 3-6 months of expenses (**$[A]-$[B]** for your situation) as an emergency fund. With less than 3 months of reserves, a single unexpected expense — car repair, medical bill, home maintenance — could create a financial emergency.

**Severity:** Critical

---

### Insufficient Emergency Reserves (Warning)

**Trigger:** Post-closing reserves ≥ 3 months but < 6 months of expenses

**Copy:**
> After estimated closing costs and down payment, your projected remaining savings are **$[X]**, covering approximately **[Y] months** of expenses. This is below the 6-month emergency fund recommended by most financial advisors (**$[A]** for your situation). Consider building additional savings before or shortly after executing this plan.

**Severity:** Warning

---

### Negative Monthly Cash Flow

**Trigger:** Monthly disposable income is negative in any scenario

**Copy:**
> In this scenario, your estimated monthly expenses exceed your take-home income by **$[X]/month**. This means you would need to draw from savings every month to cover basic expenses. This is not sustainable without additional income or reduced expenses.

**Severity:** Critical

---

## Retirement Risk Warnings

### IRA Withdrawal Tax and Penalty Impact

**Trigger:** User enters IRA withdrawal amount > $0 in Scenario B

**Copy:**
> Withdrawing **$[X]** from your traditional IRA before age 59.5 triggers an estimated **$[Y] in federal income tax** and a **$[Z] early withdrawal penalty** (10% per IRC Section 72(t)). Your net proceeds after taxes and penalties would be approximately **$[W]**. Certain exceptions to the 10% penalty may apply — including the first-time home purchase exception (up to $10,000). Consult a tax professional to determine if any exception applies to your situation.

**Severity:** Warning

---

### IRA Is Only Retirement Savings

**Trigger:** IRA withdrawal > 0 AND hasOtherRetirementSavings is false AND otherRetirementBalance ≈ 0

**Copy:**
> Your IRA appears to be your only retirement savings. Withdrawing it entirely would leave you with **$0 in dedicated retirement funds** at age **[X]**. Based on your inputs, rebuilding this account through annual contributions of **$[Y]/year** at **[Z]%** returns would result in approximately **$[W]** by age 65 — compared to **$[V]** if you keep the IRA intact. This **$[gap]** difference reflects decades of lost compound growth. This projection assumes steady returns; actual investment performance will vary.

**Severity:** Warning (escalate to Critical if gap > $100,000)

---

## Landlord Risk Warnings

### Dual-Mortgage Vacancy Exposure

**Trigger:** User is in Scenario B (keeping rental + buying new home)

**Copy:**
> In this scenario, you would carry two mortgage payments totaling **$[X]/month**. If your rental property is vacant, you must cover both payments from your salary alone. At your current income, you could sustain **[Y] months** of zero rental income before depleting your reserves. Typical vacancy between tenants is 1-2 months; evictions can take 3-6 months depending on your state's laws.

**Severity:** Info (escalate to Warning if runway < 6 months, Critical if < 3 months)

---

### Major Repair Exposure

**Trigger:** User is in Scenario B (keeping rental)

**Copy:**
> As a landlord, you are responsible for all major repairs. Common examples: HVAC replacement ($5,000-$12,000), roof repair ($5,000-$15,000), plumbing emergency ($2,000-$8,000), appliance replacement ($1,500-$4,000). These costs are not optional or deferrable — they are legal obligations to your tenant. Your maintenance reserve of **$[X]/year** may not cover a major repair in the year it occurs.

**Severity:** Info

---

### Passive Activity Loss Phase-Out

**Trigger:** Annual gross income ≥ $100,000 (or projected to exceed $100,000 within the time horizon based on salary growth rate)

**Copy:**
> Rental property losses can offset up to $25,000 of your other income per year — but this benefit phases out between $100,000 and $150,000 of adjusted gross income (AGI). At your current income of **$[X]**, your offset is limited to approximately **$[Y]**. With your stated salary growth of **[Z]%/year**, this benefit will be fully phased out by approximately year **[N]** of your projection.

**Severity:** Info

---

## Tax Risk Warnings

### Depreciation Recapture on Future Sale

**Trigger:** User is in Scenario B (keeping as rental) AND time horizon > 3 years

**Copy:**
> If you keep this property as a rental for **[X] years** and then sell, you will owe depreciation recapture tax on all depreciation claimed during that period. Based on your inputs, estimated recapture would be approximately **$[Y]**, taxed at a flat 25% rate — resulting in approximately **$[Z]** in recapture tax. This is in addition to any capital gains tax on the property's appreciation. This tax is unavoidable when selling a depreciated rental property.

**Severity:** Info

---

### Loss of Primary Residence Exclusion

**Trigger:** User is in Scenario B AND time horizon > 3 years

**Copy:**
> When you convert your home to a rental property, you begin losing eligibility for the Section 121 capital gains exclusion ($250,000 single / $500,000 married filing jointly). To qualify, you must have lived in the home as your primary residence for at least 2 of the last 5 years before selling. If you rent it for more than 3 years before selling, you will owe capital gains tax on the full appreciation — not just the appreciation since conversion.

**Severity:** Info (escalate to Warning if time horizon > 3 years)

---

## Market Risk Warnings

### High Appreciation Rate Assumption

**Trigger:** Annual appreciation rate entered > 5% for either property

**Copy:**
> You've entered an annual appreciation rate of **[X]%** for **[property name]**. While some markets have exceeded this rate in recent years, the long-term national average is approximately 3-4%. Higher appreciation assumptions significantly increase the projected net worth difference between scenarios. Consider running the analysis with a conservative rate (3-4%) to see how the outcome changes.

**Severity:** Info

---

### Low or Negative Cash Flow Rental

**Trigger:** Monthly rental cash flow (rent minus all expenses) is negative or < $100

**Copy:**
> Your rental property is projected to generate only **$[X]/month** in net cash flow (after mortgage, taxes, insurance, maintenance, and management). At this margin, any unexpected expense or brief vacancy would result in negative cash flow. The investment thesis for keeping this property depends almost entirely on long-term appreciation — which is not guaranteed.

**Severity:** Warning

---

*Note to founder: These warnings should be reviewed by a licensed attorney, particularly the IRA withdrawal and DTI warnings, which touch on regulated financial areas. The copy is drafted to be informative and protective without being alarmist. Each warning should be visually distinct (colored border, icon) and non-dismissable — the user should see them, not choose to hide them.*
