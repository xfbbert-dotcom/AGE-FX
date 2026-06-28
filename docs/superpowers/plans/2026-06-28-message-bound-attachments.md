# Message-Bound Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture visible ChatGPT/Gemini files and images as first-class materials bound to the exact captured conversation turn they belong to.

**Architecture:** Keep `captured_messages` as the source of conversational truth and add `captured_attachments` as a separate material layer. Each attachment stores `message_content_hash`, so a file/image is explicitly tied to one message without changing the message hash or duplicating raw text.

**Tech Stack:** MV3 Edge content script, Express/Zod service API, Node SQLite, Vitest.

---

### Task 1: Extension Extraction

**Files:**
- Modify: `extension/edge/src/content.js`
- Test: `extension/edge/tests/content.test.ts`

- [ ] Write a failing test where a user message contains an image and file link, and `extractVisibleMessages()` returns `attachments` on that message.
- [ ] Implement DOM extraction for visible `img`, `a[href]`, and file-like labels inside each message element.
- [ ] Ensure attachment records include `source`, `attachmentType`, `label`, `url`, `mimeType`, `visibleText`, and `messageContentHash`.

### Task 2: Service Schema And Repository

**Files:**
- Modify: `apps/service/src/db/schema.ts`
- Modify: `apps/service/src/messages/messageRepository.ts`
- Test: `apps/service/tests/messageRepository.test.ts`

- [ ] Add a failing repository test that inserts a message with two attachments and lists them by date.
- [ ] Add `captured_attachments` with `message_content_hash` and a unique attachment hash.
- [ ] Implement insert/list helpers that preserve the message-to-attachment binding.

### Task 3: Capture API

**Files:**
- Modify: `apps/service/src/server.ts`
- Test: `apps/service/tests/server.test.ts`

- [ ] Add a failing API test that accepts `attachments` nested under a captured message.
- [ ] Validate attachment payloads with Zod.
- [ ] Recompute attachment hashes server-side and reject mismatches without echoing raw material text.

### Task 4: Analysis Bridge

**Files:**
- Modify: `apps/service/src/analysis/llmAnalyzer.ts`
- Test: `apps/service/tests/llmAnalyzer.test.ts`

- [ ] Add a failing test that `buildBattleLog()` includes attachment material under the bound message.
- [ ] Update battle log rendering so attachments are separate evidence, not user speech.

### Task 5: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build:extension`.
- [ ] Commit and push the verified change.
