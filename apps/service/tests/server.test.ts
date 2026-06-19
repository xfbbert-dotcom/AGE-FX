import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import { createContentHash } from "../src/hash.js";
import { createServer, localIsoDate } from "../src/server.js";

function createCapturedMessage(
  overrides: Partial<{
    source: "chatgpt" | "gemini";
    capturedAt: string;
    conversationDate: string;
    conversationTitle: string | null;
    pageUrl: string;
    messageRole: "user" | "assistant" | "unknown";
    messageText: string;
    contentHash: string;
  }> = {}
) {
  const message = {
    source: "chatgpt" as const,
    capturedAt: "2026-06-19T12:34:56.000Z",
    conversationDate: "2026-06-19",
    conversationTitle: null,
    pageUrl: "https://chatgpt.com/c/example",
    messageRole: "user" as const,
    messageText: "A captured thought for AGE-FX",
    ...overrides
  };

  return {
    ...message,
    contentHash:
      overrides.contentHash ??
      createContentHash({
        source: message.source,
        pageUrl: message.pageUrl,
        messageRole: message.messageRole,
        messageText: message.messageText
      })
  };
}

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

    vi.useRealTimers();
  });

  function createTestApp(options?: Parameters<typeof createServer>[2]) {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-api-"));
    db = openAgeDatabase(tempRoot);

    return createServer(db, tempRoot, options);
  }

  it("captures a message once and reports duplicate content hashes", async () => {
    const app = createTestApp();
    const payload = {
      messages: [createCapturedMessage()]
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

  it("accepts a valid extension-style content hash", async () => {
    const app = createTestApp();
    const message = createCapturedMessage({
      messageText: "Extension generated this normalized thought hash."
    });

    await request(app)
      .post("/api/capture")
      .send({ messages: [message] })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ inserted: 1, duplicates: 0 });
      });

    expect(listStoredContentHashes()).toEqual([message.contentHash]);
  });

  it("rejects the same content with a different supplied hash", async () => {
    const app = createTestApp();
    const message = createCapturedMessage({
      contentHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    });

    await request(app)
      .post("/api/capture")
      .send({ messages: [message] })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe("content_hash_mismatch");
        expect(body.details).toMatchObject({
          suppliedHash: message.contentHash,
          recomputedHash: createContentHash(message),
          source: message.source,
          pageUrl: message.pageUrl,
          messageRole: message.messageRole,
          messageLength: message.messageText.length
        });
        expect(JSON.stringify(body)).not.toContain(message.messageText);
      });
  });

  it("does not duplicate the same content when a different hash is supplied later", async () => {
    const app = createTestApp();
    const message = createCapturedMessage({
      messageText: "Hash mismatch cannot bypass content de-duplication."
    });

    await request(app).post("/api/capture").send({ messages: [message] }).expect(200);
    await request(app)
      .post("/api/capture")
      .send({
        messages: [
          {
            ...message,
            contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          }
        ]
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe("content_hash_mismatch");
      });

    expect(listStoredContentHashes()).toEqual([message.contentHash]);
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

  it("uses the local calendar date for default status and analyze requests", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-31T17:30:00.000Z"));
    const app = createTestApp();

    expect(localIsoDate()).toBe("2026-01-01");
    expect(new Date().toISOString().slice(0, 10)).toBe("2025-12-31");

    await request(app)
      .get("/api/status")
      .expect(200)
      .expect(({ body }) => {
        expect(body.date).toBe("2026-01-01");
      });

    await request(app)
      .post("/api/analyze")
      .send({})
      .expect(200)
      .expect(({ body }) => {
        expect(body.analysis.analysisDate).toBe("2026-01-01");
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

  it("does not allow arbitrary Chromium extension origins by default", async () => {
    const app = createTestApp();

    await request(app)
      .get("/api/health")
      .set("Origin", "chrome-extension://malicious")
      .expect(200)
      .expect((response) => {
        expect(response.headers["access-control-allow-origin"]).toBeUndefined();
      });
  });

  it("allows configured Chromium extension origins", async () => {
    const app = createTestApp({
      allowedExtensionOrigins: ["chrome-extension://agefxextensionid"]
    });

    await request(app)
      .get("/api/health")
      .set("Origin", "chrome-extension://agefxextensionid")
      .expect(200)
      .expect((response) => {
        expect(response.headers["access-control-allow-origin"]).toBe(
          "chrome-extension://agefxextensionid"
        );
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
        createCapturedMessage({
          source: "gemini",
          conversationTitle: "AGE-FX planning",
          pageUrl: "https://gemini.google.com/app/example",
          messageRole: "assistant",
          messageText: "A stored reply from Gemini"
        })
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

  it("stores the latest daily analysis report when analyze runs", async () => {
    const app = createTestApp();

    await request(app).post("/api/analyze").send({ date: "2026-06-19" }).expect(200);

    expect(listStoredAnalyses()).toEqual([
      expect.objectContaining({
        analysis_date: "2026-06-19",
        thought_title: "No captured battle record"
      })
    ]);

    await request(app)
      .post("/api/capture")
      .send({
        messages: [
          createCapturedMessage({
            conversationTitle: "AGE-FX planning",
            messageText: "Could this tool idea become a Lake Blue Concept Card?"
          })
        ]
      })
      .expect(200);
    await request(app).post("/api/analyze").send({ date: "2026-06-19" }).expect(200);

    const storedAnalyses = listStoredAnalyses();
    expect(storedAnalyses).toHaveLength(1);
    expect(storedAnalyses[0]).toMatchObject({
      analysis_date: "2026-06-19",
      thought_title: "Daily battle for 2026-06-19"
    });
    expect(JSON.parse(storedAnalyses[0].report_json)).toMatchObject({
      analysisDate: "2026-06-19",
      thoughtTitle: "Daily battle for 2026-06-19"
    });
  });

  it("analyzes a captured day and lists recommended equipment", async () => {
    const app = createTestApp();
    const message = {
      source: "chatgpt",
      capturedAt: "2026-06-19T12:34:56.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: "AGE-FX planning",
      pageUrl: "https://chatgpt.com/c/example",
      messageRole: "user",
      messageText: "Could this tool idea become a Lake Blue Concept Card?",
      contentHash: createContentHash({
        source: "chatgpt",
        pageUrl: "https://chatgpt.com/c/example",
        messageRole: "user",
        messageText: "Could this tool idea become a Lake Blue Concept Card?"
      })
    };

    await request(app).post("/api/capture").send({ messages: [message] }).expect(200);

    await request(app)
      .post("/api/analyze")
      .send({ date: "2026-06-19" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.analysis.recommendedEquipment).toHaveLength(1);
        expect(body.equipment).toMatchObject({
          analysisDate: "2026-06-19",
          equipmentName: "Lake Blue Concept Card",
          state: "recommended"
        });
      });

    await request(app)
      .get("/api/equipment")
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([
          expect.objectContaining({
            equipmentName: "Lake Blue Concept Card",
            state: "recommended"
          })
        ]);
      });
  });

  it("validates and updates equipment state", async () => {
    const app = createTestApp();

    await request(app).post("/api/analyze").send({ date: "2026-06-19" }).expect(200);

    await request(app)
      .patch("/api/equipment/1/state")
      .send({ state: "missing" })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual({ error: "invalid_equipment_state" });
      });

    await request(app)
      .patch("/api/equipment/1/state")
      .send({ state: "approved" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.item).toMatchObject({
          id: 1,
          state: "approved"
        });
      });
  });

  it("returns 400 when equipment id is malformed", async () => {
    const app = createTestApp();

    await request(app)
      .patch("/api/equipment/not-a-number/state")
      .send({ state: "approved" })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual({ error: "invalid_equipment_id" });
      });
  });

  it("returns 404 when equipment item is missing", async () => {
    const app = createTestApp();

    await request(app)
      .patch("/api/equipment/999/state")
      .send({ state: "approved" })
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual({ error: "equipment_item_not_found" });
      });
  });

  function listStoredContentHashes(): string[] {
    return (
      db
        ?.prepare("SELECT content_hash FROM captured_messages ORDER BY id")
        .all()
        .map((row) => (row as { content_hash: string }).content_hash) ?? []
    );
  }

  function listStoredAnalyses(): Array<{
    analysis_date: string;
    thought_title: string;
    report_json: string;
  }> {
    return (
      (db
        ?.prepare(
          "SELECT analysis_date, thought_title, report_json FROM daily_analyses ORDER BY analysis_date"
        )
        .all() as Array<{
        analysis_date: string;
        thought_title: string;
        report_json: string;
      }>) ?? []
    );
  }
});
