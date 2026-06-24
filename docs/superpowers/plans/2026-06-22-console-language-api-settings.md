# Console Language And API Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chinese/English UI language switching and editable local API configuration from the AGE-FX console.

**Architecture:** UI language is a browser-local preference stored in `localStorage`. API configuration remains local machine runtime config, written by the service to `D:\AGE-FX-Thought-Console\config\service.env`; API keys are never stored in SQLite or echoed back to the console.

**Tech Stack:** TypeScript, Express, Vitest, Vite console, Electron desktop packaging.

---

### Task 1: Service Runtime Config API

**Files:**
- Modify: `apps/service/src/runtimeConfig.ts`
- Modify: `apps/service/src/server.ts`
- Test: `apps/service/tests/runtimeConfig.test.ts`
- Test: `apps/service/tests/server.test.ts`

- [ ] Add tests for reading public config without returning API key.
- [ ] Add tests for writing service.env while preserving an existing key when the submitted key is empty.
- [ ] Implement `readRuntimeConfig`, `writeRuntimeConfig`, and `publicRuntimeConfig`.
- [ ] Add `GET /api/settings/runtime-config` and `PUT /api/settings/runtime-config`.
- [ ] Run service tests.

### Task 2: Console Language Layer

**Files:**
- Modify: `apps/console/src/main.ts`
- Modify: `apps/console/tests/consoleRendering.test.ts`

- [ ] Add tests for Chinese and English rendered labels.
- [ ] Implement `LanguageCode`, translation dictionary, and `localStorage` persistence.
- [ ] Replace fixed console copy with translation lookups.
- [ ] Add language switch buttons in the top bar.
- [ ] Run console tests.

### Task 3: Console API Settings Panel

**Files:**
- Modify: `apps/console/src/main.ts`
- Modify: `apps/console/src/styles.css`
- Modify: `apps/console/tests/consoleRendering.test.ts`

- [ ] Add tests for settings API URLs and masked API key state.
- [ ] Render API settings form in collection mode.
- [ ] Load current public config from service.
- [ ] Save config through `PUT /api/settings/runtime-config`.
- [ ] Keep API key field blank unless the user enters a replacement key.
- [ ] Run console tests.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md`
- Modify: `docs/operations/desktop-runtime-config.md`

- [ ] Document language preference as local UI state.
- [ ] Document console-managed API config.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build:extension`.
- [ ] Run `npm run package:desktop`.
