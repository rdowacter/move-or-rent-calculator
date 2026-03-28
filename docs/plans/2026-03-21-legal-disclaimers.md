# Legal Disclaimers & Compliance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate legal pages (Terms, Privacy, Disclaimer), a global footer, inline micro-disclaimers, a results header disclaimer, and enhanced warning copy into the HomeDecision app.

**Architecture:** Add react-router-dom for page routing. The main calculator stays at `/`. Three legal pages render as standalone content pages at `/terms`, `/privacy`, `/disclaimer`. A new `Footer` component appears in both layouts. Inline disclaimers are small `<p>` elements added to existing result components. Warning copy in `scenarios.ts` gets updated strings with legally protective language.

**Tech Stack:** react-router-dom (new dependency), React, TypeScript, Tailwind CSS, Vitest + React Testing Library

---

### Task 1: Install react-router-dom

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `npm install react-router-dom`

**Step 2: Verify installation**

Run: `npm ls react-router-dom`
Expected: Shows react-router-dom in the dependency tree with no errors.

**Step 3: Commit**

```
git add package.json package-lock.json
git commit -m "chore: add react-router-dom for legal page routing"
```

---

### Task 2: Add routing to App.tsx and main.tsx

The app currently has no router. We need to wrap the app in `BrowserRouter` and add routes so legal pages can live at `/terms`, `/privacy`, `/disclaimer` while the calculator stays at `/`.

**Files:**
- Modify: `src/main.tsx:1-10` — wrap `<App />` in `<BrowserRouter>`
- Modify: `src/App.tsx:1-73` — wrap the existing layout in a `<Routes>` structure with `<Route path="/" element={...calculator layout...} />` and placeholder routes for `/terms`, `/privacy`, `/disclaimer`

**Step 1: Modify main.tsx**

Import `BrowserRouter` from `react-router-dom`. Wrap `<App />` in `<BrowserRouter>`.

**Step 2: Modify App.tsx**

Import `Routes`, `Route` from `react-router-dom`. The existing calculator JSX (lines 60-68, everything inside the `return`) becomes the element for `<Route path="/" />`. Add three placeholder routes for `/terms`, `/privacy`, `/disclaimer` that render temporary `<div>TODO</div>` elements — these will be replaced in Task 5.

Key constraint: The `FormProvider` and `ScenarioModelProvider` should only wrap the calculator route, not the legal pages. Legal pages don't need form context. Move the providers inside the `/` route element, or extract the calculator into its own component that wraps itself in providers.

**Step 3: Verify the app still works**

Run: `npm run dev`
Navigate to `http://localhost:5173/` — calculator should work exactly as before.
Navigate to `http://localhost:5173/terms` — should show the TODO placeholder.

**Step 4: Run existing tests to confirm no regressions**

Run: `npm test`
Expected: All existing tests pass. Some layout tests may need `MemoryRouter` wrapping — fix any that fail by wrapping test renders in `<MemoryRouter>`.

**Step 5: Commit**

```
git add src/main.tsx src/App.tsx
git commit -m "feat: add react-router-dom routing with placeholder legal page routes"
```

---

### Task 3: Create the Footer component

A persistent footer that appears on every page. Contains the global disclaimer line and links to the three legal pages.

**Files:**
- Create: `src/components/Footer.tsx`
- Create: `src/components/__tests__/Footer.test.tsx`

**Step 1: Write the test**

Test that Footer renders:
- The global disclaimer text: "HomeDecision is an educational financial modeling tool"
- Three links: "Full Disclaimer" linking to `/disclaimer`, "Terms" linking to `/terms`, "Privacy" linking to `/privacy`
- Wrap renders in `<MemoryRouter>` since Footer uses `<Link>` components

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Footer.test.tsx`
Expected: FAIL — component doesn't exist yet.

**Step 3: Implement Footer.tsx**

The footer should:
- Use `Link` from `react-router-dom` (not `<a>` tags) for internal navigation
- Be styled with `text-xs text-muted-foreground` for the disclaimer text
- Have a `border-t` separator at the top
- Contain two elements: the disclaimer paragraph and a row of links separated by `·` or `|`
- Use `py-4 px-4` padding

Disclaimer text (from `docs/legal/inline-disclaimers.md` Global Footer):
> HomeDecision is an educational financial modeling tool. It does not provide financial, tax, investment, or legal advice. All projections are estimates — not guarantees. Consult qualified professionals before making financial decisions.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Footer.test.tsx`
Expected: PASS

**Step 5: Commit**

```
git add src/components/Footer.tsx src/components/__tests__/Footer.test.tsx
git commit -m "feat: add Footer component with global disclaimer and legal page links"
```

---

