import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactCurrency,
} from '../formatters';

describe('formatCurrency', () => {
  it('rounds to whole dollars by default (no cents for large numbers)', () => {
    // $1,234.56 rounds to $1,235 — no decimal display by default
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('shows cents when option is specified', () => {
    expect(formatCurrency(1234.56, { cents: true })).toBe('$1,234.56');
  });

  it('handles negative values with minus sign before dollar sign', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('handles large values with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });

  it('handles small cent values with cents option', () => {
    expect(formatCurrency(0.99, { cents: true })).toBe('$0.99');
  });

  it('handles negative zero', () => {
    // -0 should display as $0, not -$0
    expect(formatCurrency(-0)).toBe('$0');
  });

  it('handles negative with cents', () => {
    expect(formatCurrency(-1234.56, { cents: true })).toBe('-$1,234.56');
  });
});

describe('formatPercent', () => {
  it('converts decimal to percentage string', () => {
    // 0.0325 → 3.25%
    expect(formatPercent(0.0325)).toBe('3.25%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('handles whole number percentages without trailing decimals', () => {
    // 0.05 → 5%, not 5.00%
    expect(formatPercent(0.05)).toBe('5%');
  });

  it('handles 100%', () => {
    expect(formatPercent(1)).toBe('100%');
  });

  it('handles small fractions', () => {
    // 0.001 → 0.1%
    expect(formatPercent(0.001)).toBe('0.1%');
  });
});

describe('formatNumber', () => {
  it('adds thousands separator', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles small numbers without comma', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('handles large numbers', () => {
    expect(formatNumber(1234567890)).toBe('1,234,567,890');
  });
});

describe('formatCompactCurrency', () => {
  it('formats millions with M suffix', () => {
    // $1,500,000 → $1.5M
    expect(formatCompactCurrency(1_500_000)).toBe('$1.5M');
  });

  it('formats thousands with K suffix', () => {
    // $250,000 → $250K
    expect(formatCompactCurrency(250_000)).toBe('$250K');
  });

  it('formats exact million', () => {
    expect(formatCompactCurrency(1_000_000)).toBe('$1M');
  });

  it('formats small values without suffix', () => {
    expect(formatCompactCurrency(500)).toBe('$500');
  });

  it('handles zero', () => {
    expect(formatCompactCurrency(0)).toBe('$0');
  });

  it('formats hundreds of thousands', () => {
    expect(formatCompactCurrency(100_000)).toBe('$100K');
  });
});
