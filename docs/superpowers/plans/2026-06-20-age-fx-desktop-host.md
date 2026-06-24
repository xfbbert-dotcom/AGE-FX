# AGE-FX Desktop Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn AGE-FX from a PowerShell-launched local web stack into an Electron desktop host that starts the local service and displays the console in a desktop window.

**Architecture:** Add `apps/desktop` as the desktop shell. Electron owns process orchestration and window hosting, while the existing Express service remains the trusted local core on `127.0.0.1:3987`; the Edge extension continues talking to that same capture endpoint. The D-drive SQLite data constitution remains unchanged.

**Tech Stack:** Electron, Node.js child processes, Vite production assets, Express service, SQLite, TypeScript/Vitest for existing tests.

---

### Task 1: Architecture Constitution

**Files:**
- Modify: `docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md`

- [ ] Add `AGE-FX Desktop Host` as the approved second-stage architecture.
- [ ] State that Electron replaces manual PowerShell startup but does not replace the Edge extension or D-drive database.
- [ ] State that the desktop host starts/stops the local service and loads the console in a desktop window.

### Task 2: Desktop Host Runtime

**Files:**
- Create: `apps/desktop/main.cjs`
- Create: `apps/desktop/preload.cjs`
- Create: `apps/desktop/README.md`
- Modify: `package.json`

- [ ] Install Electron as a dev dependency.
- [ ] Add `desktop:dev`, `desktop`, and `build:desktop` scripts.
- [ ] Implement Electron main process to start `apps/service/src/index.ts` through `tsx`, wait for `/api/health`, then load `http://127.0.0.1:3987/`.
- [ ] Implement graceful cleanup so closing the desktop window stops the spawned service process.

### Task 3: Service Serves Console Assets

**Files:**
- Modify: `apps/service/src/server.ts`
- Modify: `apps/service/src/index.ts`
- Test: `apps/service/tests/server.test.ts`

- [ ] Add optional static console directory support to `createServer`.
- [ ] When `AGE_FX_CONSOLE_DIST` points at a built console directory, serve it at `/` and keep `/api/*` unchanged.
- [ ] Add tests for serving `index.html` from a temporary console dist.

### Task 4: Build and Verification

**Files:**
- Modify: `package.json`

- [ ] Ensure `build:desktop` first builds the console and then validates the desktop entry files.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build:console`.
- [ ] Run `npm run build:extension`.
- [ ] Run `npm run build:desktop`.
