# AGE-FX Thought Console MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working local AGE-FX Thought Console vertical slice: D-drive SQLite storage, local companion service, Microsoft Edge Manifest V3 capture extension, local console UI, grounded daily battle analysis, and one-equipment archive flow.

**Architecture:** Follow `docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md`. The service is a local Node app on `localhost`, the database lives under `D:\AGE-FX-Thought-Console`, and the Edge extension sends visible ChatGPT/Gemini messages to the service. The first analyzer is local and rule-based behind an interface so external AI can be added only after the architecture change protocol approves data-sharing behavior.

**Tech Stack:** Node.js 24, npm, TypeScript for the service and console, plain JavaScript for the Edge extension runtime, Vite, Vitest, Express, supertest, Node built-in `node:sqlite` / `DatabaseSync`, Zod, Microsoft Edge Manifest V3 extension APIs, plain HTML/CSS for the extension popup.

---

## Scope Guard

This MVP intentionally builds a working vertical slice, not every future capability. Historical import/backfill remains future extension B. Hidden scraping, login automation, cloud sync, and automatic equipment printing remain outside scope.

Node 24's built-in `node:sqlite` / `DatabaseSync` currently emits `ExperimentalWarning`. That is accepted for this MVP to avoid native SQLite build tools on Windows, but it must be revalidated on Node upgrades and before long-term storage hardening.

## File Structure

- `package.json`: root npm scripts for service, console, tests, and type checks.
- `scripts/build-extension.mjs`: copies the plain JavaScript Edge extension into `dist/edge-extension`.
- `tsconfig.base.json`: shared TypeScript compiler settings.
- `vitest.config.ts`: unit test configuration.
- `apps/service/src/config.ts`: AGE data root and runtime constants.
- `apps/service/src/hash.ts`: message normalization and content hashing.
- `apps/service/src/db/schema.ts`: SQLite schema creation.
- `apps/service/src/db/client.ts`: database connection and directory creation.
- `apps/service/src/messages/messageRepository.ts`: captured message insertion and queries.
- `apps/service/src/analysis/analyzer.ts`: local grounded daily battle analyzer.
- `apps/service/src/equipment/equipmentRepository.ts`: equipment recommendation archive state.
- `apps/service/src/server.ts`: Express local companion service.
- `apps/service/src/index.ts`: service entry point.
- `apps/service/tests/*.test.ts`: service unit and API tests.
- `apps/console/index.html`: local console shell.
- `apps/console/src/main.ts`: console API calls and rendering.
- `apps/console/src/styles.css`: lake-blue cockpit UI and FX Burst Mode.
- `apps/console/tests/*.test.ts`: console rendering tests.
- `extension/edge/manifest.json`: Microsoft Edge Manifest V3 definition.
- `extension/edge/src/content.js`: ChatGPT/Gemini visible-message capture and runtime relay trigger.
- `extension/edge/src/background.js`: Manifest V3 service worker that posts captures to the local service.
- `extension/edge/src/popup.js`: capture status popup.
- `extension/edge/src/popup.html`: popup markup.
- `extension/edge/src/styles.css`: extension capture indicator and popup styles.
- `extension/edge/tests/*.test.ts`: parser and payload tests.
- `fixtures/chatgpt-sample.html`: saved minimal ChatGPT-like conversation fixture.
- `fixtures/gemini-sample.html`: saved minimal Gemini-like conversation fixture.

---

### Task 1: Project Tooling Baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create the root npm project files**

Create `package.json`:

```json
{
  "name": "age-fx-thought-console",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.base.json --noEmit",
    "service": "tsx apps/service/src/index.ts",
    "console": "vite apps/console --host 127.0.0.1 --port 5173",
    "build:console": "vite build apps/console --outDir ../../dist/console",
    "build:extension": "node scripts/build-extension.mjs"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.5",
    "@types/supertest": "^6.0.2",
    "jsdom": "^25.0.1",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["apps/**/*.ts", "extension/**/*.ts", "extension/**/*.js", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["apps/**/*.test.ts", "extension/**/*.test.ts"]
  }
});
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.vite/
coverage/
*.log
.env
D:/AGE-FX-Thought-Console/
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
```

Expected: npm creates `package-lock.json` and exits with code 0.

- [ ] **Step 3: Run the workspace type check**

Run:

```powershell
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 4: Commit tooling baseline**

Run:

```powershell
git add package.json package-lock.json tsconfig.base.json vitest.config.ts .gitignore
git commit -m "chore: set up AGE-FX TypeScript workspace"
```

Expected: commit succeeds.

---

### Task 2: Message Normalization and Hashing

**Files:**
- Create: `apps/service/src/hash.ts`
- Create: `apps/service/tests/hash.test.ts`

- [ ] **Step 1: Write the failing hash tests**

Create `apps/service/tests/hash.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createContentHash, normalizeMessageText } from "../src/hash.js";

