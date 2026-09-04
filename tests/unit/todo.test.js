// Feature: personal-productivity-dashboard
// Task 5.1 — validateTask, serializeTasks, deserializeTasks pure functions
// Requirements: 3.1, 3.2, 3.7, 3.8

import { describe, it, expect } from 'vitest';
import { validateTask, serializeTasks, deserializeTasks } from '../../js/todo-logic.js';

// ─── validateTask ────────────────────────────────────────────────────────────

describe('validateTask', () => {
  // --- valid inputs ---

  it('accepts a normal non-empty description', () => {
    const result = validateTask('Buy groceries');
    expect(result).toEqual({ valid: true, error: null });
  });

  it('accepts a description of exactly 1 character', () => {
    const result = validateTask('x');
    expect(result).toEqual({ valid: true, error: null });
  });

  it('accepts a description of exactly 500 characters', () => {
    const result = validateTask('a'.repeat(500));
    expect(result).toEqual({ valid: true, error: null });
  });

  it('accepts a description with leading/trailing whitespace when non-whitespace content exists', () => {
    // trim() reveals content, so it is valid
    const result = validateTask('  hello  ');
    expect(result).toEqual({ valid: true, error: null });
  });

  // --- invalid inputs ---

  it('rejects an empty string', () => {
    const result = validateTask('');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only string (spaces)', () => {
    const result = validateTask('   ');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only string (tabs and newlines)', () => {
    const result = validateTask('\t\n\r');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a description of 501 characters', () => {
    const result = validateTask('a'.repeat(501));
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a description of 1000 characters', () => {
    const result = validateTask('b'.repeat(1000));
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a non-string value (number)', () => {
    // @ts-ignore — intentionally testing wrong type
    const result = validateTask(42);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('rejects null', () => {
    // @ts-ignore
    const result = validateTask(null);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('rejects undefined', () => {
    // @ts-ignore
    const result = validateTask(undefined);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

// ─── serializeTasks ──────────────────────────────────────────────────────────

describe('serializeTasks', () => {
  it('returns a JSON string for an empty array', () => {
    expect(serializeTasks([])).toBe('[]');
  });

  it('returns a JSON string containing the task fields', () => {
    const tasks = [
      { id: 'abc', description: 'Write tests', completed: false, createdAt: 1000 },
    ];
    const json = serializeTasks(tasks);
    expect(typeof json).toBe('string');
    // Must be valid JSON
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed[0].id).toBe('abc');
    expect(parsed[0].description).toBe('Write tests');
    expect(parsed[0].completed).toBe(false);
    expect(parsed[0].createdAt).toBe(1000);
  });

  it('handles multiple tasks', () => {
    const tasks = [
      { id: '1', description: 'Task one', completed: true,  createdAt: 100 },
      { id: '2', description: 'Task two', completed: false, createdAt: 200 },
    ];
    const json = serializeTasks(tasks);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('1');
    expect(parsed[1].id).toBe('2');
  });
});

// ─── deserializeTasks ────────────────────────────────────────────────────────

describe('deserializeTasks', () => {
  it('parses a valid JSON array of tasks', () => {
    const tasks = [
      { id: 'x1', description: 'Do something', completed: false, createdAt: 123 },
    ];
    const result = deserializeTasks(JSON.stringify(tasks));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('x1');
    expect(result[0].description).toBe('Do something');
    expect(result[0].completed).toBe(false);
    expect(result[0].createdAt).toBe(123);
  });

  it('returns an empty array for an empty JSON array', () => {
    expect(deserializeTasks('[]')).toEqual([]);
  });

  it('returns an empty array for invalid JSON', () => {
    expect(deserializeTasks('not-json')).toEqual([]);
  });

  it('returns an empty array for a JSON object (not an array)', () => {
    expect(deserializeTasks('{"id":"1"}')).toEqual([]);
  });

  it('returns an empty array for a JSON null', () => {
    expect(deserializeTasks('null')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(deserializeTasks('')).toEqual([]);
  });

  it('returns an empty array for a JSON number', () => {
    expect(deserializeTasks('42')).toEqual([]);
  });
});

// ─── round-trip (serializeTasks → deserializeTasks) ──────────────────────────

describe('serialization round-trip', () => {
  it('preserves all Task fields through serialize → deserialize', () => {
    const original = [
      { id: 'id-1', description: 'First task',  completed: false, createdAt: 1_700_000_000_000 },
      { id: 'id-2', description: 'Second task', completed: true,  createdAt: 1_700_000_001_000 },
    ];
    const roundTripped = deserializeTasks(serializeTasks(original));
    expect(roundTripped).toEqual(original);
  });

  it('preserves order through the round-trip', () => {
    const original = [
      { id: 'a', description: 'Alpha', completed: false, createdAt: 1 },
      { id: 'b', description: 'Beta',  completed: true,  createdAt: 2 },
      { id: 'c', description: 'Gamma', completed: false, createdAt: 3 },
    ];
    const roundTripped = deserializeTasks(serializeTasks(original));
    expect(roundTripped.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles an empty task list round-trip', () => {
    expect(deserializeTasks(serializeTasks([]))).toEqual([]);
  });

  it('preserves a description with special characters', () => {
    const original = [
      { id: 'z', description: 'Say "hello" & <goodbye>', completed: false, createdAt: 9 },
    ];
    const roundTripped = deserializeTasks(serializeTasks(original));
    expect(roundTripped[0].description).toBe('Say "hello" & <goodbye>');
  });
});
