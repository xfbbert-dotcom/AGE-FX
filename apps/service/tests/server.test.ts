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