describe("message hashing", () => {
  it("normalizes repeated whitespace", () => {
    expect(normalizeMessageText("  Lake\\n\\nBlue\\tIntelligence  ")).toBe("Lake Blue Intelligence");
  });

  it("creates stable hashes for equivalent whitespace", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "AGE   FX"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: " AGE FX "
    });
    expect(first).toBe(second);
  });

  it("changes hash when role changes", () => {
    const userHash = createContentHash({
      source: "gemini",
      pageUrl: "https://gemini.google.com/app/abc",
      messageRole: "user",
      messageText: "same text"
    });
    const assistantHash = createContentHash({
      source: "gemini",
      pageUrl: "https://gemini.google.com/app/abc",
      messageRole: "assistant",
      messageText: "same text"
    });
    expect(userHash).not.toBe(assistantHash);
  });

  it("does not collide when content contains the old field delimiter", () => {
    const delimiter = "\u001f";
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: `https://chatgpt.com/c/abc${delimiter}user`,
      messageRole: "assistant",
      messageText: "same text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: `assistant${delimiter}same text`
    });
    expect(first).not.toBe(second);
  });

  it("changes hash when source changes", () => {
    const chatGptHash = createContentHash({
      source: "chatgpt",
      pageUrl: "https://example.com/conversation",
      messageRole: "user",
      messageText: "same text"
    });
    const geminiHash = createContentHash({
      source: "gemini",
      pageUrl: "https://example.com/conversation",
      messageRole: "user",
      messageText: "same text"
    });
    expect(chatGptHash).not.toBe(geminiHash);
  });

  it("changes hash when pageUrl changes", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "same text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/xyz",
      messageRole: "user",
      messageText: "same text"
    });
    expect(first).not.toBe(second);
  });

  it("changes hash when normalized messageText changes", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "first text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "second text"
    });
    expect(first).not.toBe(second);
  });

  it("creates deterministic sha256 hex hashes", () => {
    const input = {
      source: "chatgpt" as const,
      pageUrl: " https://chatgpt.com/c/abc ",
      messageRole: "user" as const,
      messageText: "same text"
    };
    const first = createContentHash(input);
    const second = createContentHash(input);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- apps/service/tests/hash.test.ts
```

Expected: FAIL because `apps/service/src/hash.ts` does not exist.

- [ ] **Step 3: Implement hashing**

Create `apps/service/src/hash.ts`:

```ts
import { createHash } from "node:crypto";

export type MessageSource = "chatgpt" | "gemini";
export type MessageRole = "user" | "assistant" | "unknown";

export interface HashInput {
  source: MessageSource;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
}

export function normalizeMessageText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function createContentHash(input: HashInput): string {
  const hashInput = JSON.stringify({
    source: input.source,
    pageUrl: input.pageUrl.trim(),
    messageRole: input.messageRole,
    messageText: normalizeMessageText(input.messageText)
  });

  return createHash("sha256").update(hashInput, "utf8").digest("hex");
}
```

- [ ] **Step 4: Run hash tests**

Run:

```powershell
npm test -- apps/service/tests/hash.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit hashing**

Run:

```powershell
git add apps/service/src/hash.ts apps/service/tests/hash.test.ts
git commit -m "feat: add captured message hashing"
```

Expected: commit succeeds.

---

### Task 3: D-Drive SQLite Schema and Message Repository

**Files:**
- Create: `apps/service/src/config.ts`
- Create: `apps/service/src/db/schema.ts`
- Create: `apps/service/src/db/client.ts`
- Create: `apps/service/src/messages/messageRepository.ts`
- Create: `apps/service/tests/messageRepository.test.ts`

- [ ] **Step 1: Write repository tests**

Create `apps/service/tests/messageRepository.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import { insertCapturedMessage, listMessagesForDate } from "../src/messages/messageRepository.js";

let root: string | undefined;
let db: DatabaseSync | undefined;

afterEach(() => {
  db?.close();
  db = undefined;

  if (root) {
    rmSync(root, { recursive: true, force: true });
    root = undefined;
  }
});

describe("message repository", () => {
  it("creates the database and deduplicates captured messages", () => {
    root = mkdtempSync(join(tmpdir(), "age-fx-test-"));
    db = openAgeDatabase(root);
    const message = {
      source: "chatgpt" as const,
      capturedAt: "2026-06-19T08:00:00.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: null,
      pageUrl: "https://chatgpt.com/c/age",
      messageRole: "user" as const,
      messageText: "I like AGE-FX",
      contentHash: "hash-1"
    };

    expect(insertCapturedMessage(db, message)).toEqual({ inserted: true });
    expect(insertCapturedMessage(db, message)).toEqual({ inserted: false });
    expect(listMessagesForDate(db, "2026-06-19")).toHaveLength(1);
    expect(listMessagesForDate(db, "2026-06-19")[0]?.conversationTitle).toBeNull();
  });

  it("throws on invalid source or role constraints", () => {
    root = mkdtempSync(join(tmpdir(), "age-fx-test-"));
    db = openAgeDatabase(root);
    const message = {
      source: "chatgpt" as const,
      capturedAt: "2026-06-19T08:00:00.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: null,
      pageUrl: "https://chatgpt.com/c/age",
      messageRole: "user" as const,
      messageText: "I like AGE-FX",
      contentHash: "hash-1"
    };

    expect(() =>
      insertCapturedMessage(db as DatabaseSync, {
        ...message,
        source: "claude",
        contentHash: "invalid-source"
      } as unknown as Parameters<typeof insertCapturedMessage>[1])
    ).toThrow();
    expect(() =>
      insertCapturedMessage(db as DatabaseSync, {
        ...message,
        messageRole: "system",
        contentHash: "invalid-role"
      } as unknown as Parameters<typeof insertCapturedMessage>[1])
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- apps/service/tests/messageRepository.test.ts
```

Expected: FAIL because database modules do not exist.

- [ ] **Step 3: Implement config**

Create `apps/service/src/config.ts`:

```ts
export const DEFAULT_DATA_ROOT = "D:\\AGE-FX-Thought-Console";
export const DEFAULT_SERVICE_PORT = 3987;
```

- [ ] **Step 4: Implement schema**

Create `apps/service/src/db/schema.ts`:

```ts
import type { DatabaseSync } from "node:sqlite";

export function applySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS captured_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK (source IN ('chatgpt', 'gemini')),
      captured_at TEXT NOT NULL,
      conversation_date TEXT NOT NULL,
      conversation_title TEXT,
      page_url TEXT NOT NULL,
      message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'unknown')),
      message_text TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_captured_messages_date
      ON captured_messages (conversation_date);

    CREATE TABLE IF NOT EXISTS daily_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_date TEXT NOT NULL UNIQUE,
      thought_title TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_date TEXT NOT NULL,
      equipment_name TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      why_this_equipment TEXT NOT NULL,
      source_battle_insight TEXT NOT NULL,
      minimum_viable_version TEXT NOT NULL,
      expected_benefit TEXT NOT NULL,
      print_prompt TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('recommended', 'approved', 'printed', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 5: Implement database client**

Create `apps/service/src/db/client.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DATA_ROOT } from "../config.js";
import { applySchema } from "./schema.js";

export function openAgeDatabase(dataRoot = DEFAULT_DATA_ROOT): DatabaseSync {
  const dataDir = join(dataRoot, "data");
  const exportsDir = join(dataRoot, "exports");
  const equipmentDir = join(dataRoot, "equipment");
  const logsDir = join(dataRoot, "logs");

  for (const dir of [dataDir, exportsDir, equipmentDir, logsDir]) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(join(dataDir, "age-fx.sqlite"));
  applySchema(db);
  return db;
}
```

- [ ] **Step 6: Implement message repository**

Create `apps/service/src/messages/messageRepository.ts`:

```ts
import type { DatabaseSync } from "node:sqlite";
import type { MessageRole, MessageSource } from "../hash.js";

export interface CapturedMessageInput {
  source: MessageSource;
  capturedAt: string;
  conversationDate: string;
  conversationTitle: string | null;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
  contentHash: string;
}

export interface CapturedMessageRecord extends CapturedMessageInput {
  id: number;
}

export function insertCapturedMessage(
  db: DatabaseSync,
  message: CapturedMessageInput
): { inserted: boolean } {
  const result = db.prepare(`
    INSERT INTO captured_messages (
      source,
      captured_at,
      conversation_date,
      conversation_title,
      page_url,
      message_role,
      message_text,
      content_hash
    ) VALUES (
      @source,
      @capturedAt,
      @conversationDate,
      @conversationTitle,
      @pageUrl,
      @messageRole,
      @messageText,
      @contentHash
    )
    ON CONFLICT(content_hash) DO NOTHING
  `).run(message);

  return { inserted: result.changes === 1 };
}

export function listMessagesForDate(
  db: DatabaseSync,
  conversationDate: string
): CapturedMessageRecord[] {
  const rows = db.prepare(`
    SELECT
      id,
      source,
      captured_at AS capturedAt,
      conversation_date AS conversationDate,
      conversation_title AS conversationTitle,
      page_url AS pageUrl,
      message_role AS messageRole,
      message_text AS messageText,
      content_hash AS contentHash
    FROM captured_messages
    WHERE conversation_date = ?
    ORDER BY captured_at ASC, id ASC
  `).all(conversationDate);

  return rows as CapturedMessageRecord[];
}
```

- [ ] **Step 7: Run repository tests**

Run:

```powershell
npm test -- apps/service/tests/messageRepository.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit database foundation**

Run:

```powershell
git add apps/service/src/config.ts apps/service/src/db apps/service/src/messages apps/service/tests/messageRepository.test.ts
git commit -m "feat: store captured messages in AGE database"
```

Expected: commit succeeds.

---

### Task 4: Local Companion Service API

**Files:**
- Create: `apps/service/src/server.ts`
- Create: `apps/service/src/index.ts`
- Create: `apps/service/tests/server.test.ts`

- [ ] **Step 1: Write service API tests**

Create `apps/service/tests/server.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import { createServer } from "../src/server.js";

const validContentHash =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("local companion service API", () => {
  let tempRoot: string | undefined;
  let db: DatabaseSync | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;

    if (tempRoot) {
      rmSync(tempRoot, { force: true, recursive: true });
      tempRoot = undefined;
    }
  });

  function createTestApp() {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-api-"));
    db = openAgeDatabase(tempRoot);

    return createServer(db, tempRoot);
  }

  it("captures a message once and reports duplicate content hashes", async () => {
    const app = createTestApp();
    const payload = {
      messages: [
        {
          source: "chatgpt",
          capturedAt: "2026-06-19T12:34:56.000Z",
          conversationDate: "2026-06-19",
          conversationTitle: null,
          pageUrl: "https://chatgpt.com/c/example",
          messageRole: "user",
          messageText: "A captured thought for AGE-FX",
          contentHash: validContentHash
        }
      ]
    };

    await request(app)
      .post("/api/capture")
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ inserted: 1, duplicates: 0 });
      });

    await request(app)
      .post("/api/capture")
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ inserted: 0, duplicates: 1 });
      });
  });

  it("reports status for a date with no captured messages", async () => {
    const app = createTestApp();

    await request(app)
      .get("/api/status")
      .query({ date: "2026-06-19" })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          ok: true,
          dataRoot: tempRoot,
          date: "2026-06-19",
          capturedMessages: 0
        });
      });
  });

  it("does not reflect disallowed CORS origins", async () => {
    const app = createTestApp();

    await request(app)
      .get("/api/health")
      .set("Origin", "https://evil.example")
      .expect(200)
      .expect((response) => {
        expect(response.headers["access-control-allow-origin"]).toBeUndefined();
      });
  });

  it("returns 400 for invalid capture payload fields", async () => {
    const app = createTestApp();
    const invalidPayload = {
      messages: [
        {
          source: "chatgpt",
          capturedAt: "not-an-iso-date",
          conversationDate: "2026-02-30",
          conversationTitle: null,
          pageUrl: "https://gemini.google.com/app/example",
          messageRole: "user",
          messageText: "A captured thought for AGE-FX",
          contentHash: "not-a-sha256"
        }
      ]
    };

    await request(app)
      .post("/api/capture")
      .send(invalidPayload)
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe("invalid_capture_payload");
        expect(Array.isArray(body.details)).toBe(true);
      });
  });

  it("returns 500 when valid capture payload cannot be stored", async () => {
    const app = createTestApp();
    const payload = {
      messages: [
        {
          source: "gemini",
          capturedAt: "2026-06-19T12:34:56.000Z",
          conversationDate: "2026-06-19",
          conversationTitle: "AGE-FX planning",
          pageUrl: "https://gemini.google.com/app/example",
          messageRole: "assistant",
          messageText: "A stored reply from Gemini",
          contentHash:
            "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
        }
      ]
    };

    db?.close();
    db = undefined;

    await request(app)
      .post("/api/capture")
      .send(payload)
      .expect(500)
      .expect(({ body }) => {
        expect(body).toEqual({ error: "capture_store_failed" });
      });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- apps/service/tests/server.test.ts
```

Expected: FAIL because `createServer` does not exist.

- [ ] **Step 3: Implement service API**

Create `apps/service/src/server.ts`:

```ts
import type { DatabaseSync } from "node:sqlite";
import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  insertCapturedMessage,
  listMessagesForDate
} from "./messages/messageRepository.js";

const allowedWebOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173"
]);
const extensionOriginPattern = /^(?:chrome-extension|extension):\/\/[a-z0-9_-]+$/i;
const sha256HexPattern = /^[a-f0-9]{64}$/i;

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (origin === undefined) {
    return true;
  }

  return allowedWebOrigins.has(origin) || extensionOriginPattern.test(origin);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}

function hostMatchesSource(source: "chatgpt" | "gemini", pageUrl: string): boolean {
  const host = new URL(pageUrl).hostname.toLowerCase();
  const expectedHost = source === "chatgpt" ? "chatgpt.com" : "gemini.google.com";
  return host === expectedHost || host.endsWith(`.${expectedHost}`);
}

const capturedMessageSchema = z
  .object({
    source: z.enum(["chatgpt", "gemini"]),
    capturedAt: z.string().datetime({ offset: true }),
    conversationDate: z.string().refine(isCalendarDate, {
      message: "Invalid calendar date"
    }),
    conversationTitle: z.string().nullable(),
    pageUrl: z.string().url(),
    messageRole: z.enum(["user", "assistant", "unknown"]),
    messageText: z.string().min(1),
    contentHash: z.string().regex(sha256HexPattern)
  })
  .superRefine((message, context) => {
    if (!hostMatchesSource(message.source, message.pageUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pageUrl host must match source",
        path: ["pageUrl"]
      });
    }
  });

const capturePayloadSchema = z.object({
  messages: z.array(capturedMessageSchema).min(1)
});

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createServer(db: DatabaseSync, dataRoot: string): express.Express {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedCorsOrigin(origin));
      }
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, dataRoot });
  });

  app.get("/api/status", (req, res) => {
    const date =
      typeof req.query.date === "string" && req.query.date.length > 0
        ? req.query.date
        : todayIsoDate();
    const messages = listMessagesForDate(db, date);

    res.json({
      ok: true,
      dataRoot,
      date,
      capturedMessages: messages.length
    });
  });

  app.post("/api/capture", (req, res) => {
    const parsedPayload = capturePayloadSchema.safeParse(req.body);

    if (!parsedPayload.success) {
      res.status(400).json({
        error: "invalid_capture_payload",
        details: parsedPayload.error.issues
      });
      return;
    }

    let inserted = 0;
    let duplicates = 0;

    try {
      for (const message of parsedPayload.data.messages) {
        const result = insertCapturedMessage(db, message);

        if (result.inserted) {
          inserted += 1;
        } else {
          duplicates += 1;
        }
      }
    } catch {
      res.status(500).json({ error: "capture_store_failed" });
      return;
    }

    res.json({ inserted, duplicates });
  });

  return app;
}
```

Create `apps/service/src/index.ts`:

```ts
import { DEFAULT_DATA_ROOT, DEFAULT_SERVICE_PORT } from "./config.js";
import { openAgeDatabase } from "./db/client.js";
import { createServer } from "./server.js";

const dataRoot = process.env.AGE_FX_DATA_ROOT ?? DEFAULT_DATA_ROOT;
const port = parseServicePort(process.env.PORT);
const db = openAgeDatabase(dataRoot);
const app = createServer(db, dataRoot);

app.listen(port, "127.0.0.1", () => {
  console.log(`AGE-FX companion service listening at http://127.0.0.1:${port}`);
  console.log(`AGE-FX data root: ${dataRoot}`);
});

