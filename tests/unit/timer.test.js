// Feature: personal-productivity-dashboard
// Properties 5–6: formatTimer, validateTimerDuration

/**
 * The pure logic functions below are copied verbatim from FocusTimer in app.js.
 * app.js uses the Revealing Module Pattern with IIFEs that reference browser
 * globals (localStorage, document), so it cannot be imported directly in Node.js.
 * These copies let Vitest verify the contracts without a browser.
 */

import { describe, it, expect } from 'vitest';

// ── Pure functions under test (mirrors FocusTimer internals in app.js) ────────

function formatTimer(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function validateTimerDuration(value) {
  if (!Number.isInteger(value) || value < 1 || value > 180) {
    return { valid: false, error: 'Duration must be a whole number between 1 and 180 minutes.' };
  }
  return { valid: true, error: null };
}

// ── formatTimer (Property 5: Timer Display Format) ───────────────────────────

describe('formatTimer', () => {
  it('formats 0 seconds as "00:00"', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('formats 1 second as "00:01"', () => {
    expect(formatTimer(1)).toBe('00:01');
  });

  it('formats 59 seconds as "00:59"', () => {
    expect(formatTimer(59)).toBe('00:59');
  });

  it('formats 60 seconds (1 minute) as "01:00"', () => {
    expect(formatTimer(60)).toBe('01:00');
  });

  it('formats 90 seconds as "01:30"', () => {
    expect(formatTimer(90)).toBe('01:30');
  });

  it('formats 25 minutes (1500 seconds) as "25:00"', () => {
    expect(formatTimer(1500)).toBe('25:00');
  });

  it('formats 10799 seconds as "179:59"', () => {
    expect(formatTimer(10799)).toBe('179:59');
  });

  it('formats 10800 seconds (maximum — 180 minutes) as "180:00"', () => {
    expect(formatTimer(10800)).toBe('180:00');
  });

  it('zero-pads single-digit minutes and seconds', () => {
    // 9 minutes 5 seconds = 545 seconds
    expect(formatTimer(545)).toBe('09:05');
  });

  it('produces a string of the form MM+:SS for all values', () => {
    for (let s = 0; s <= 10800; s += 60) {
      const result = formatTimer(s);
      expect(result).toMatch(/^\d{2,}:\d{2}$/);
    }
  });
});

// ── validateTimerDuration (Property 6: Timer Duration Validation Range) ───────

describe('validateTimerDuration', () => {
  it('accepts the minimum boundary value 1', () => {
    expect(validateTimerDuration(1)).toEqual({ valid: true, error: null });
  });

  it('accepts the maximum boundary value 180', () => {
    expect(validateTimerDuration(180)).toEqual({ valid: true, error: null });
  });

  it('accepts a typical value in range (25)', () => {
    expect(validateTimerDuration(25)).toEqual({ valid: true, error: null });
  });

  it('rejects 0 (below minimum)', () => {
    const result = validateTimerDuration(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects 181 (above maximum)', () => {
    const result = validateTimerDuration(181);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects negative numbers', () => {
    const result = validateTimerDuration(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a float (1.5)', () => {
    const result = validateTimerDuration(1.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects NaN', () => {
    const result = validateTimerDuration(NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a string', () => {
    const result = validateTimerDuration('25');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects null', () => {
    const result = validateTimerDuration(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects undefined', () => {
    const result = validateTimerDuration(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns a non-empty error string on rejection', () => {
    const result = validateTimerDuration(0);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });
});
