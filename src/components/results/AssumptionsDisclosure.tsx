// ---------------------------------------------------------------------------
// AssumptionsDisclosure.tsx — Collapsible section listing all hardcoded
// assumptions and their authoritative sources.
//
// Every financial constant used in the engine is surfaced here so the user
// (and any CPA or advisor reviewing the output) can verify the model's
// assumptions against current law and lending standards.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface AssumptionGroup {
  title: string
  items: { label: string; source: string }[]
}

interface DisclosureGroup {
  title: string
  paragraphs: string[]
}

const ASSUMPTION_GROUPS: AssumptionGroup[] = [
  {
    title: 'Tax Rules (2024 IRS)',
    items: [
      {
        label: 'Federal income tax: 7 marginal brackets from 10% to 37%',
        source: 'IRS Rev. Proc. 2023-34',
      },
      {
        label: 'Standard deduction: $14,600 single / $29,200 MFJ',
        source: 'IRS Rev. Proc. 2023-34',
      },
      {
        label: 'Early withdrawal penalty: 10% on retirement account distributions before age 59.5',
        source: 'IRC \u00A772(t)',
      },
      {
        label: 'Retirement contribution limit: $7,000/year under 50',
        source: 'IRC \u00A7219(b)',
      },
      {
        label: 'Depreciation: Straight-line over 27.5 years on structure only',
        source: 'IRC \u00A7168',
      },
      {
        label: 'Depreciation recapture: 25% flat rate on sale',
        source: 'IRC \u00A71250',
      },
      {
        label: 'Long-term capital gains: 0% / 15% / 20% based on income',
        source: 'IRC \u00A71(h)',
      },
      {
        label: 'Passive loss offset: Up to $25,000, phases out $100k\u2013$150k AGI',
        source: 'IRC \u00A7469',
      },
    ],
  },
  {
    title: 'Lending Standards',
    items: [
      {
        label: 'PMI auto-cancellation: 78% LTV',
        source: 'Homeowners Protection Act',
      },
      {
        label: 'PMI request cancellation: 80% LTV',
        source: 'Homeowners Protection Act',
      },
      {
        label: 'DTI targets: 28% front-end, 36% back-end, 43% QM maximum',
        source: 'Fannie Mae / CFPB',
      },
    ],
  },
  {
    title: 'Stress Test Assumptions',
    items: [
      {
        label: 'Vacancy shock: 3 months of lost rent',
        source: 'Conservative estimate',
      },
      {
        label: 'Major repair: $8,000 (e.g., HVAC replacement)',
        source: 'Industry estimate',
      },
      {
        label: 'Income disruption: 20% income reduction',
        source: 'Conservative estimate',
      },
      {
        label: 'Market downturn: 10% home value decline',
        source: 'Moderate correction scenario',
      },
    ],
  },
]

const DISCLOSURE_GROUPS: DisclosureGroup[] = [
  {
    title: 'About Our Tax Estimates',
    paragraphs: [
      'Our tax calculations use 2024 federal income tax brackets published by the IRS (Revenue Procedure 2023-34). We calculate taxes using the marginal bracket method — each dollar of income is taxed only at the rate for the bracket it falls into, not a flat rate.',
      'What we include: Federal income tax on wages and IRA withdrawals, the 10% early withdrawal penalty for traditional IRA distributions before age 59.5, standard deduction, long-term capital gains rates (0%/15%/20%), depreciation recapture at 25%, and passive activity loss rules with AGI phase-out.',
      'What we do not include: State income taxes beyond a flat rate you enter, Alternative Minimum Tax (AMT), Net Investment Income Tax (3.8%), itemized deductions, tax credits, Qualified Business Income deductions, and future changes to tax law.',
    ],
  },
  {
    title: 'About Our Rental Income Projections',
    paragraphs: [
      'Rental income projections are based on the monthly rent and vacancy rate you enter. We reduce annual rental income by the vacancy percentage to approximate months without a paying tenant.',
      'What we include: Gross rent, vacancy reduction, property management fees, annual maintenance reserve, landlord insurance premium increase, tenant turnover costs, and annual rent growth.',
      'What we do not include: Tenant screening costs, legal fees for lease disputes or evictions (which can cost $3,000–$10,000+), property damage beyond normal wear, HOA special assessments, or market-driven rent decreases.',
    ],
  },
  {
    title: 'About Our Home Value Projections',
    paragraphs: [
      'We project future home values using a steady annual appreciation rate that you set. This rate applies uniformly to every year of the projection.',
      'Home values fluctuate based on local supply and demand, interest rates, economic cycles, and neighborhood-specific factors. During 2008–2011, many US markets experienced 20–40% price declines.',
      'The net worth projections are highly sensitive to the appreciation rate you choose. A 1% difference in annual appreciation can change the 20-year outcome by $50,000–$100,000 or more.',
    ],
  },
  {
    title: 'About Our Retirement Account Modeling',
    paragraphs: [
      'We model IRA growth using a steady annual return rate that you set. Contributions are added annually and compound at this rate over your selected time horizon.',
      'What we include: Current IRA balance, annual contributions, compound growth, early withdrawal penalty (10% before age 59.5), and income tax on traditional IRA withdrawals.',
      'What we do not include: Roth IRA tax-free withdrawal rules, Required Minimum Distributions (RMDs), catch-up contributions for individuals over 50, exceptions to the early withdrawal penalty, or investment-specific risk profiles.',
    ],
  },
  {
    title: 'How We Calculate Affordability',
    paragraphs: [
      'We calculate monthly affordability by comparing your take-home income against all housing costs, living expenses, and debt payments in each scenario.',
      'The "bad month" scenario shows what your cash flow looks like when the rental property earns zero income — carrying both mortgages on your salary alone. If this number is negative, you would need to draw from savings every month the property is vacant.',
      'Our DTI estimate uses standard Fannie Mae guidelines and credits rental income at 75%. Your lender may use different calculations. A DTI above 43% may disqualify you from a Qualified Mortgage.',
    ],
  },
]

export function AssumptionsDisclosure() {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span>{open ? 'Hide Assumptions' : 'Show Assumptions & Sources'}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-5">
          {ASSUMPTION_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h4>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-4 text-xs"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.source}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* Section-level disclosures */}
          {DISCLOSURE_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            All tax rules reflect 2024 IRS schedules. Actual rates, brackets, and limits may change with
            future legislation. This tool does not provide financial, tax, investment, or legal advice.
            Consult a CPA or financial advisor for guidance specific to your situation.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
