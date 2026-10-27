import { describe, expect, it } from 'vitest';
import { formatPercent, parseAmount } from './format.js';

describe('parseAmount', () => {
  it('accepts plain, grouped and decimal amounts', () => {
    expect(parseAmount('100')).toEqual({ value: '100' });
    expect(parseAmount(' 1,250.50 ')).toEqual({ value: '1250.50' });
    expect(parseAmount('.5')).toEqual({ value: '.5' });
  });

  it.each([
    ['', 'Enter an amount to convert.'],
    ['abc', 'Enter a valid number, for example 100 or 25.50.'],
    ['-5', 'The amount must be greater than zero.'],
    ['0', 'The amount must be greater than zero.'],
    ['1.123456789', 'Use at most 8 decimal places.'],
    ['10000000000000000', 'The amount is too large to convert.'],
  ])('rejects %j', (input, message) => {
    expect(parseAmount(input)).toEqual({ error: message });
  });
});

describe('formatPercent', () => {
  it('adds a sign and never shows a value for missing input', () => {
    expect(formatPercent(1.234)).toMatch(/^\+1[.,]23%$/);
    expect(formatPercent(-0.5)).toMatch(/^−0[.,]50%$/);
    expect(formatPercent(null)).toBe('—');
  });
});
