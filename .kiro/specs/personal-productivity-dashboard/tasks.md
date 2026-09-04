# Implementation Plan: Personal Productivity Dashboard

## Overview

Build a zero-dependency, single-page productivity dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`). The implementation proceeds bottom-up: shared services first, then pure logic functions, then DOM-connected widgets, then integration and wiring. Property-based tests use **fast-check** and run in Node.js via Vitest with no browser required.

---

## Tasks

- [x] 1. Set up project structure and test framework
  - Create `index.html`, `css/style.css`, `js/app.js`, and `tests/` directory tree as specified in the design
  - Add `package.json` with Vitest and fast-check as dev dependencies (pinned exact versions)
  - Add `vitest.config.js` configured for the Node environment (no jsdom needed for pure-logic tests)
  - Create empty stub files for each test file listed in the design (`tests/unit/`, `tests/integration/`)
  - _Requirements: 10.3, 10.4_

- [x] 2. Implement StorageService
  - [x] 2.1 Write `StorageService` in `js/app.js` with the `KEYS` registry, `read`, `write`, `remove`, and `hydrate` methods
    - Wrap every `localStorage` call in `try/catch`; `read` returns `null` on failure; `write` returns `boolean`
    - `hydrate` applies defaults: theme `"light"`, name `""`, duration `25`, tasks `[]`, links `[]`
    - All keys must use the `ppd_` namespace
    - _Requirements: 9.1, 9.2, 9.5_
  - [ ]* 2.2 Write property test for storage key namespace (Property 19)
    - **Property 19: Storage Key Namespace**
    - **Validates: Requirements 9.5**

- [ ] 3. Implement pure logic helpers for GreetingWidget
  - [ ] 3.1 Write `formatTime(hour, minute)`, `formatDate(date)`, `getGreetingPrefix(hour)`, and `buildGreeting(prefix, name)` as pure functions
    - Zero-pad hours and minutes; use `Intl.DateTimeFormat` or manual string arrays for weekday and month names
    - `buildGreeting` appends name only when non-empty and non-whitespace
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10_
  - [ ]* 3.2 Write property tests for greeting logic (Properties 1–4)
    - **Property 1: Time Format Correctness** — Validates: Requirements 1.1
    - **Property 2: Date Format Completeness** — Validates: Requirements 1.3
    - **Property 3: Greeting Prefix Exhaustiveness** — Validates: Requirements 1.4, 1.5, 1.6, 1.7
    - **Property 4: Greeting Assembly** — Validates: Requirements 1.9, 1.10

- [ ] 4. Implement pure logic helpers for FocusTimer and SettingsPanel
  - [ ] 4.1 Write `formatTimer(totalSeconds)` and `validateTimerDuration(value)` as pure functions
    - `formatTimer`: zero-padded MM:SS for any integer in [0, 10800]
    - `validateTimerDuration`: valid range [1, 180]; returns `ValidationResult`
    - _Requirements: 2.1, 2.11_
  - [ ]* 4.2 Write property tests for timer logic (Properties 5–6)
    - **Property 5: Timer Display Format** — Validates: Requirements 2.1
    - **Property 6: Timer Duration Validation Range** — Validates: Requirements 2.11
  - [ ] 4.3 Write `sanitizeName(raw)` and `validateDuration(value)` as pure functions
    - `sanitizeName`: `raw.trim().slice(0, 50)`
    - `validateDuration`: integer in [1, 120]; returns `ValidationResult`
    - _Requirements: 6.2, 6.5, 7.1, 7.4_
  - [ ]* 4.4 Write property tests for settings logic (Properties 16–18)
    - **Property 16: Display Name Trimming** — Validates: Requirements 6.2
    - **Property 17: Display Name Length Cap** — Validates: Requirements 6.5
    - **Property 18: Settings Duration Validation Range** — Validates: Requirements 7.2, 7.4

- [ ] 5. Implement pure logic helpers for TodoList
  - [ ] 5.1 Write `validateTask(description)`, `serializeTasks(tasks)`, and `deserializeTasks(json)` as pure functions
    - Validation: non-empty, non-whitespace-only, ≤ 500 chars
    - Serialization round-trip must preserve all `Task` fields
    - _Requirements: 3.1, 3.2, 3.7, 3.8_
  - [ ]* 5.2 Write property tests for todo logic (Properties 7–10)
    - **Property 7: Task Addition Grows List** — Validates: Requirements 3.1
    - **Property 8: Whitespace Task Rejection** — Validates: Requirements 3.2
    - **Property 9: Completion Toggle Round-Trip** — Validates: Requirements 3.5
    - **Property 10: Task Storage Round-Trip** — Validates: Requirements 3.7, 3.8

- [ ] 6. Implement pure logic helpers for QuickLinks and ThemeToggle
  - [ ] 6.1 Write `validateLink(label, url)`, `normalizeUrl(url)`, and `toggleTheme(current)` as pure functions
    - `validateLink`: checks empty, length limits, duplicate URL, collection size < 20
    - `normalizeUrl`: prepends `https://` when no protocol present; leaves existing protocol intact
    - `toggleTheme`: `'light'` ↔ `'dark'`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2_
  - [ ]* 6.2 Write property tests for links and theme logic (Properties 11–15)
    - **Property 11: Link Addition Grows Collection** — Validates: Requirements 4.1
    - **Property 12: Link Input Validation Rejection** — Validates: Requirements 4.2, 4.3, 4.5
    - **Property 13: URL Protocol Normalization** — Validates: Requirements 4.4
    - **Property 14: Links Storage Round-Trip** — Validates: Requirements 4.8, 4.9
    - **Property 15: Theme Toggle Round-Trip** — Validates: Requirements 5.2