function parseServicePort(portValue: string | undefined): number {
  const rawPort = portValue ?? String(DEFAULT_SERVICE_PORT);
  const port = Number(rawPort);

  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(
      `Invalid PORT "${rawPort}". AGE-FX service PORT must be an integer from 1 to 65535.`
    );
    process.exit(1);
  }

  return port;
}
```

- [ ] **Step 4: Run API tests**

Run:

```powershell
npm test -- apps/service/tests/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Start service manually**

Run:

```powershell
npm run service
```

Expected: output includes:

```text
AGE-FX companion service listening at http://127.0.0.1:3987
AGE-FX data root: D:\AGE-FX-Thought-Console
```

Stop the service with `Ctrl+C`.

- [ ] **Step 6: Commit service API**

Run:

```powershell
git add apps/service/src/server.ts apps/service/src/index.ts apps/service/tests/server.test.ts
git commit -m "feat: add local companion capture API"
```

Expected: commit succeeds.

---

### Task 5: Local Daily Battle Analyzer and Equipment Recommendation

**Files:**
- Create: `apps/service/src/analysis/analyzer.ts`
- Create: `apps/service/src/equipment/equipmentRepository.ts`
- Modify: `apps/service/src/server.ts`
- Create: `apps/service/tests/analyzer.test.ts`
- Create: `apps/service/tests/equipmentRepository.test.ts`

