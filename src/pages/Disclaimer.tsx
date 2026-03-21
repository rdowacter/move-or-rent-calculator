import { Link } from 'react-router-dom'
import { Footer } from '@/components/Footer'

export function Disclaimer() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline">
          &larr; Back to Calculator
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Disclaimer — About This Tool</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 21, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">This Tool Does Not Provide Financial Advice</h2>
            <p>
              HomeDecision is an educational financial modeling tool. It generates projections and estimates to help you explore the financial implications of selling your home versus keeping it as a rental property.
            </p>
            <p className="mt-3">
              <strong>HomeDecision does not provide financial, tax, investment, legal, or real estate advice.</strong> No recommendation is made or implied by the tool&apos;s output. The projections are scenarios — not advice, endorsements, or guarantees of any outcome.
            </p>
            <p className="mt-3">
              No fiduciary, advisory, or professional-client relationship is created between you and HomeDecision through your use of this tool.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">How Our Calculations Work</h2>

            <h3 className="text-base font-semibold mt-6 mb-2">Tax Estimates</h3>
            <p>
              Our tax calculations use simplified models based on <strong>2024 IRS federal income tax schedules</strong> (IRS Rev. Proc. 2023-34). These models:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Apply marginal federal tax brackets to estimate income tax on wages and IRA withdrawals</li>
              <li>Estimate early withdrawal penalties on traditional IRA distributions before age 59.5 per IRC Section 72(t)</li>
              <li>Calculate depreciation using the straight-line method over 27.5 years per IRC Section 168</li>
              <li>Estimate depreciation recapture tax at 25% per IRC Section 1250</li>
              <li>Estimate long-term capital gains tax at 0%, 15%, or 20% based on taxable income per IRC Section 1(h)</li>
              <li>Apply passive activity loss rules per IRC Section 469, including the $25,000 offset and AGI phase-out</li>
            </ul>

            <p className="mt-4"><strong>What our tax model does NOT account for:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>State and local income taxes beyond a flat user-entered rate</li>
              <li>Alternative Minimum Tax (AMT)</li>
              <li>Net Investment Income Tax (3.8% surtax)</li>
              <li>Self-employment taxes</li>
              <li>Itemized deductions beyond the standard deduction</li>
              <li>Tax credits (child tax credit, earned income credit, education credits, etc.)</li>
              <li>Qualified Business Income (QBI) deductions</li>
              <li>State-specific property tax rules, homestead exemptions, or assessment caps</li>
              <li>Future changes to tax law, brackets, or rates</li>
              <li>Your complete tax return — only the specific scenarios modeled</li>
            </ul>
            <p className="mt-3">
              <strong>Your actual tax liability will differ from our estimates.</strong> Consult a CPA or tax professional before making decisions based on our tax projections.
            </p>

            <h3 className="text-base font-semibold mt-6 mb-2">Home Value Projections</h3>
            <p>
              Home value projections assume a <strong>steady annual appreciation rate</strong> that you set. This is a simplification. In reality:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Home values fluctuate based on local market conditions, economic cycles, interest rates, and neighborhood-specific factors</li>
              <li>Many US markets experienced 20-40% declines during 2008-2011</li>
              <li>Past appreciation does not predict future appreciation</li>
              <li>Property taxes and insurance often increase faster than home values</li>
              <li>The tool does not model market downturns, corrections, or housing bubbles</li>
            </ul>

            <h3 className="text-base font-semibold mt-6 mb-2">Rental Income Projections</h3>
            <p>Rental income projections assume:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>A vacancy rate that you set (default: 8%) applied as a flat annual reduction</li>
              <li>Actual vacancy is unpredictable and may be significantly higher, especially in the first year or during economic downturns</li>
              <li>The rent amount you enter is achievable in your market — the tool does not verify this</li>
              <li>Maintenance costs are estimated as a percentage of home value — actual costs vary widely and often come in large, unexpected amounts (HVAC failure, roof repair, plumbing emergency)</li>
              <li>Property management fees, if entered, are a percentage of collected rent</li>
              <li>The model does not account for tenant disputes, eviction costs (which can exceed $5,000 and take months), property damage beyond normal wear, or legal liability as a landlord</li>
            </ul>

            <h3 className="text-base font-semibold mt-6 mb-2">Mortgage and Lending Estimates</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Debt-to-income (DTI) ratio calculations use standard formulas per Fannie Mae guidelines</li>
              <li><strong>DTI estimates are not mortgage pre-approvals.</strong> Lenders use their own underwriting criteria, additional factors (credit score, employment history, asset verification), and may calculate DTI differently</li>
              <li>PMI calculations are estimates. Actual PMI rates depend on your credit score, loan-to-value ratio, and lender</li>
              <li>Interest rates shown are inputs you provide, not rates you are guaranteed to receive</li>
              <li>Closing cost estimates are approximations. Actual closing costs vary by lender, location, and transaction type</li>
            </ul>

            <h3 className="text-base font-semibold mt-6 mb-2">Retirement Account Projections</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>IRA and retirement projections assume a <strong>steady annual return rate</strong> that you set</li>
              <li>Actual investment returns vary year to year, can be negative, and are not guaranteed</li>
              <li>The tool applies a simplified early withdrawal penalty and tax calculation — exceptions to the 10% penalty (first-time home purchase up to $10,000, substantially equal periodic payments, disability, and others per IRC Section 72(t)) are not automatically applied</li>
              <li>Employer match calculations are simplified and may not reflect your specific plan rules</li>
              <li>The tool does not model Roth conversion strategies, required minimum distributions, or catch-up contributions for individuals over 50</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">Limitations of This Tool</h2>
            <p>
              HomeDecision is a <strong>simplified financial model.</strong> It is designed to help you think through a complex decision, not to replace professional analysis. Key limitations include:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm mt-3">
              <li><strong>Projections are not predictions.</strong> Every projection assumes that current conditions and the rates you enter remain constant. They will not.</li>
              <li><strong>The model is deterministic.</strong> It shows one outcome per scenario based on your inputs. It does not model the range of possible outcomes, probability distributions, or worst-case scenarios beyond the built-in stress tests.</li>
              <li><strong>Not all costs are modeled.</strong> The tool does not account for every expense associated with homeownership, landlording, or property transactions. Examples of unmodeled costs include: legal fees, HOA special assessments, environmental remediation, zoning changes, natural disaster damage, and opportunity costs of time spent as a landlord.</li>
              <li><strong>Tax law changes.</strong> Federal tax brackets, deduction amounts, capital gains rates, depreciation rules, and IRA contribution limits change periodically. The tool uses 2024 values and does not predict future changes.</li>
              <li><strong>Local market variation.</strong> Real estate is local. Average appreciation rates, rental yields, property tax rates, insurance costs, and landlord-tenant laws vary dramatically by state, county, and neighborhood.</li>
              <li><strong>Personal circumstances.</strong> The tool cannot account for life changes such as job loss, disability, divorce, inheritance, medical expenses, or other events that materially affect your financial situation.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">Your Responsibility</h2>
            <p>By using HomeDecision, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>All projections are <strong>estimates for educational purposes only</strong></li>
              <li>You will <strong>not rely solely on this tool</strong> to make financial decisions</li>
              <li>You are responsible for <strong>verifying all assumptions and inputs</strong> against your actual situation</li>
              <li>You will <strong>consult qualified professionals</strong> (CPA, financial advisor, attorney, lender) before making major financial decisions</li>
              <li>You understand that <strong>actual financial outcomes will differ</strong> from the projections shown</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">Consult a Professional</h2>
            <p>We strongly recommend discussing your specific situation with:</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Professional</th>
                    <th className="text-left py-2 font-semibold">What They Can Help With</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><strong>CPA or Tax Advisor</strong></td>
                    <td className="py-2">Actual tax liability, deduction optimization, depreciation strategy, state-specific rules</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><strong>Financial Advisor (fee-only)</strong></td>
                    <td className="py-2">Retirement planning, IRA withdrawal strategy, overall financial plan</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><strong>Mortgage Lender</strong></td>
                    <td className="py-2">Actual qualification, rates, terms, and whether you can carry two mortgages</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><strong>Real Estate Attorney</strong></td>
                    <td className="py-2">Landlord-tenant law, lease agreements, liability protection, entity structuring</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><strong>Insurance Agent</strong></td>
                    <td className="py-2">Landlord insurance, umbrella policy, actual premium quotes</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4"><strong>Property Manager</strong></td>
                    <td className="py-2">Realistic rent estimates, vacancy rates, and maintenance expectations for your market</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">Contact</h2>
            <p>
              If you have questions about this disclaimer or how the tool works, contact us at: <strong>contact@homedecision.app</strong>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
