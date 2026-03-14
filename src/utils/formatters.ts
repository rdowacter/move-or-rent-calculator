/**
 * Formatting utilities for consistent display of financial values throughout the UI.
 *
 * All formatters use Intl.NumberFormat for locale-safe formatting (en-US).
 * These are thin wrappers — no financial logic lives here.
 */

interface FormatCurrencyOptions {
  /** Show cents (2 decimal places). Default: false (rounds to whole dollars). */
  cents?: boolean;
}

/**
 * Format a number as US currency.
 *
 * By default, rounds to whole dollars (no cents) since most financial
 * projections don't need cent-level precision.
 *
 * @example
 * formatCurrency(1234.56)                → "$1,235"
 * formatCurrency(1234.56, { cents: true }) → "$1,234.56"
 * formatCurrency(-500)                   → "-$500"
 */
export function formatCurrency(
  value: number,
  options: FormatCurrencyOptions = {}
): string {
  const { cents = false } = options;

  // Normalize negative zero to zero
  const normalizedValue = Object.is(value, -0) ? 0 : value;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

  return formatter.format(normalizedValue);
}

/**
 * Format a decimal as a percentage string.
 *
 * Strips unnecessary trailing zeros (e.g., 5% not 5.00%).
 * Supports up to 2 decimal places for rates like 3.25%.
 *
 * @example
 * formatPercent(0.0325) → "3.25%"
 * formatPercent(0.05)   → "5%"
 * formatPercent(0)      → "0%"
 */
export function formatPercent(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}

/**
 * Format a number with thousands separators.
 *
 * @example
 * formatNumber(12345) → "12,345"
 */
export function formatNumber(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  });

  return formatter.format(value);
}

/**
 * Format a currency value in compact notation for dashboards and charts.
 *
 * Uses K for thousands and M for millions. Values under 1,000 are shown
 * as plain currency.
 *
 * @example
 * formatCompactCurrency(1_500_000) → "$1.5M"
 * formatCompactCurrency(250_000)   → "$250K"
 * formatCompactCurrency(500)       → "$500"
 */
export function formatCompactCurrency(value: number): string {
  if (value === 0) return '$0';

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    const millions = value / 1_000_000;
    // Remove trailing zeros: 1.0 → "1", 1.5 → "1.5"
    const formatted = millions % 1 === 0
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(/\.?0+$/, '');
    return `$${formatted}M`;
  }

  if (absValue >= 1_000) {
    const thousands = value / 1_000;
    const formatted = thousands % 1 === 0
      ? thousands.toFixed(0)
      : thousands.toFixed(1).replace(/\.?0+$/, '');
    return `$${formatted}K`;
  }

  return formatCurrency(value);
}