- [ ] **Step 1: Write analyzer tests**

Create `apps/service/tests/analyzer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzeDailyBattle } from "../src/analysis/analyzer.js";

describe("daily battle analyzer", () => {
  it("creates a grounded empty-day analysis", () => {
    const analysis = analyzeDailyBattle("2026-06-19", []);
    expect(analysis.thoughtTitle).toBe("No captured battle record");
    expect(analysis.coreThemes).toEqual([]);
    expect(analysis.threadsToContinueTomorrow).toContain("Open ChatGPT or Gemini in Edge with C-Funnels capture enabled.");
  });

  it("extracts repeated question-like messages and recommends one equipment item", () => {
    const analysis = analyzeDailyBattle("2026-06-19", [
      {
        id: 1,
        source: "chatgpt",
        capturedAt: "2026-06-19T08:00:00.000Z",
        conversationDate: "2026-06-19",
        conversationTitle: "AGE ideas",
        pageUrl: "https://chatgpt.com/c/age",
        messageRole: "user",
        messageText: "How can I turn my AGE-FX idea into a tool?",
        contentHash: "a"
      },
      {
        id: 2,
        source: "gemini",
        capturedAt: "2026-06-19T09:00:00.000Z",
        conversationDate: "2026-06-19",
        conversationTitle: "Writing",
        pageUrl: "https://gemini.google.com/app/age",
        messageRole: "user",
        messageText: "How should I structure this product concept?",
        contentHash: "b"
      }
    ]);

    expect(analysis.repeatedQuestions.length).toBeGreaterThan(0);
    expect(analysis.recommendedEquipment.equipmentName).toBe("Lake Blue Concept Card");
    expect(analysis.recommendedEquipment.state).toBe("recommended");
  });
});
```

- [ ] **Step 2: Run analyzer test to verify it fails**

Run:

```powershell
npm test -- apps/service/tests/analyzer.test.ts
```

Expected: FAIL because analyzer does not exist.

- [ ] **Step 3: Implement analyzer**

Create `apps/service/src/analysis/analyzer.ts`:

