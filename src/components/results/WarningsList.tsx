// ---------------------------------------------------------------------------
// WarningsList.tsx — Renders contextual warnings from all three scenarios,
// sorted by severity (critical first) with appropriate visual styling.
//
// Warnings are first-class features in this tool. A critical warning about
// DTI exceeding 43% or a cash shortfall is more important than any chart.
// This component ensures those warnings are visible, clear, and actionable.
// ---------------------------------------------------------------------------

import {
  AlertTriangle,
  Info,
  DollarSign,
  Building2,
  PiggyBank,
  Wallet,
  Receipt,
  Home,
  TrendingDown,
} from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { formatCurrency } from '@/utils/formatters'
import type { Warning, WarningCategory, WarningSeverity } from '@/engine/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Severity ordering — critical warnings surface first because they represent
// risks that could make the entire plan unworkable (e.g., can't qualify for
// the mortgage, negative cash flow, zero emergency reserves).
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<WarningSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

// ---------------------------------------------------------------------------
// Category → icon mapping — gives users a visual cue about what domain
// each warning relates to without reading the full text.
// ---------------------------------------------------------------------------

function getCategoryIcon(category: WarningCategory) {
  switch (category) {
    case 'lending':
      return Building2
    case 'retirement':
      return PiggyBank
    case 'liquidity':
      return Wallet
    case 'tax':
      return Receipt
    case 'landlord':
      return Home
    case 'market':
      return TrendingDown
  }
}

// ---------------------------------------------------------------------------
// Severity → icon mapping — provides an additional visual indicator
// beyond color, per accessibility guidelines (color is never the only signal).
// ---------------------------------------------------------------------------

function getSeverityIcon(severity: WarningSeverity) {
  switch (severity) {
    case 'critical':
      return AlertTriangle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
  }
}

/** A warning tagged with the scenario it came from. */
interface TaggedWarning extends Warning {
  scenarioName: string
}

/**
 * WarningsList — collects warnings from all three scenarios, sorts them
 * by severity, and renders each one as a styled Alert component.
 *
 * Returns null if there are no warnings across any scenario, or if the
 * model output has not yet been computed.
 */
export function WarningsList() {
  const { modelOutput } = useModelOutput()

  if (!modelOutput) {
    return null
  }

  // Collect warnings from all scenarios, tagging each with its source
  const taggedWarnings: TaggedWarning[] = [
    ...modelOutput.baseline.warnings.map((w) => ({
      ...w,
      scenarioName: modelOutput.baseline.name,
    })),
    ...modelOutput.scenarioA.warnings.map((w) => ({
      ...w,
      scenarioName: modelOutput.scenarioA.name,
    })),
    ...modelOutput.scenarioB.warnings.map((w) => ({
      ...w,
      scenarioName: modelOutput.scenarioB.name,
    })),
  ]

  if (taggedWarnings.length === 0) {
    return null
  }

  // Sort by severity: critical → warning → info
  const sorted = [...taggedWarnings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  return (
    <div className="space-y-3" role="region" aria-label="Warnings">
      <h3 className="text-lg font-semibold">Warnings & Risks</h3>
      {sorted.map((warning, index) => (
        <WarningAlert key={`${warning.scenarioName}-${warning.category}-${index}`} warning={warning} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual warning alert — maps severity to shadcn Alert variants
// ---------------------------------------------------------------------------

function WarningAlert({ warning }: { warning: TaggedWarning }) {
  const SeverityIcon = getSeverityIcon(warning.severity)
  const _CategoryIcon = getCategoryIcon(warning.category)

  // Determine variant and additional styling based on severity
  const variant = warning.severity === 'critical' ? 'destructive' : 'default'

  const severityClassName = cn(
    warning.severity === 'warning' && 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
    warning.severity === 'info' && 'border-muted bg-muted/50 text-muted-foreground'
  )

  return (
    <Alert variant={variant} className={severityClassName}>
      <SeverityIcon className="size-4" />
      <AlertTitle className="flex items-center gap-2">
        <span>{warning.message}</span>
        {warning.dollarImpact !== undefined && (
          <span className="font-semibold whitespace-nowrap">
            Impact: {formatCurrency(warning.dollarImpact)}
          </span>
        )}
      </AlertTitle>
      <AlertDescription>
        {warning.scenarioName}
        {warning.dollarImpact !== undefined && (
          <DollarSign className="inline-block ml-1 size-3" aria-hidden="true" />
        )}
      </AlertDescription>
    </Alert>
  )
}