- [ ] 7. Checkpoint — Ensure all pure-logic tests pass
  - Run `vitest --run tests/unit/` and confirm all property tests and stubs pass; ask the user if questions arise.

- [ ] 8. Implement AudioService and NotificationService
  - [ ] 8.1 Write `AudioService` in `js/app.js`
    - Synthesize a 440 Hz sine-wave beep using `OscillatorNode` for the given duration (1–3 s)
    - Wrap `AudioContext` creation and `oscillator.start()` / `oscillator.stop()` in `try/catch`; silently swallow errors
    - _Requirements: 2.9, 2.10_
  - [ ] 8.2 Write `NotificationService` in `js/app.js`
    - Append a toast element to `<body>`, show for 1–3 seconds, then remove it
    - Support `type` values `'success'`, `'error'`, `'info'`
    - _Requirements: 9.3, 9.4, 11.5_
  - [ ]* 8.3 Write unit tests for AudioService and NotificationService
    - Mock `AudioContext`; assert oscillator created with correct frequency, `start` and `stop` called
    - Mock `AudioContext` constructor to throw; assert no unhandled error propagates
    - Assert toast element is added and then removed from the DOM
    - _Requirements: 2.9, 2.10, 11.5_

- [ ] 9. Implement GreetingWidget DOM module
  - [ ] 9.1 Write the `GreetingWidget` module object in `js/app.js` with `init(name)` and `setName(name)` methods
    - `init` wires the `setInterval` (1-minute tick) and renders time, date, and greeting on load
    - `setName` updates the greeting span in-place without restarting the interval
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9, 1.10_
  - [ ] 9.2 Add the Greeting Widget markup to `index.html` and its styles to `css/style.css`
    - Use semantic HTML (`<header>` or `<section>` with appropriate ARIA landmark)
    - Apply theme tokens only; no hardcoded color values
    - _Requirements: 1.1, 1.3, 11.1, 11.3_