```ts
import type { CapturedMessageRecord } from "../messages/messageRepository.js";

export interface EquipmentRecommendation {
  equipmentName: string;
  equipmentType: string;
  whyThisEquipment: string;
  sourceBattleInsight: string;
  minimumViableVersion: string;
  expectedBenefit: string;
  printPrompt: string;
  state: "recommended";
}

export interface DailyBattleAnalysis {
  analysisDate: string;
  thoughtTitle: string;
  coreThemes: string[];
  repeatedQuestions: string[];
  newlyFormedJudgments: string[];
  unclosedThinkingLoops: string[];
  reusableMaterial: string[];
  threadsToContinueTomorrow: string[];
  recommendedEquipment: EquipmentRecommendation;
}

function userMessages(messages: CapturedMessageRecord[]): CapturedMessageRecord[] {
  return messages.filter((message) => message.messageRole === "user");
}

function firstSentence(text: string): string {
  return text.split(/[.!?。！？]/)[0]?.trim() || text.trim();
}

function questionMessages(messages: CapturedMessageRecord[]): string[] {
  return userMessages(messages)
    .map((message) => message.messageText.trim())
    .filter((text) => /[?？]|how|what|why|should|can i|怎么|如何|为什么|是否/i.test(text))
    .slice(0, 5);
}

function themeCandidates(messages: CapturedMessageRecord[]): string[] {
  const joined = userMessages(messages).map((message) => message.messageText).join(" ").toLowerCase();
  const themes: string[] = [];
  if (/age|age-fx|fx/.test(joined)) themes.push("AGE-FX-inspired system design");
  if (/tool|app|extension|插件|工具/.test(joined)) themes.push("small tool creation");
  if (/write|article|文档|白皮书|writing/.test(joined)) themes.push("structured writing material");
  if (/product|concept|idea|创意|产品/.test(joined)) themes.push("product concept shaping");
  return [...new Set(themes)].slice(0, 5);
}

export function analyzeDailyBattle(
  analysisDate: string,
  messages: CapturedMessageRecord[]
): DailyBattleAnalysis {
  if (messages.length === 0) {
    return {
      analysisDate,
      thoughtTitle: "No captured battle record",
      coreThemes: [],
      repeatedQuestions: [],
      newlyFormedJudgments: [],
      unclosedThinkingLoops: [],
      reusableMaterial: [],
      threadsToContinueTomorrow: ["Open ChatGPT or Gemini in Edge with C-Funnels capture enabled."],
      recommendedEquipment: {
        equipmentName: "C-Funnels Capture Check",
        equipmentType: "diagnostic",
        whyThisEquipment: "No thinking traces were captured for the selected day.",
        sourceBattleInsight: "The AGE system needs captured conversations before it can evolve.",
        minimumViableVersion: "A one-page checklist that confirms Edge extension status, service status, and database path.",
        expectedBenefit: "Makes the capture pipeline visible before deeper analysis begins.",
        printPrompt: "Build a local capture diagnostic panel for AGE-FX Thought Console.",
        state: "recommended"
      }
    };
  }

  const questions = questionMessages(messages);
  const themes = themeCandidates(messages);
  const firstUser = userMessages(messages)[0]?.messageText ?? messages[0].messageText;

  return {
    analysisDate,
    thoughtTitle: themes[0] ?? firstSentence(firstUser),
    coreThemes: themes,
    repeatedQuestions: questions,
    newlyFormedJudgments: userMessages(messages)
      .map((message) => message.messageText)
      .filter((text) => /i think|i prefer|i want|我希望|我喜欢|我决定/i.test(text))
      .slice(0, 5),
    unclosedThinkingLoops: questions.slice(0, 3),
    reusableMaterial: userMessages(messages)
      .map((message) => firstSentence(message.messageText))
      .filter(Boolean)
      .slice(0, 5),
    threadsToContinueTomorrow: questions.length > 0
      ? questions.slice(0, 3)
      : ["Review today's strongest captured idea and turn it into a small next action."],
    recommendedEquipment: {
      equipmentName: "Lake Blue Concept Card",
      equipmentType: "thinking-tool",
      whyThisEquipment: "Today's battle record contains product or tool-shaping material that benefits from being compressed into a reusable card.",
      sourceBattleInsight: themes[0] ?? firstSentence(firstUser),
      minimumViableVersion: "A small web form that turns one idea into fields for purpose, audience, shape, risk, and next action.",
      expectedBenefit: "Helps convert raw conversation energy into a concrete design artifact.",
      printPrompt: "Build a Lake Blue Concept Card tool with fields for purpose, audience, shape, risk, and next action.",
      state: "recommended"
    }
  };
}
```

- [ ] **Step 4: Write equipment repository tests**

Create `apps/service/tests/equipmentRepository.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import { createEquipmentRecommendation, listEquipmentItems, updateEquipmentState } from "../src/equipment/equipmentRepository.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "age-fx-equipment-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("equipment repository", () => {
  it("records and updates equipment state", () => {
    const db = openAgeDatabase(root);
    const item = createEquipmentRecommendation(db, "2026-06-19", {
      equipmentName: "Lake Blue Concept Card",
      equipmentType: "thinking-tool",
      whyThisEquipment: "Compress an idea.",
      sourceBattleInsight: "Tool creation",
      minimumViableVersion: "One card form.",
      expectedBenefit: "Clear next action.",
      printPrompt: "Build the card.",
      state: "recommended"
    });

    expect(item.state).toBe("recommended");
    expect(updateEquipmentState(db, item.id, "approved").state).toBe("approved");
    expect(listEquipmentItems(db)).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Implement equipment repository**

Create `apps/service/src/equipment/equipmentRepository.ts`:

```ts
import type { DatabaseSync } from "node:sqlite";
import type { EquipmentRecommendation } from "../analysis/analyzer.js";

export type EquipmentState = "recommended" | "approved" | "printed" | "archived";

