import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { postCapture } from "../src/background.js";

describe("Edge extension background capture relay", () => {
  it("posts captured messages to the local service and returns insert counts", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ inserted: 2, duplicates: 1 })
    }));
    const messages = [{ contentHash: "abc", messageText: "Lake blue thought" }];

    await expect(postCapture(messages, fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      ok: true,
      inserted: 2,
      duplicates: 1
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:3987/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
  });

  it("returns a failure payload when the local service rejects capture", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "offline"
    }));

    await expect(postCapture([], fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      ok: false,
      error: "Capture failed: 503 Service Unavailable offline"
    });
  });

  it("declares and ships the MV3 background service worker", () => {
    const manifest = JSON.parse(readFileSync(resolve("extension/edge/manifest.json"), "utf8"));

    expect(manifest.background).toEqual({ service_worker: "src/background.js" });
    expect(existsSync(resolve("extension/edge/src/background.js"))).toBe(true);
  });
});
