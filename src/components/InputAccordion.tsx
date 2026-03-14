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
    <Accordion multiple defaultValue={defaultOpenSections}>
      <AccordionItem value="about-you">
        <AccordionTrigger>About You</AccordionTrigger>
        <AccordionContent>
          <AboutYouSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="retirement">
        <AccordionTrigger>Retirement</AccordionTrigger>
        <AccordionContent>
          <RetirementSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="current-home">
        <AccordionTrigger>Current Home (Kyle)</AccordionTrigger>
        <AccordionContent>
          <CurrentHomeSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="new-home">
        <AccordionTrigger>New Home (Austin)</AccordionTrigger>
        <AccordionContent>
          <NewHomeSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="commute">
        <AccordionTrigger>Commute</AccordionTrigger>
        <AccordionContent>
          <CommuteSection />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="costs-projection">
        <AccordionTrigger>Costs &amp; Projection</AccordionTrigger>
        <AccordionContent>
          <CostsProjectionSection />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export { InputAccordion, ALL_SECTIONS }