- [ ] 10. Implement FocusTimer DOM module
  - [ ] 10.1 Write the `FocusTimer` module object in `js/app.js` with `init`, `setDuration`, `start`, `stop`, and `reset` methods
    - Implement the `TimerState` machine: `idle → running → paused → idle → completed`
    - `start` is a no-op when state is already `'running'`
    - On completion: stop interval, set `completed` state, call `AudioService.playAlert(1)`
    - Call `SettingsPanel.lockDurationInput()` on start; `unlockDurationInput()` on stop/reset
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.12_
  - [ ] 10.2 Add the Focus Timer markup to `index.html` and its styles to `css/style.css`
    - Start, stop, and reset controls with accessible labels; distinct `completed` CSS class
    - All controls ≥ 44×44 CSS pixels
    - _Requirements: 2.1, 2.5, 11.2, 11.4_
  - [ ]* 10.3 Write unit tests for timer state machine
    - Test `idle → running → paused → idle` transitions
    - Test `running → completed` transition (mock `setInterval` / `clearInterval`)
    - Test that `start` while already `running` is a no-op
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.12_

- [ ] 11. Implement TodoList DOM module
  - [ ] 11.1 Write the `TodoList` module object in `js/app.js` with `init`, `addTask`, `editTask`, `toggleComplete`, and `deleteTask` methods
    - Each mutation calls `StorageService.write`; on write failure, calls `NotificationService.show`
    - Generate task IDs with `crypto.randomUUID()` (or `Date.now().toString(36)` as fallback)
    - Render empty-state message when list is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  - [ ] 11.2 Add the To-Do List markup to `index.html` and its styles to `css/style.css`
    - Completed tasks get strikethrough style and muted text color via CSS class; use theme tokens only
    - Inline validation message element per input; edit control renders inline input field
    - All controls ≥ 44×44 CSS pixels
    - _Requirements: 3.5, 11.2, 11.3, 11.4_

- [ ] 12. Implement QuickLinks DOM module
  - [ ] 12.1 Write the `QuickLinks` module object in `js/app.js` with `init`, `addLink`, and `deleteLink` methods
    - Enforce max 20 links: disable add control and show capacity message when limit is reached
    - Each link button opens the URL in a new tab (`target="_blank"` with `rel="noopener noreferrer"`)
    - Render empty-state message when collection is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_
  - [ ] 12.2 Add the Quick Links markup to `index.html` and its styles to `css/style.css`
    - Inline validation messages; capacity indicator; all controls ≥ 44×44 CSS pixels
    - _Requirements: 4.2, 4.3, 4.5, 4.11, 11.2, 11.4_

- [ ] 13. Implement ThemeToggle DOM module and FOUC prevention
  - [ ] 13.1 Write the `ThemeToggle` module object in `js/app.js` with `init(savedTheme)` and `applyTheme(theme)` methods
    - `applyTheme` sets `document.body.dataset.theme` and calls `StorageService.write`; on failure calls `NotificationService.show`
    - Theme switch must complete within 100 ms (no transition delay on `data-theme` swap)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 13.2 Add the inline theme-init `<script>` in `<head>` of `index.html`
    - Read `ppd_theme` from `localStorage` synchronously; set `document.body.dataset.theme` before any paint
    - Fall back to `"light"` on any error
    - _Requirements: 5.4_
  - [ ] 13.3 Add Theme Toggle markup to `index.html`; add all CSS custom property token sets and `[data-theme]` rules to `css/style.css`
    - Define all 10 light tokens and 10 dark tokens listed in the design
    - Verify contrast ratios ≥ 4.5:1 for all (foreground, background) token pairs in both themes
    - _Requirements: 5.5, 11.3_
  - [ ]* 13.4 Write property test for theme toggle round-trip (Property 15)
    - **Property 15: Theme Toggle Round-Trip** — Validates: Requirements 5.2
  - [ ]* 13.5 Write property test for WCAG AA contrast ratios (Property 20)
    - **Property 20: WCAG AA Contrast Ratio** — Validates: Requirements 11.3