### Task 4: Integrate Footer into both layouts

**Files:**
- Modify: `src/components/DesktopLayout.tsx:21-66` — add Footer below the flex layout
- Modify: `src/components/MobileLayout.tsx:18-41` — add Footer below the Tabs component
- Modify: `src/components/__tests__/Layout.test.tsx` — update tests to wrap in `MemoryRouter` and verify footer renders

**Step 1: Modify DesktopLayout.tsx**

The current layout is `<div className="flex h-screen">` with two children. The footer needs to appear below this. Change the outermost structure to a vertical flex column: an outer `<div className="flex flex-col h-screen">` containing the existing `<div className="flex flex-1 min-h-0">` (the two-column area, now with `flex-1 min-h-0` so it takes remaining space) and the `<Footer />` below it. The footer should NOT scroll — it's pinned to the bottom.

**Step 2: Modify MobileLayout.tsx**

Similar approach: wrap the `<Tabs>` in a flex column container. The tabs area gets `flex-1 min-h-0 overflow-y-auto`. Footer sits below.

**Step 3: Update Layout.test.tsx**

All DesktopLayout and MobileLayout test renders need `<MemoryRouter>` wrapping since Footer uses `<Link>`. Add a test to each layout that checks the footer disclaimer text is present.

**Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass, including new footer assertions.

**Step 5: Visual check**

Run: `npm run dev`
Verify footer is visible at the bottom of both desktop and mobile views. Verify the two-column layout still scrolls correctly and the footer doesn't overlap content.

**Step 6: Commit**

```
git add src/components/DesktopLayout.tsx src/components/MobileLayout.tsx src/components/__tests__/Layout.test.tsx
git commit -m "feat: integrate Footer into DesktopLayout and MobileLayout"
```

---

### Task 5: Create legal page components and wire up routes

Three static content pages that render the legal copy as React components. No calculation logic, no form context needed. Each page has a simple layout: centered container, heading, body content, and a link back to the calculator.

**Files:**
- Create: `src/pages/TermsOfService.tsx`
- Create: `src/pages/PrivacyPolicy.tsx`
- Create: `src/pages/Disclaimer.tsx`
- Create: `src/pages/__tests__/LegalPages.test.tsx`
- Modify: `src/App.tsx` — replace placeholder routes with actual components

**Step 1: Write tests**