export interface EquipmentItem extends Omit<EquipmentRecommendation, "state"> {
  id: number;
  analysisDate: string;
  state: EquipmentState;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): EquipmentItem {
  return {
    id: Number(row.id),
    analysisDate: String(row.analysisDate),
    equipmentName: String(row.equipmentName),
    equipmentType: String(row.equipmentType),
    whyThisEquipment: String(row.whyThisEquipment),
    sourceBattleInsight: String(row.sourceBattleInsight),
    minimumViableVersion: String(row.minimumViableVersion),
    expectedBenefit: String(row.expectedBenefit),
    printPrompt: String(row.printPrompt),
    state: row.state as EquipmentState,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function createEquipmentRecommendation(
  db: DatabaseSync,
  analysisDate: string,
  recommendation: EquipmentRecommendation
): EquipmentItem {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO equipment_items (
      analysis_date,
      equipment_name,
      equipment_type,
      why_this_equipment,
      source_battle_insight,
      minimum_viable_version,
      expected_benefit,
      print_prompt,
      state,
      created_at,
      updated_at
    ) VALUES (
      @analysisDate,
      @equipmentName,
      @equipmentType,
      @whyThisEquipment,
      @sourceBattleInsight,
      @minimumViableVersion,
      @expectedBenefit,
      @printPrompt,
      @state,
      @createdAt,
      @updatedAt
    )
  `).run({
    analysisDate,
    ...recommendation,
    createdAt: now,
    updatedAt: now
  });

  return getEquipmentItem(db, Number(result.lastInsertRowid));
}

export function getEquipmentItem(db: DatabaseSync, id: number): EquipmentItem {
  const row = db.prepare(`
    SELECT
      id,
      analysis_date AS analysisDate,
      equipment_name AS equipmentName,
      equipment_type AS equipmentType,
      why_this_equipment AS whyThisEquipment,
      source_battle_insight AS sourceBattleInsight,
      minimum_viable_version AS minimumViableVersion,
      expected_benefit AS expectedBenefit,
      print_prompt AS printPrompt,
      state,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM equipment_items
    WHERE id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!row) throw new Error(`Equipment item not found: ${id}`);
  return mapRow(row);
}

export function updateEquipmentState(
  db: DatabaseSync,
  id: number,
  state: EquipmentState
): EquipmentItem {
  db.prepare(`
    UPDATE equipment_items
    SET state = ?, updated_at = ?
    WHERE id = ?
  `).run(state, new Date().toISOString(), id);

  return getEquipmentItem(db, id);
}

export function listEquipmentItems(db: DatabaseSync): EquipmentItem[] {
  const rows = db.prepare(`
    SELECT
      id,
      analysis_date AS analysisDate,
      equipment_name AS equipmentName,
      equipment_type AS equipmentType,
      why_this_equipment AS whyThisEquipment,
      source_battle_insight AS sourceBattleInsight,
      minimum_viable_version AS minimumViableVersion,
      expected_benefit AS expectedBenefit,
      print_prompt AS printPrompt,
      state,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM equipment_items
    ORDER BY created_at DESC, id DESC
  `).all() as Record<string, unknown>[];

  return rows.map(mapRow);
}
```

- [ ] **Step 6: Add analysis and equipment endpoints**

Modify `apps/service/src/server.ts` by adding imports:

```ts
import { analyzeDailyBattle } from "./analysis/analyzer.js";
import { createEquipmentRecommendation, listEquipmentItems, updateEquipmentState } from "./equipment/equipmentRepository.js";
```

Add routes before `return app;`:

```ts
  app.post("/api/analyze", (req, res) => {
    const date = typeof req.body?.date === "string"
      ? req.body.date
      : new Date().toISOString().slice(0, 10);
    const messages = listMessagesForDate(db, date);
    const analysis = analyzeDailyBattle(date, messages);
    const item = createEquipmentRecommendation(db, date, analysis.recommendedEquipment);
    res.json({ analysis, equipment: item });
  });

  app.get("/api/equipment", (_req, res) => {
    res.json({ items: listEquipmentItems(db) });
  });

  app.patch("/api/equipment/:id/state", (req, res) => {
    const state = z.enum(["recommended", "approved", "printed", "archived"]).safeParse(req.body?.state);
    if (!state.success) {
      res.status(400).json({ error: "invalid_equipment_state" });
      return;
    }
    res.json({ item: updateEquipmentState(db, Number(req.params.id), state.data) });
  });
```

- [ ] **Step 7: Run analyzer and equipment tests**

Run:

```powershell
npm test -- apps/service/tests/analyzer.test.ts apps/service/tests/equipmentRepository.test.ts apps/service/tests/server.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit analysis and equipment flow**

Run:

```powershell
git add apps/service/src/analysis apps/service/src/equipment apps/service/src/server.ts apps/service/tests/analyzer.test.ts apps/service/tests/equipmentRepository.test.ts
git commit -m "feat: analyze daily battles and recommend equipment"
```

Expected: commit succeeds.

---

### Task 6: Local Console UI

**Files:**
- Create: `apps/console/index.html`
- Create: `apps/console/src/main.ts`
- Create: `apps/console/src/styles.css`
- Create: `apps/console/tests/consoleRendering.test.ts`

- [ ] **Step 1: Write console rendering test**

Create `apps/console/tests/consoleRendering.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderAnalysis } from "../src/main.js";

describe("console rendering", () => {
  it("renders battle analysis and equipment recommendation", () => {
    document.body.innerHTML = `<main id="app"></main>`;
    renderAnalysis({
      analysisDate: "2026-06-19",
      thoughtTitle: "AGE-FX-inspired system design",
      coreThemes: ["AGE-FX-inspired system design"],
      repeatedQuestions: ["How can I make this?"],
      newlyFormedJudgments: ["I want an Edge-first extension."],
      unclosedThinkingLoops: ["How can I make this?"],
      reusableMaterial: ["AGE system"],
      threadsToContinueTomorrow: ["Continue the extension design."],
      recommendedEquipment: {
        equipmentName: "Lake Blue Concept Card",
        equipmentType: "thinking-tool",
        whyThisEquipment: "Compress an idea.",
        sourceBattleInsight: "AGE-FX-inspired system design",
        minimumViableVersion: "One card form.",
        expectedBenefit: "Clear next action.",
        printPrompt: "Build the card.",
        state: "recommended"
      }
    });

    expect(document.body.textContent).toContain("AGE-FX-inspired system design");
    expect(document.body.textContent).toContain("Lake Blue Concept Card");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- apps/console/tests/consoleRendering.test.ts --environment jsdom
```

Expected: FAIL because console module does not exist.

- [ ] **Step 3: Implement console shell**

Create `apps/console/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AGE-FX Thought Console</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `apps/console/src/main.ts`:

```ts
import "./styles.css";

interface DailyBattleAnalysis {
  analysisDate: string;
  thoughtTitle: string;
  coreThemes: string[];
  repeatedQuestions: string[];
  newlyFormedJudgments: string[];
  unclosedThinkingLoops: string[];
  reusableMaterial: string[];
  threadsToContinueTomorrow: string[];
  recommendedEquipment: {
    equipmentName: string;
    equipmentType: string;
    whyThisEquipment: string;
    sourceBattleInsight: string;
    minimumViableVersion: string;
    expectedBenefit: string;
    printPrompt: string;
    state: "recommended";
  };
}

const serviceUrl = "http://127.0.0.1:3987";

function list(title: string, items: string[]): string {
  const body = items.length === 0
    ? `<p class="muted">No entries captured.</p>`
    : `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  return `<section><h2>${title}</h2>${body}</section>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderAnalysis(analysis: DailyBattleAnalysis): void {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) return;

  app.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">AGE-FX Thought Console</p>
        <h1>${escapeHtml(analysis.thoughtTitle)}</h1>
      </div>
      <button id="burst-toggle" type="button">FX Burst</button>
    </header>
    <div class="layout">
      <div class="analysis">
        ${list("Core Themes", analysis.coreThemes)}
        ${list("Repeated Questions", analysis.repeatedQuestions)}
        ${list("New Judgments", analysis.newlyFormedJudgments)}
        ${list("Unclosed Loops", analysis.unclosedThinkingLoops)}
        ${list("Reusable Material", analysis.reusableMaterial)}
        ${list("Tomorrow Threads", analysis.threadsToContinueTomorrow)}
      </div>
      <aside class="equipment">
        <p class="eyebrow">Recommended Equipment</p>
        <h2>${escapeHtml(analysis.recommendedEquipment.equipmentName)}</h2>
        <p>${escapeHtml(analysis.recommendedEquipment.whyThisEquipment)}</p>
        <dl>
          <dt>Minimum Version</dt>
          <dd>${escapeHtml(analysis.recommendedEquipment.minimumViableVersion)}</dd>
          <dt>Expected Benefit</dt>
          <dd>${escapeHtml(analysis.recommendedEquipment.expectedBenefit)}</dd>
          <dt>Print Prompt</dt>
          <dd>${escapeHtml(analysis.recommendedEquipment.printPrompt)}</dd>
        </dl>
      </aside>
    </div>
  `;

  document.querySelector("#burst-toggle")?.addEventListener("click", () => {
    document.body.classList.toggle("burst");
  });
}

async function boot(): Promise<void> {
  const response = await fetch(`${serviceUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
  });
  const payload = await response.json();
  renderAnalysis(payload.analysis);
}

