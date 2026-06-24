import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadRuntimeEnv,
  parseServiceEnv,
  publicRuntimeConfig,
  serviceEnvPath,
  writeRuntimeConfig
} from "../src/runtimeConfig.js";

describe("runtime config", () => {
  it("parses service.env style content", () => {
    expect(
      parseServiceEnv(`
# AGE-FX
AGE_FX_OPENAI_BASE_URL=https://api.openai.com/v1
AGE_FX_OPENAI_MODEL="gpt-5.2"
AGE_FX_OPENAI_API_KEY='sk-test'
ignored
bad-key=value
`)
    ).toEqual({
      AGE_FX_OPENAI_BASE_URL: "https://api.openai.com/v1",
      AGE_FX_OPENAI_MODEL: "gpt-5.2",
      AGE_FX_OPENAI_API_KEY: "sk-test"
    });
  });

  it("keeps process env values above file values", () => {
    const env = loadRuntimeEnv("Z:\\missing-age-fx-root", {
      AGE_FX_OPENAI_MODEL: "from-process"
    });

    expect(env.AGE_FX_OPENAI_MODEL).toBe("from-process");
  });

  it("writes local runtime config and preserves the existing API key when key input is empty", () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "age-fx-runtime-"));

      writeRuntimeConfig(dataRoot, {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-5.2",
        apiKey: "sk-original",
        extensionOrigins: "chrome-extension://edgeid",
        protocol: "responses"
      });
      writeRuntimeConfig(dataRoot, {
        baseUrl: "https://example.test/v1",
        model: "gpt-5.3",
        apiKey: "",
        extensionOrigins: "chrome-extension://newedgeid",
        protocol: "chat_completions"
      });

    const fileText = readFileSync(serviceEnvPath(dataRoot), "utf8");

    expect(fileText).toContain("AGE_FX_OPENAI_BASE_URL=https://example.test/v1");
    expect(fileText).toContain("AGE_FX_OPENAI_MODEL=gpt-5.3");
    expect(fileText).toContain("AGE_FX_OPENAI_API_KEY=sk-original");
    expect(fileText).toContain("AGE_FX_EXTENSION_ORIGINS=chrome-extension://newedgeid");
    expect(fileText).toContain("AGE_FX_OPENAI_PROTOCOL=chat_completions");
  });

  it("returns public runtime config without exposing the API key value", () => {
    expect(
      publicRuntimeConfig({
        AGE_FX_OPENAI_BASE_URL: "https://api.openai.com/v1",
        AGE_FX_OPENAI_MODEL: "gpt-5.2",
        AGE_FX_OPENAI_API_KEY: "sk-secret",
        AGE_FX_EXTENSION_ORIGINS: "chrome-extension://edgeid"
      })
    ).toEqual({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
      hasApiKey: true,
      extensionOrigins: "chrome-extension://edgeid",
      protocol: "responses"
    });
  });
});