One test file covering all three pages. For each page, test:
- It renders the page title (e.g., "Terms of Service", "Privacy Policy", "Disclaimer — About This Tool")
- It contains key legal text (pick one distinctive sentence from each doc to assert on — e.g., for ToS: "HomeDecision is not financial advice", for Privacy: "does not collect, transmit, or store", for Disclaimer: "educational financial modeling tool")
- It has a link back to the calculator (link to `/`)
- Wrap renders in `<MemoryRouter>`

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/__tests__/LegalPages.test.tsx`
Expected: FAIL — files don't exist yet.

**Step 3: Implement the three page components**

Each page follows the same structure:
- Outer `<div>` with `max-w-3xl mx-auto px-4 py-8` for centered, readable width
- A "Back to Calculator" link at the top using `<Link to="/">`
- An `<h1>` with the page title
- A "Last updated" line
- Body content as JSX — translate the markdown from `docs/legal/` into semantic HTML elements (`<h2>`, `<p>`, `<ul>`, `<li>`)
- The Footer component at the bottom

**Source content:**
- `src/pages/TermsOfService.tsx` ← content from `docs/legal/terms-of-service.md`
- `src/pages/PrivacyPolicy.tsx` ← content from `docs/legal/privacy-policy.md`
- `src/pages/Disclaimer.tsx` ← content from `docs/legal/disclaimer.md`

Style notes:
- Use `prose` styling or manual Tailwind: `text-sm leading-relaxed` for body text
- `h2` sections: `text-lg font-semibold mt-8 mb-3`
- Lists: standard `ul` with `list-disc pl-5 space-y-1`
- Replace `[DATE]` placeholders with a constant or today's date
- Replace `[EMAIL ADDRESS]` / `[CONTACT EMAIL]` with a placeholder like `contact@homedecision.app` (or whatever the founder decides)
- Remove the "Note to founder" blocks — those are drafting notes, not user-facing

**Step 4: Wire up routes in App.tsx**

Replace the placeholder `<div>TODO</div>` elements with the actual page components. Import all three from `src/pages/`.

**Step 5: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 6: Visual check**

Run: `npm run dev`
Navigate to each legal page. Verify content renders, "Back to Calculator" link works, and footer appears on legal pages too.

**Step 7: Commit**

```
git add src/pages/ src/App.tsx
git commit -m "feat: add Terms of Service, Privacy Policy, and Disclaimer pages"
```

---

### Task 6: Add results section header disclaimer

A small banner at the top of the results section (inside `ResultsGate`) that frames all results as estimates.

**Files:**
- Modify: `src/components/results/ResultsSections.tsx:75-125` — add a disclaimer paragraph inside `<ResultsGate>`, before the first result group

**Step 1: Write a test**

Add a test in a new or existing test file that renders `ResultsSections` with the necessary providers and asserts the disclaimer text is present: "The results below are estimates based on your inputs and our financial model."

Note: This component requires `FormProvider`, `ScenarioModelProvider`, and `useFormContext` — you'll need the same test wrapper pattern used in existing result component tests. Check `src/components/results/__tests__/` for examples.

If testing is too complex due to provider nesting, this can be verified visually instead. The change is a single `<p>` element.

**Step 2: Implement the change**

Inside `ResultsSections.tsx`, at `line 76` (immediately after `<ResultsGate>` opens and `<div className="space-y-10">` begins, before `<ExecutiveSummary />`), add a `<p>` element:

- Class: `text-xs text-muted-foreground text-center italic`
- Text: "The results below are estimates based on your inputs and our financial model. They are not predictions or guarantees. All assumptions are adjustable — change any input to see how it affects the outcome."

**Step 3: Visual check**

Run: `npm run dev`
Fill in required fields. Verify the disclaimer appears above the Executive Summary.

**Step 4: Run tests**

Run: `npm test`
Expected: All existing tests still pass.

**Step 5: Commit**

```
git add src/components/results/ResultsSections.tsx
git commit -m "feat: add results section header disclaimer"
```

---

### Task 7: Add inline micro-disclaimers to result components

Add small, contextual disclaimer text to five result components. Each is a `<p>` element with `text-xs text-muted-foreground` styling, placed at the end of the component's rendered output.

**Files:**
- Modify: `src/components/results/ExecutiveSummary.tsx:311-343` — add disclaimer after `ScenarioLegend`, before closing `</div>`
- Modify: `src/components/results/NetWorthChart.tsx:103-155` — add disclaimer after `</ResponsiveContainer>`, before closing `</div>`
- Modify: `src/components/results/IRATrajectoryChart.tsx:113-168` — add disclaimer after the existing gap callout `<p>` tag
- Modify: `src/components/results/MonthlyCashFlow.tsx:397-421` — add disclaimer after the grid of cards
- Modify: `src/components/results/UpfrontCapital.tsx:154-169` — add disclaimer after the grid of cards

**Step 1: Add disclaimer to ExecutiveSummary**

After the `<ScenarioLegend />` component (line 341), before the closing `</div>` of the component, add:

Text: "This summary reflects the assumptions and inputs you provided. It is not a recommendation. Review the full analysis and consult a financial professional before making your decision."

**Step 2: Add disclaimer to NetWorthChart**

After the `</ResponsiveContainer>` closing tag (around line 153), before the component's closing `</div>`:

Text: "These projections assume constant annual appreciation rates and investment returns. Actual results will vary — home values, rents, and investment returns fluctuate and can decline significantly."

**Step 3: Add disclaimer to IRATrajectoryChart**

After the existing gap callout `<p>` (line 163-166), add a second `<p>`:

Text: "Retirement projections assume a constant annual return. Actual investment returns vary each year and can be negative. The gap shown grows over time due to compound growth."

**Step 4: Add disclaimer to MonthlyCashFlow**

After the closing `</div>` of the grid (line 420), add:

Text: "Monthly cash flow estimates are projections, not guarantees. Actual expenses vary month to month. The worst-case scenario shows what happens with zero rental income — a real possibility in any given month."

**Step 5: Add disclaimer to UpfrontCapital**

After the closing `</div>` of the grid (line 167), add:

Text: "Closing cost and selling cost estimates use percentage-based approximations. Actual costs vary by market, lender, and negotiation. Get written estimates from your lender and title company before committing."

**Step 6: Run existing component tests**

Run: `npm test`
Expected: All tests pass. These changes only add new elements — they don't modify existing structure.

**Step 7: Visual check**

Run: `npm run dev`
Verify each disclaimer appears below its respective section, styled in small muted text. Verify it doesn't break layout on mobile.

**Step 8: Commit**

```
git add src/components/results/ExecutiveSummary.tsx src/components/results/NetWorthChart.tsx src/components/results/IRATrajectoryChart.tsx src/components/results/MonthlyCashFlow.tsx src/components/results/UpfrontCapital.tsx
git commit -m "feat: add inline micro-disclaimers to result components"
```

---

### Task 8: Enhance warning copy with legally protective language

Update the warning message strings in `scenarios.ts` to include the legally protective qualifiers from `docs/legal/contextual-warnings.md`. The infrastructure doesn't change — only the text content of existing warnings.

**Files:**
- Modify: `src/engine/scenarios.ts:1136-1319` — update message strings in `generateScenarioAWarnings()` and `generateScenarioBWarnings()`

**Step 1: Update DTI warning messages (both functions)**

For DTI > 43% (critical), append: "This is an estimate — lenders calculate DTI using their own methods and may reach a different result."

For DTI > 36% (warning), append: "This is an estimate based on general lending guidelines."

**Step 2: Update capital shortfall messages (both functions)**

Append to existing message: "This estimate does not include moving costs, immediate repairs, or other expenses that may arise during the transition."

Wait — moving costs ARE included in the capital calculation already. Instead, append: "Get written estimates from your lender and title company for exact figures."

**Step 3: Update IRA withdrawal warning (Scenario B only)**

Append to existing message: "Certain exceptions to the 10% penalty may apply (including up to $10,000 for a first-time home purchase). Consult a tax professional to determine if an exception applies to you."

**Step 4: Update landlord repair warning (Scenario B only)**

The existing message at line 1300-1303 already mentions specific repair costs. Append: "Your maintenance reserve may not cover a major repair in the year it occurs."

**Step 5: Run scenario tests**

Run: `npx vitest run src/engine/__tests__/scenarios.test.ts`
Expected: Some tests may check for exact warning message text — update those test assertions to match the new copy.

**Step 6: Run all tests**

Run: `npm test`
Expected: All pass after updating any message-matching assertions.

**Step 7: Commit**

```
git add src/engine/scenarios.ts src/engine/__tests__/scenarios.test.ts
git commit -m "feat: enhance warning copy with legally protective language"
```

---

### Task 9: Expand AssumptionsDisclosure with section-level disclosures

Add the section-level disclosure content (from `docs/legal/section-disclosures.md`) to the existing `AssumptionsDisclosure` component. This keeps all assumption/limitation info in one place rather than scattering it across components.

**Files:**
- Modify: `src/components/results/AssumptionsDisclosure.tsx:24-146` — add new disclosure groups below the existing assumption groups

**Step 1: Add disclosure content**

Add new entries to the `ASSUMPTION_GROUPS` array (or create a separate `DISCLOSURE_GROUPS` array rendered below). Each disclosure group has:
- A title matching the section disclosure names: "About Our Tax Estimates", "About Our Rental Income Projections", "About Our Home Value Projections", "About Our Retirement Account Modeling", "How We Calculate Affordability"
- Items listing what's included and what's NOT included

Alternatively, add a second collapsible section below the existing one titled "Important Limitations" that contains the disclosure content as paragraphs rather than label/source pairs. This may require a small structural change — instead of `{ label, source }` items, use `{ text }` items for the disclosure groups.

**Step 2: Update the footer text**

Replace the existing footer text (line 138-141) with:

"All tax rules reflect 2024 IRS schedules. Actual rates, brackets, and limits may change with future legislation. This tool does not provide financial, tax, investment, or legal advice. Consult a CPA or financial advisor for guidance specific to your situation."

**Step 3: Run tests**

Run: `npm test`
Expected: All pass.

**Step 4: Visual check**

Verify the expanded assumptions section renders correctly and doesn't become overwhelming. The collapsible pattern keeps it hidden by default.

**Step 5: Commit**

```
git add src/components/results/AssumptionsDisclosure.tsx
git commit -m "feat: expand AssumptionsDisclosure with section-level limitation disclosures"
```

---

### Task 10: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 2: Run lint and format**

Run: `npm run lint && npm run format:check`
Expected: No errors or warnings.

**Step 3: Build check**

Run: `npm run build`
Expected: Clean build, zero TypeScript errors.

**Step 4: Full visual walkthrough**

Run: `npm run dev`

Check:
- [ ] Footer visible on calculator page (desktop and mobile)
- [ ] Footer links navigate to `/terms`, `/privacy`, `/disclaimer`
- [ ] Legal pages render full content with "Back to Calculator" link
- [ ] Results header disclaimer appears above Executive Summary
- [ ] Inline disclaimers visible below: Executive Summary, Net Worth Chart, IRA Chart, Monthly Cash Flow, Upfront Capital
- [ ] Warning messages include the new legally protective text
- [ ] Assumptions disclosure includes the expanded limitation content
- [ ] Mobile layout works — footer doesn't overlap tabs, legal pages are readable
- [ ] Navigating back from legal pages returns to calculator with form state preserved

**Step 5: Commit any final fixes**

If any visual or formatting issues found, fix and commit individually.
