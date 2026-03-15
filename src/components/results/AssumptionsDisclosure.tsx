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
        label: 'Early withdrawal penalty: 10% on IRA distributions before age 59.5',
        source: 'IRC \u00A772(t)',
      },
      {
        label: 'IRA contribution limit: $7,000/year under 50',
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
          <p className="text-xs text-muted-foreground pt-2 border-t">
            All tax rules reflect 2024 IRS schedules. Actual rates, brackets, and limits
            may change with future legislation. Consult a CPA for personalized tax advice.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