if (typeof window !== "undefined" && document.querySelector("#app")) {
  boot().catch((error) => {
    const app = document.querySelector<HTMLElement>("#app");
    if (app) app.innerHTML = `<p class="error">${escapeHtml(String(error))}</p>`;
  });
}
```

Create `apps/console/src/styles.css`:

```css
:root {
  color: #dffcff;
  background: #061113;
  font-family: Arial, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #061113;
}

button {
  border: 1px solid #66e8ff;
  background: #092429;
  color: #dffcff;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(102, 232, 255, 0.28);
}

.eyebrow {
  color: #66e8ff;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0;
}

h1,
h2 {
  margin: 0 0 12px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  padding: 24px 32px;
}

section,
.equipment {
  border: 1px solid rgba(102, 232, 255, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: rgba(9, 36, 41, 0.72);
}

.analysis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

li {
  margin: 8px 0;
}

dt {
  color: #66e8ff;
  margin-top: 14px;
}

dd {
  margin: 6px 0 0;
}

.muted {
  color: #8daeb4;
}

.error {
  padding: 32px;
  color: #ffb4b4;
}

body.burst .layout {
  grid-template-columns: minmax(0, 1fr);
}

body.burst .equipment {
  box-shadow: 0 0 32px rgba(102, 232, 255, 0.26);
}

@media (max-width: 860px) {
  .layout,
  .analysis {
    grid-template-columns: 1fr;
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}
```

- [ ] **Step 4: Run console test**

Run:

```powershell
npm test -- apps/console/tests/consoleRendering.test.ts --environment jsdom
```

Expected: PASS.

- [ ] **Step 5: Run console manually**

In one terminal:

```powershell
npm run service
```

In another terminal:

```powershell
npm run console
```

Expected: Vite prints a local URL, and the console renders today's analysis.

- [ ] **Step 6: Commit console UI**

Run:

```powershell
git add apps/console
git commit -m "feat: add local AGE-FX console UI"
```

Expected: commit succeeds.

---

### Task 7: Edge Extension Capture MVP

**Files:**
- Create: `fixtures/chatgpt-sample.html`
- Create: `fixtures/gemini-sample.html`
- Create: `extension/edge/src/content.js`
- Create: `extension/edge/src/popup.js`
- Create: `extension/edge/src/popup.html`
- Create: `extension/edge/src/styles.css`
- Create: `extension/edge/manifest.json`
- Create: `extension/edge/tests/content.test.ts`
- Create: `scripts/build-extension.mjs`

- [ ] **Step 1: Create parser fixtures**

Create `fixtures/chatgpt-sample.html`:

```html
<main>
  <article data-message-author-role="user"><div>How can I build AGE-FX?</div></article>
  <article data-message-author-role="assistant"><div>Start with a local-first architecture.</div></article>
</main>
```

Create `fixtures/gemini-sample.html`:

```html
<main>
  <div data-test-id="conversation-turn">
    <div>User</div>
    <div>How should I structure the AGE equipment archive?</div>
  </div>
  <div data-test-id="conversation-turn">
    <div>Gemini</div>
    <div>Use states and searchable cards.</div>
  </div>
</main>
```

- [ ] **Step 2: Write extension parser tests**

Create `extension/edge/tests/content.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectSource, extractVisibleMessages } from "../src/content.js";

describe("Edge content capture", () => {
  it("detects ChatGPT and extracts messages", () => {
    document.body.innerHTML = readFileSync(join(process.cwd(), "fixtures/chatgpt-sample.html"), "utf8");
    expect(detectSource("https://chatgpt.com/c/abc")).toBe("chatgpt");
    const messages = extractVisibleMessages("https://chatgpt.com/c/abc");
    expect(messages).toMatchObject([
      { source: "chatgpt", messageRole: "user", messageText: "How can I build AGE-FX?" },
      { source: "chatgpt", messageRole: "assistant", messageText: "Start with a local-first architecture." }
    ]);
  });

  it("detects Gemini and extracts messages", () => {
    document.body.innerHTML = readFileSync(join(process.cwd(), "fixtures/gemini-sample.html"), "utf8");
    expect(detectSource("https://gemini.google.com/app/abc")).toBe("gemini");
    const messages = extractVisibleMessages("https://gemini.google.com/app/abc");
    expect(messages.length).toBe(2);
    expect(messages[0].source).toBe("gemini");
  });
});
```

- [ ] **Step 3: Run parser test to verify it fails**

Run:

```powershell
npm test -- extension/edge/tests/content.test.ts --environment jsdom
```

Expected: FAIL because content module does not exist.

- [ ] **Step 4: Implement Edge content capture**

Create `extension/edge/src/content.js`:

```js
const validSources = new Set(["chatgpt", "gemini"]);
const validRoles = new Set(["user", "assistant", "unknown"]);

const CAPTURE_MESSAGE_TYPE = "AGE_FX_CAPTURE";
const sentHashes = new Set();

export function normalizeMessageText(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function createBrowserContentHash(input) {
  const hashInput = JSON.stringify({
    source: input.source,
    pageUrl: input.pageUrl.trim(),
    messageRole: input.messageRole,
    messageText: normalizeMessageText(input.messageText)
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < hashInput.length; index += 1) {
    hash ^= hashInput.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function detectSource(pageUrl) {
  if (pageUrl.includes("chatgpt.com")) return "chatgpt";
  if (pageUrl.includes("gemini.google.com")) return "gemini";
  return null;
}

function roleFromText(text) {
  if (/^user$/i.test(text.trim())) return "user";
  if (/^(assistant|gemini)$/i.test(text.trim())) return "assistant";
  return "unknown";
}

export function extractVisibleMessages(pageUrl) {
  const source = detectSource(pageUrl);
  if (!source) return [];

  const capturedAt = new Date().toISOString();
  const conversationDate = capturedAt.slice(0, 10);
  const conversationTitle = document.title || null;
  const candidates = source === "chatgpt"
    ? Array.from(document.querySelectorAll("article[data-message-author-role]"))
    : Array.from(document.querySelectorAll('[data-test-id="conversation-turn"]'));

  return candidates
    .map((node) => {
      const explicitRole = node.getAttribute("data-message-author-role");
      const childText = Array.from(node.children).map((child) => child.textContent?.trim() ?? "").filter(Boolean);
      const messageRole = validRoles.has(explicitRole) ? explicitRole : roleFromText(childText[0] ?? "");
      const messageText = explicitRole ? node.textContent?.trim() ?? "" : childText.slice(1).join(" ").trim();
      return {
        source,
        capturedAt,
        conversationDate,
        conversationTitle,
        pageUrl,
        messageRole,
        messageText,
        contentHash: createBrowserContentHash({ source, pageUrl, messageRole, messageText })
      };
    })
    .filter((message) => validSources.has(message.source) && message.messageText.length > 0);
}

function showIndicator(text) {
  let indicator = document.querySelector("#age-fx-capture-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "age-fx-capture-indicator";
    indicator.textContent = text;
    Object.assign(indicator.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      border: "1px solid #66e8ff",
      background: "rgba(6, 17, 19, 0.88)",
      color: "#dffcff",
      padding: "8px 10px",
      borderRadius: "6px",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      boxShadow: "0 0 18px rgba(102, 232, 255, 0.28)"
    });
    document.body.appendChild(indicator);
  }
  indicator.textContent = text;
}

async function captureNow() {
  const messages = extractVisibleMessages(location.href).filter((message) => !sentHashes.has(message.contentHash));
  if (messages.length === 0) {
    showIndicator("C-Funnels armed");
    return;
  }

  chrome.runtime.sendMessage({ type: CAPTURE_MESSAGE_TYPE, messages }, (response) => {
    if (response?.ok) {
      for (const message of messages) sentHashes.add(message.contentHash);
      showIndicator(`C-Funnels captured ${messages.length}`);
    } else {
      showIndicator("C-Funnels offline");
    }
  });
}
```

Create `extension/edge/src/background.js`:

```js
const CAPTURE_ENDPOINT = "http://127.0.0.1:3987/api/capture";

export async function postCapture(messages, fetchImpl = fetch) {
  const response = await fetchImpl(CAPTURE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) return { ok: false, error: `Capture failed: ${response.status}` };

  const payload = await response.json();
  return { ok: true, inserted: payload.inserted ?? 0, duplicates: payload.duplicates ?? 0 };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AGE_FX_CAPTURE") return false;
  postCapture(message.messages).then(sendResponse);
  return true;
});
```

- [ ] **Step 5: Create Edge manifest and popup**

Create `extension/edge/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "AGE-FX C-Funnels Capture",
  "version": "0.1.0",
  "description": "Captures visible ChatGPT and Gemini thinking traces for the local AGE-FX Thought Console.",
  "permissions": ["storage"],
  "host_permissions": [
    "http://127.0.0.1:3987/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ],
  "background": {
    "service_worker": "src/background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*", "https://gemini.google.com/*"],
      "js": ["src/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "AGE-FX C-Funnels",
    "default_popup": "src/popup.html"
  }
}
```

Create `extension/edge/src/popup.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main>
      <p class="eyebrow">AGE-FX</p>
      <h1>C-Funnels</h1>
      <p id="status">Checking local service...</p>
    </main>
    <script type="module" src="./popup.js"></script>
  </body>
</html>
```

Create `extension/edge/src/popup.js`:

```js
async function boot() {
  const status = document.querySelector("#status");
  if (!status) return;
  try {
    const response = await fetch("http://127.0.0.1:3987/api/health");
    const payload = await response.json();
    status.textContent = payload.ok ? "Local AGE service online." : "Local AGE service unavailable.";
  } catch {
    status.textContent = "Local AGE service offline.";
  }
}

boot();
```

Create `scripts/build-extension.mjs`:

```js
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, "extension", "edge");
const target = join(root, "dist", "edge-extension");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter: (path) => !path.includes(`${join("extension", "edge", "tests")}`)
});