- [ ] 14. Implement SettingsPanel DOM module
  - [ ] 14.1 Write the `SettingsPanel` module object in `js/app.js` with `init`, `lockDurationInput`, and `unlockDurationInput` methods
    - On name save: call `sanitizeName`, write to storage, call `GreetingWidget.setName`; on empty/whitespace, remove key and reset greeting
    - On duration save: call `validateDuration`; on valid, write to storage and call `FocusTimer.setDuration`; on invalid, show inline error
    - On empty duration save: write default `25` to storage and update timer
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [ ] 14.2 Add Settings Panel markup to `index.html` and its styles to `css/style.css`
    - Name input (max 50 chars), duration numeric input (min 1, max 120), save button, inline error messages
    - All controls ≥ 44×44 CSS pixels; visible focus indicators
    - _Requirements: 6.1, 7.1, 11.2, 11.4_
  - [ ]* 14.3 Write unit tests for settings panel interactions
    - Test `lockDurationInput` / `unlockDurationInput` toggle the `disabled` attribute correctly
    - Test that saving a whitespace name removes the storage key and resets the greeting
    - Test that saving an empty duration field restores the default 25
    - _Requirements: 7.6, 7.7, 6.4, 7.5_

- [ ] 15. Add Placeholder Section markup and styles
  - Add the `Placeholder_Section` HTML to `index.html` with a "Coming Soon — Pictures & Sounds" label
  - Style with theme tokens; set `min-height: 80px`; ensure it applies `[data-theme]` tokens automatically
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16. Checkpoint — Ensure all unit tests pass
  - Run `vitest --run` and confirm the full test suite is green before wiring; ask the user if questions arise.

- [ ] 17. Wire all modules together in App init
  - [ ] 17.1 Write the `App` initializer at the bottom of `js/app.js`
    - Listen for `DOMContentLoaded`; call `StorageService.hydrate()`; call `init(data)` on each widget in dependency order
    - On hydration storage read failure, call `NotificationService.show("Could not load saved data", "error")`
    - _Requirements: 9.2, 9.3_
  - [ ] 17.2 Add `<script src="js/app.js">` to `index.html`; verify load order (inline theme-init script first, then deferred `app.js`)
    - Confirm the page opens from `file://` without a web server and all widgets render
    - _Requirements: 10.5_
  - [ ]* 17.3 Write integration test for full hydration round-trip
    - Mock `localStorage` with all five keys seeded; call `StorageService.hydrate()`; assert returned object matches seeded values
    - _Requirements: 9.2_
  - [ ]* 17.4 Write integration test for storage failure paths
    - Mock `localStorage.getItem` to throw; assert `hydrate()` returns all-default values without throwing
    - Mock `localStorage.setItem` to throw; assert `StorageService.write` returns `false` without throwing
    - _Requirements: 9.3, 9.4_

- [ ] 18. Apply responsive layout and global styles
  - [ ] 18.1 Write the responsive CSS grid/flexbox layout in `css/style.css`
    - Dashboard must be usable at 320px–2560px viewport width
    - Typographic scale with heading, label, and body sizes; visible focus indicators on all interactive controls
    - _Requirements: 10.6, 11.1, 11.2_
  - [ ]* 18.2 Write unit tests for contrast ratios across all token pairs (Property 20)
    - **Property 20: WCAG AA Contrast Ratio** — Validates: Requirements 11.3

- [ ] 19. Final checkpoint — full test suite and file://  smoke check
  - Run `vitest --run` and confirm all tests pass
  - Open `index.html` from the filesystem and verify zero console errors, all widgets render, and the layout is correct at 320px and 1440px widths
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (`fc.assert`, ≥ 100 `numRuns`); each test file tagged with `// Feature: personal-productivity-dashboard, Property N: ...`
- Checkpoints (tasks 7, 16, 19) ensure incremental validation before the next phase
- All CSS values must use theme tokens (`var(--color-*)`) — no hardcoded color literals

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1", "4.3", "5.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "4.4", "5.2", "6.2", "8.1", "8.2"] },
    { "id": 4, "tasks": ["8.3", "9.1", "9.2", "10.1", "11.1", "12.1", "13.1", "13.2", "13.3", "14.1", "15.1"] },
    { "id": 5, "tasks": ["10.2", "10.3", "11.2", "12.2", "13.4", "13.5", "14.2", "14.3", "17.1"] },
    { "id": 6, "tasks": ["17.2", "18.1"] },
    { "id": 7, "tasks": ["17.3", "17.4", "18.2"] }
  ]
}
```
