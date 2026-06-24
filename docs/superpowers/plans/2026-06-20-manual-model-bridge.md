# Manual Model Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual external model bridge so AGE-FX can generate the same deep analysis through ChatGPT Plus, Gemini, or another web model when API quota is unavailable.

**Architecture:** Keep external LLM analysis as the constitutional engine. Add a manual bridge that exports the exact AGE-FX System Brain prompt plus the selected day's battle logs, validates pasted JSON against the existing analysis schema, and either previews it without persistence or stores it as the formal settlement. This is not a local shallow fallback.

**Tech Stack:** Node.js, Express, Zod, SQLite, Vite, TypeScript, Vitest, Supertest.

---

### Task 1: Shared Analysis Protocol

**Files:**
- Modify: `apps/service/src/analysis/llmAnalyzer.ts`
- Test: `apps/service/tests/llmAnalyzer.test.ts`

- [ ] Export reusable helpers: `buildManualAnalysisPrompt(textDate, messages)`, `parseAnalysisJson(text, analysisDate)`, and the analysis JSON schema.
- [ ] Keep `createOpenAiAnalysisEngine` using the same prompt builder and parser.
- [ ] Add tests that the manual prompt includes the system role, the requested date, role/source fields, and the JSON-only instruction.
- [ ] Add tests that fenced JSON pasted from a web model parses into `DailyBattleAnalysis`.

### Task 2: Manual Bridge API

**Files:**
- Modify: `apps/service/src/server.ts`
- Test: `apps/service/tests/server.test.ts`

- [ ] Add `GET /api/manual-analysis/prompt?date=YYYY-MM-DD`, returning `{ date, prompt }`.
- [ ] Add `POST /api/manual-analysis/preview`, accepting `{ date, analysisText }`, validating it, and returning `{ mode: "manual-preview", analysis }` without storing anything.
- [ ] Add `POST /api/manual-analysis/settle`, accepting `{ date, analysisText }`, validating it, storing daily analysis, creating or refreshing exactly one equipment recommendation, and returning `{ analysis, equipment }`.
- [ ] Return clear `400` errors for invalid dates or invalid pasted JSON.

### Task 3: Console Bridge UI

**Files:**
- Modify: `apps/console/src/main.ts`
- Modify: `apps/console/src/styles.css`
- Test: `apps/console/tests/consoleRendering.test.ts`

- [ ] Add API helpers for manual prompt, manual preview, and manual settle endpoints.
- [ ] In collection mode, show a `Manual Model Bridge` panel with a "Copy Prompt" action, a textarea for pasted JSON, "Render Manual Preview", and "Save As Formal Settlement".
- [ ] If automatic preview fails with an LLM quota/config error, keep the error visible and make the manual bridge available.
- [ ] Render manual preview through the same `renderAnalysis` path, marked as non-persistent.

### Task 4: Architecture and Verification

**Files:**
- Modify: `docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md`

- [ ] Add a manual external model bridge rule under analysis and privacy sections.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build:console`.
- [ ] Run `npm run build:extension`.
