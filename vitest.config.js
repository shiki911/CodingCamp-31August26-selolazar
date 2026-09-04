import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run in Node.js — no browser/jsdom needed for pure-logic tests
    environment: 'node',
    // Glob that captures all unit and integration tests
    include: ['tests/**/*.test.js'],
    // Each property test runs ≥ 100 iterations (configured per test via fc.assert options)
    reporters: ['verbose'],
  },
});
