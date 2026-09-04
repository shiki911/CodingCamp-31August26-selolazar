// Feature: personal-productivity-dashboard
// Properties 16–18: sanitizeName, validateDuration

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─────────────────────────────────────────────────────────
// Pure logic extracted from SettingsPanel (app.js)
// These match the implementations in js/app.js exactly.
// ─────────────────────────────────────────────────────────

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 50);
}

function validateDuration(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 120) {
    return { valid: false, error: 'Duration must be a whole number between 1 and 120 minutes.' };
  }
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────────────────
// Property 16: Display Name Trimming
// Validates: Requirements 6.2
// ─────────────────────────────────────────────────────────
describe('sanitizeName — Property 16: Display Name Trimming', () => {
  // Feature: personal-productivity-dashboard, Property 16: For any name string with leading/trailing whitespace,
  // sanitizeName(name) shall return a value equal to name.trim()
  it('trims leading and trailing whitespace (property)', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 48 }),
        fc.string({ maxLength: 0, minLength: 0 }).chain(() =>
          fc.constantFrom(' ', '\t', '\n', '  ', '\t\t')
        ),
        fc.string({ maxLength: 0, minLength: 0 }).chain(() =>
          fc.constantFrom(' ', '\t', '\n', '  ', '\t\t')
        ),
        (middle, leading, trailing) => {
          const raw = leading + middle + trailing;
          const result = sanitizeName(raw);
          expect(result).toBe(raw.trim().slice(0, 50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('trims a string with only leading whitespace', () => {
    expect(sanitizeName('   hello')).toBe('hello');
  });

  it('trims a string with only trailing whitespace', () => {
    expect(sanitizeName('hello   ')).toBe('hello');
  });

  it('trims a string with both leading and trailing whitespace', () => {
    expect(sanitizeName('  hello world  ')).toBe('hello world');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeName('   ')).toBe('');
    expect(sanitizeName('\t\n')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────
// Property 17: Display Name Length Cap
// Validates: Requirements 6.5
// ─────────────────────────────────────────────────────────
describe('sanitizeName — Property 17: Display Name Length Cap', () => {
  // Feature: personal-productivity-dashboard, Property 17: For any name string of any length,
  // sanitizeName(name) shall return a value whose length is at most 50 characters.
  it('caps the result at 50 characters (property)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (raw) => {
          const result = sanitizeName(raw);
          expect(result.length).toBeLessThanOrEqual(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns exactly 50 characters when input is longer than 50 (after trim)', () => {
    const longName = 'A'.repeat(100);
    expect(sanitizeName(longName).length).toBe(50);
  });

  it('preserves short names unchanged (after trim)', () => {
    expect(sanitizeName('Alex')).toBe('Alex');
    expect(sanitizeName('Jo')).toBe('Jo');
  });

  it('handles non-string input gracefully', () => {
    expect(sanitizeName(null)).toBe('');
    expect(sanitizeName(undefined)).toBe('');
    expect(sanitizeName(42)).toBe('');
    expect(sanitizeName({})).toBe('');
  });

  it('handles empty string input', () => {
    expect(sanitizeName('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────
// Property 18: Settings Duration Validation Range
// Validates: Requirements 7.2, 7.4
// ─────────────────────────────────────────────────────────
describe('validateDuration — Property 18: Settings Duration Validation Range', () => {
  // Feature: personal-productivity-dashboard, Property 18: For any integer value in [1, 120],
  // validateDuration(value) shall return { valid: true }.
  // For any value outside [1, 120] or any non-numeric value, it shall return { valid: false, error: <non-empty string> }.
  it('accepts all integers in [1, 120] (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 120 }),
        (value) => {
          const result = validateDuration(value);
          expect(result.valid).toBe(true);
          expect(result.error).toBeNull();
        }
      ),
      { numRuns: 120 }
    );
  });

  it('rejects integers outside [1, 120] (property)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 121 })
        ),
        (value) => {
          const result = validateDuration(value);
          expect(result.valid).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer numbers (property)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 120, noNaN: true }).filter(v => !Number.isInteger(v)),
        (value) => {
          const result = validateDuration(value);
          expect(result.valid).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-numeric values (property)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (value) => {
          const result = validateDuration(value);
          expect(result.valid).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Example-based boundary tests
  it('accepts boundary values 1 and 120', () => {
    expect(validateDuration(1)).toEqual({ valid: true, error: null });
    expect(validateDuration(120)).toEqual({ valid: true, error: null });
  });

  it('accepts mid-range value 25 (default duration)', () => {
    expect(validateDuration(25)).toEqual({ valid: true, error: null });
  });

  it('rejects 0 (below minimum)', () => {
    const result = validateDuration(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects 121 (above maximum)', () => {
    const result = validateDuration(121);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects negative numbers', () => {
    const result = validateDuration(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects floats like 1.5', () => {
    const result = validateDuration(1.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects string input', () => {
    expect(validateDuration('25').valid).toBe(false);
    expect(validateDuration('abc').valid).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateDuration(NaN).valid).toBe(false);
  });

  it('error message is non-empty on rejection', () => {
    const result = validateDuration(200);
    expect(result.error).toBeTruthy();
    expect(result.error.length).toBeGreaterThan(0);
  });
});
