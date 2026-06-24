import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SERVICE_ENV_RELATIVE_PATH = join("config", "service.env");

export interface RuntimeConfigInput {
  baseUrl: string;
  model: string;
  apiKey: string;
  extensionOrigins: string;
  protocol?: string;
}

export interface PublicRuntimeConfig {
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  extensionOrigins: string;
  protocol: string;
}

export function loadRuntimeEnv(dataRoot: string, baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const fileEnv = readServiceEnvFile(dataRoot);

  return {
    ...fileEnv,
    ...baseEnv
  };
}

export function serviceEnvPath(dataRoot: string): string {
  return join(dataRoot, SERVICE_ENV_RELATIVE_PATH);
}

export function readRuntimeConfig(dataRoot: string): Record<string, string> {
  return readServiceEnvFile(dataRoot);
}

export function writeRuntimeConfig(
  dataRoot: string,
  input: RuntimeConfigInput,
  currentEnv: NodeJS.ProcessEnv = {}
): Record<string, string> {
  const previousEnv = {
    ...readServiceEnvFile(dataRoot),
    ...currentEnv
  };
  const nextEnv: Record<string, string> = {
    AGE_FX_OPENAI_BASE_URL: input.baseUrl.trim(),
    AGE_FX_OPENAI_MODEL: input.model.trim(),
    AGE_FX_OPENAI_API_KEY:
      input.apiKey.trim() || previousEnv.AGE_FX_OPENAI_API_KEY || "",
    AGE_FX_EXTENSION_ORIGINS: input.extensionOrigins.trim(),
    AGE_FX_OPENAI_PROTOCOL: normalizeProtocol(input.protocol ?? previousEnv.AGE_FX_OPENAI_PROTOCOL)
  };
  const path = serviceEnvPath(dataRoot);

  mkdirSync(join(dataRoot, "config"), { recursive: true });
  writeFileSync(
    path,
    [
      "# AGE-FX local runtime config",
      "# Managed by AGE-FX Thought Console.",
      `AGE_FX_OPENAI_BASE_URL=${nextEnv.AGE_FX_OPENAI_BASE_URL}`,
      `AGE_FX_OPENAI_MODEL=${nextEnv.AGE_FX_OPENAI_MODEL}`,
      `AGE_FX_OPENAI_API_KEY=${nextEnv.AGE_FX_OPENAI_API_KEY}`,
      `AGE_FX_EXTENSION_ORIGINS=${nextEnv.AGE_FX_EXTENSION_ORIGINS}`,
      `AGE_FX_OPENAI_PROTOCOL=${nextEnv.AGE_FX_OPENAI_PROTOCOL}`,
      ""
    ].join("\n"),
    "utf8"
  );

  return nextEnv;
}

export function publicRuntimeConfig(env: NodeJS.ProcessEnv): PublicRuntimeConfig {
  return {
    baseUrl: env.AGE_FX_OPENAI_BASE_URL ?? "",
    model: env.AGE_FX_OPENAI_MODEL ?? "",
    hasApiKey: Boolean(env.AGE_FX_OPENAI_API_KEY?.trim()),
    extensionOrigins: env.AGE_FX_EXTENSION_ORIGINS ?? "",
    protocol: normalizeProtocol(env.AGE_FX_OPENAI_PROTOCOL)
  };
}

function normalizeProtocol(value: string | undefined): string {
  return value === "chat_completions" ? "chat_completions" : "responses";
}

function readServiceEnvFile(dataRoot: string): Record<string, string> {
  const path = serviceEnvPath(dataRoot);

  if (!existsSync(path)) {
    return {};
  }

  return parseServiceEnv(readFileSync(path, "utf8"));
}

export function parseServiceEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex < 1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();

    if (!/^[A-Z0-9_]+$/.test(key)) {
      continue;
    }

    env[key] = unquoteValue(value);
  }

  return env;
}

function unquoteValue(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
