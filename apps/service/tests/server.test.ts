import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import { createServer } from "../src/server.js";

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
          contentHash: "same-content-hash"
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
});