console.log(`Copied Edge extension to ${target}`);
```

Create `extension/edge/src/styles.css`:

```css
body {
  width: 240px;
  margin: 0;
  background: #061113;
  color: #dffcff;
  font-family: Arial, sans-serif;
}

main {
  padding: 14px;
}

.eyebrow {
  color: #66e8ff;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0;
}

h1 {
  margin: 4px 0 10px;
  font-size: 20px;
}
```

- [ ] **Step 6: Run extension parser tests**

Run:

```powershell
npm test -- extension/edge/tests/content.test.ts --environment jsdom
```

Expected: PASS.

- [ ] **Step 7: Build extension**

Run:

```powershell
npm run build:extension
```

Expected: `dist/edge-extension` exists. Manual Edge loading will use that folder.

- [ ] **Step 8: Commit Edge extension MVP**

Run:

```powershell
git add fixtures extension/edge
git commit -m "feat: add Edge C-Funnels capture extension"
```

Expected: commit succeeds.

---

### Task 8: End-to-End Verification Notes

**Files:**
- Create: `docs/manual-test/age-fx-mvp.md`

- [ ] **Step 1: Write manual verification guide**

Create `docs/manual-test/age-fx-mvp.md`:

```markdown
# AGE-FX MVP Manual Verification

## Start Local Service

```powershell
npm run service
```

Expected:

```text
AGE-FX local companion service listening on http://127.0.0.1:3987
AGE-FX data root: D:\AGE-FX-Thought-Console
```

## Start Console

```powershell
npm run console
```

Open the Vite URL shown in the terminal.

Expected:

- Console loads.
- Empty-day analysis appears if no messages were captured.
- FX Burst button changes the layout.

## Load Edge Extension

1. Open Microsoft Edge.
2. Navigate to `edge://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select `D:\work\AGE-FX\dist\edge-extension`.

Expected:

- Extension appears as `AGE-FX C-Funnels Capture`.
- Popup says local AGE service is online while `npm run service` is running.

## Capture Check

1. Open a ChatGPT or Gemini conversation in Edge.
2. Confirm the lake-blue C-Funnels indicator appears.
3. Wait at least five seconds.
4. Open the console.

Expected:

- The service status endpoint reports captured messages for today's date.
- Running analysis produces a battle report grounded in captured messages.
- The equipment archive receives one recommended item.
```

- [ ] **Step 2: Run full automated verification**

Run:

```powershell
npm test
npm run typecheck
npm run build:console
npm run build:extension
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Commit manual verification guide**

Run:

```powershell
git add docs/manual-test/age-fx-mvp.md
git commit -m "docs: add AGE-FX MVP manual verification"
```

Expected: commit succeeds.

---

## Plan Self-Review

Spec coverage:

- D-drive SQLite storage: Task 3.
- Local companion service: Task 4.
- Edge-first Manifest V3 capture extension: Task 7.
- Daily thought battle analysis: Task 5.
- One equipment recommendation and archive states: Task 5.
- Local console UI and FX Burst Mode: Task 6.
- Manual verification and Edge loading: Task 8.
- Historical import/backfill remains outside this MVP and is documented as future extension B in the architecture whitepaper.

No external AI provider is introduced in this MVP. That preserves the privacy rule that no captured conversation content is sent to a third-party service without explicit user action.
