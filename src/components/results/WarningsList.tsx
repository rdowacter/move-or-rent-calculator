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
} from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useModelOutput } from '@/components/ScenarioModelProvider'
import { formatCurrency } from '@/utils/formatters'
import type { Warning, WarningSeverity } from '@/engine/types'
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

  // Group warnings by scenario
  const scenarioGroups = [
    { name: modelOutput.baseline.name, warnings: modelOutput.baseline.warnings },
    { name: modelOutput.scenarioA.name, warnings: modelOutput.scenarioA.warnings },
    { name: modelOutput.scenarioB.name, warnings: modelOutput.scenarioB.warnings },
  ].filter((group) => group.warnings.length > 0)

  if (scenarioGroups.length === 0) {
    return null
  }

  return (
    <div className="space-y-5" role="region" aria-label="Warnings">
      {scenarioGroups.map((group) => {
        const sorted = [...group.warnings].sort(
          (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        )
        return (
          <div key={group.name}>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{group.name}</h4>
            <div className="space-y-2">
              {sorted.map((warning, index) => (
                <WarningAlert
                  key={`${group.name}-${warning.category}-${index}`}
                  warning={{ ...warning, scenarioName: group.name }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual warning alert — maps severity to shadcn Alert variants
// ---------------------------------------------------------------------------

function WarningAlert({ warning }: { warning: TaggedWarning }) {
  const SeverityIcon = getSeverityIcon(warning.severity)

  // Determine variant and additional styling based on severity
  const variant = warning.severity === 'critical' ? 'destructive' : 'default'

  const severityClassName = cn(
    warning.severity === 'warning' && 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
    warning.severity === 'info' && 'border-muted bg-muted/50 text-muted-foreground'
  )

  return (
    <Alert variant={variant} className={severityClassName}>
      <SeverityIcon className={cn(
        "size-4",
        warning.severity === 'critical' && 'text-red-600 dark:text-red-400',
        warning.severity === 'warning' && 'text-amber-600 dark:text-amber-400',
        warning.severity === 'info' && 'text-muted-foreground'
      )} />
      <AlertTitle>{warning.message}</AlertTitle>
      {warning.dollarImpact !== undefined && (
        <AlertDescription className="flex items-center gap-1">
          <DollarSign className="size-3" aria-hidden="true" />
          Impact: {formatCurrency(warning.dollarImpact)}
        </AlertDescription>
      )}
    </Alert>
  )
}
