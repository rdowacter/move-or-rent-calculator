import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { AboutYouSection } from '@/components/sections/AboutYouSection'
import { RetirementSection } from '@/components/sections/RetirementSection'
import { CurrentHomeSection } from '@/components/sections/CurrentHomeSection'
import { NewHomeSection } from '@/components/sections/NewHomeSection'
import { CommuteSection } from '@/components/sections/CommuteSection'
import { CostsProjectionSection } from '@/components/sections/CostsProjectionSection'
import { User, PiggyBank, Home, Building2, Car, Settings } from 'lucide-react'

/** All accordion section values for programmatic control */
const ALL_SECTIONS = [
  'about-you',
  'retirement',
  'current-home',
  'new-home',
  'commute',
  'costs-projection',
] as const

interface InputAccordionProps {
  /** Which sections to expand by default. Defaults to ['about-you']. */
  defaultOpenSections?: string[]
}

/**
 * InputAccordion renders 6 collapsible sections for all scenario inputs.
 * Uses shadcn Accordion with `multiple` so users can keep several sections
 * open at once. Each section uses progressive disclosure — primary fields
 * are always visible when expanded, advanced fields are behind a toggle.
 */
function InputAccordion({ defaultOpenSections = ['about-you'] }: InputAccordionProps) {
  return (
    <Accordion multiple defaultValue={defaultOpenSections} className="space-y-2">
      <AccordionItem value="about-you" className="rounded-lg border border-border/50 px-4 data-open:bg-blue-50/30 data-open:shadow-sm data-open:border-blue-200/50 dark:data-open:bg-blue-950/20 dark:data-open:border-blue-800/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">About You</div>
              <div className="text-xs font-normal text-muted-foreground">Income, age, filing status, savings</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <AboutYouSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="retirement" className="rounded-lg border border-border/50 px-4 data-open:bg-emerald-50/30 data-open:shadow-sm data-open:border-emerald-200/50 dark:data-open:bg-emerald-950/20 dark:data-open:border-emerald-800/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Retirement</div>
              <div className="text-xs font-normal text-muted-foreground">IRA balance, withdrawal, contributions</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <RetirementSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="current-home" className="rounded-lg border border-border/50 px-4 data-open:bg-amber-50/30 data-open:shadow-sm data-open:border-amber-200/50 dark:data-open:bg-amber-950/20 dark:data-open:border-amber-800/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Home className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Current Home</div>
              <div className="text-xs font-normal text-muted-foreground">Mortgage, rent, property details</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CurrentHomeSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="new-home" className="rounded-lg border border-border/50 px-4 data-open:bg-violet-50/30 data-open:shadow-sm data-open:border-violet-200/50 dark:data-open:bg-violet-950/20 dark:data-open:border-violet-800/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">New Home</div>
              <div className="text-xs font-normal text-muted-foreground">Purchase price, down payment, costs</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <NewHomeSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="commute" className="rounded-lg border border-border/50 px-4 data-open:bg-rose-50/30 data-open:shadow-sm data-open:border-rose-200/50 dark:data-open:bg-rose-950/20 dark:data-open:border-rose-800/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Car className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Commute</div>
              <div className="text-xs font-normal text-muted-foreground">Miles, tolls, time saved</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CommuteSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="costs-projection" className="rounded-lg border border-border/50 px-4 data-open:bg-slate-50/30 data-open:shadow-sm data-open:border-slate-200/50 dark:data-open:bg-slate-950/20 dark:data-open:border-slate-700/30">
        <AccordionTrigger>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Settings className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Costs &amp; Assumptions</div>
              <div className="text-xs font-normal text-muted-foreground">Moving costs, escalation rates, insurance</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CostsProjectionSection />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export { InputAccordion, ALL_SECTIONS }
