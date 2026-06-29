import type { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { getDailyAnalysis } from "./analysis/analysisRepository.js";
import { upsertDailyAnalysis } from "./analysis/analysisRepository.js";
import {
  buildManualAnalysisPrompt,
  createOpenAiAnalysisEngine,
  MissingLlmConfigError,
  parseAnalysisJson,
  type AnalysisEngine
} from "./analysis/llmAnalyzer.js";
import {
  publicRuntimeConfig,
  writeRuntimeConfig
} from "./runtimeConfig.js";
import {
  createEquipmentRecommendation,
  listEquipmentItems,
  updateEquipmentState
} from "./equipment/equipmentRepository.js";
import { createAttachmentHash, createContentHash } from "./hash.js";
import {
  insertCapturedAttachments,
  insertCapturedMessage,
  listMessagesForDate
} from "./messages/messageRepository.js";

const allowedWebOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "null"
]);
const extensionOriginPattern = /^(?:chrome-extension|extension):\/\/[a-z0-9_-]+$/i;
const sha256HexPattern = /^[a-f0-9]{64}$/i;

export interface ServerOptions {
  allowedExtensionOrigins?: string[];
  allowAnyExtensionOrigin?: boolean;
  analysisEngine?: AnalysisEngine;
  consoleDist?: string;
  env?: NodeJS.ProcessEnv;
}

interface CorsOriginConfig {
  allowedExtensionOrigins: Set<string>;
  allowAnyExtensionOrigin: boolean;
}

function parseAllowedExtensionOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function createCorsOriginConfig(
  options: ServerOptions = {},
  env: NodeJS.ProcessEnv = options.env ?? process.env
): CorsOriginConfig {
  return {
    allowedExtensionOrigins: new Set(
      options.allowedExtensionOrigins ??
        parseAllowedExtensionOrigins(env.AGE_FX_EXTENSION_ORIGINS)
    ),
    allowAnyExtensionOrigin:
      options.allowAnyExtensionOrigin ??
      env.AGE_FX_ALLOW_ANY_EXTENSION_ORIGIN === "1"
  };
}

function isAllowedCorsOrigin(
  origin: string | undefined,
  config: CorsOriginConfig
): boolean {
  if (origin === undefined) {
    return true;
  }

  if (allowedWebOrigins.has(origin)) {
    return true;
  }

  if (config.allowedExtensionOrigins.has(origin)) {
    return true;
  }

  return config.allowAnyExtensionOrigin && extensionOriginPattern.test(origin);
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

const capturedAttachmentSchema = z.object({
  source: z.enum(["chatgpt", "gemini"]),
  messageContentHash: z.string().regex(sha256HexPattern),
  attachmentType: z.enum(["image", "file", "link"]),
  label: z.string().min(1),
  url: z.string().url().nullable(),
  mimeType: z.string().nullable(),
  visibleText: z.string().nullable(),
  extractedText: z.string().nullable(),
  analysisText: z.string().nullable(),
  snapshotDataUrl: z.string().nullable().optional().default(null),
  attachmentHash: z.string().regex(sha256HexPattern)
});

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
    contentHash: z.string().regex(sha256HexPattern),
    attachments: z.array(capturedAttachmentSchema).optional()
  })
  .superRefine((message, context) => {
    if (!hostMatchesSource(message.source, message.pageUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pageUrl host must match source",
        path: ["pageUrl"]
      });
    }

    for (const [index, attachment] of (message.attachments ?? []).entries()) {
      if (attachment.source !== message.source) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "attachment source must match message source",
          path: ["attachments", index, "source"]
        });
      }

      if (attachment.messageContentHash !== message.contentHash) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "attachment messageContentHash must match message contentHash",
          path: ["attachments", index, "messageContentHash"]
        });
      }
    }
  });

const capturePayloadSchema = z.object({
  messages: z.array(capturedMessageSchema).min(1)
});

const analyzePayloadSchema = z.object({
  date: z
    .string()
    .refine(isCalendarDate, {
      message: "Invalid calendar date"
    })
    .optional()
});

const manualAnalysisPayloadSchema = z.object({
  date: z.string().refine(isCalendarDate, {
    message: "Invalid calendar date"
  }),
  analysisText: z.string().min(1)
});

const equipmentStateSchema = z.object({
  state: z.enum(["recommended", "approved", "printed", "archived"])
});

const runtimeConfigPayloadSchema = z.object({
  baseUrl: z.string(),
  model: z.string(),
  apiKey: z.string(),
  extensionOrigins: z.string(),
  protocol: z.enum(["responses", "chat_completions"]).optional()
});

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

export function createServer(
  db: DatabaseSync,
  dataRoot: string,
  options: ServerOptions = {}
): express.Express {
  const app = express();
  let runtimeEnv: NodeJS.ProcessEnv = { ...(options.env ?? process.env) };

  function activeAnalysisEngine(): AnalysisEngine {
    return (
      options.analysisEngine ??
      createOpenAiAnalysisEngine({
        apiKey: runtimeEnv.AGE_FX_OPENAI_API_KEY,
        baseUrl: runtimeEnv.AGE_FX_OPENAI_BASE_URL,
        model: runtimeEnv.AGE_FX_OPENAI_MODEL,
        protocol: runtimeEnv.AGE_FX_OPENAI_PROTOCOL
      })
    );
  }

  app.use(
    cors({
      origin(origin, callback) {
        callback(
          null,
          isAllowedCorsOrigin(origin, createCorsOriginConfig(options, runtimeEnv))
        );
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
        : localIsoDate();
    const messages = listMessagesForDate(db, date);

    res.json({
      ok: true,
      dataRoot,
      date,
      capturedMessages: messages.length
    });
  });

  app.get("/api/settings/runtime-config", (_req, res) => {
    res.json(publicRuntimeConfig(runtimeEnv));
  });

  app.put("/api/settings/runtime-config", (req, res) => {
    const parsedPayload = runtimeConfigPayloadSchema.safeParse(req.body);

    if (!parsedPayload.success) {
      res.status(400).json({
        error: "invalid_runtime_config",
        details: parsedPayload.error.issues
      });
      return;
    }

    runtimeEnv = {
      ...runtimeEnv,
      ...writeRuntimeConfig(dataRoot, parsedPayload.data, runtimeEnv)
    };

    res.json(publicRuntimeConfig(runtimeEnv));
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
    let merged = 0;
    let insertedAttachments = 0;
    let duplicateAttachments = 0;

    try {
      for (const message of parsedPayload.data.messages) {
        const recomputedHash = createContentHash({
          source: message.source,
          pageUrl: message.pageUrl,
          messageRole: message.messageRole,
          messageText: message.messageText
        });

        if (message.contentHash.toLowerCase() !== recomputedHash) {
          res.status(400).json({
            error: "content_hash_mismatch",
            details: {
              suppliedHash: message.contentHash,
              recomputedHash,
              source: message.source,
              pageUrl: message.pageUrl,
              messageRole: message.messageRole,
              messageLength: message.messageText.length
            }
          });
          return;
        }

        for (const attachment of message.attachments ?? []) {
          const recomputedAttachmentHash = createAttachmentHash(attachment);

          if (attachment.attachmentHash.toLowerCase() !== recomputedAttachmentHash) {
            res.status(400).json({
              error: "attachment_hash_mismatch",
              details: {
                suppliedHash: attachment.attachmentHash,
                recomputedHash: recomputedAttachmentHash,
                source: attachment.source,
                messageContentHash: attachment.messageContentHash,
                attachmentType: attachment.attachmentType,
                labelLength: attachment.label.length
              }
            });
            return;
          }
        }

        const result = insertCapturedMessage(db, {
          ...message,
          contentHash: recomputedHash
        });

        const attachmentResult = insertCapturedAttachments(
          db,
          { ...message, contentHash: recomputedHash },
          (message.attachments ?? []).map((attachment) => ({
            ...attachment,
            attachmentHash: createAttachmentHash(attachment)
          }))
        );
        insertedAttachments += attachmentResult.inserted;
        duplicateAttachments += attachmentResult.duplicates;

        if (result.inserted) {
          inserted += 1;
        } else if (result.merged) {
          merged += 1;
        } else {
          duplicates += 1;
        }
      }
    } catch {
      res.status(500).json({ error: "capture_store_failed" });
      return;
    }

    const responseBody =
      insertedAttachments > 0 || duplicateAttachments > 0
        ? { inserted, duplicates, merged, insertedAttachments, duplicateAttachments }
        : { inserted, duplicates, merged };

    res.json(responseBody);
  });

  function handleAnalysisError(error: unknown, res: express.Response): void {
    if (error instanceof MissingLlmConfigError) {
      res.status(503).json({
        error: "llm_not_configured",
        message: error.message
      });
      return;
    }

    res.status(502).json({
      error: "llm_analysis_failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }

  app.post("/api/analyze", async (req, res) => {
    const parsedPayload = analyzePayloadSchema.safeParse(req.body ?? {});

    if (!parsedPayload.success) {
      res.status(400).json({
        error: "invalid_analyze_payload",
        details: parsedPayload.error.issues
      });
      return;
    }

    const date = parsedPayload.data.date ?? localIsoDate();
    const messages = listMessagesForDate(db, date);

    try {
      const analysis = await activeAnalysisEngine().analyze(date, messages);
      upsertDailyAnalysis(db, analysis);
      const equipment = createEquipmentRecommendation(
        db,
        date,
        analysis.recommendedEquipment[0]
      );

      res.json({ analysis, equipment });
    } catch (error) {
      handleAnalysisError(error, res);
    }
  });

  app.post("/api/preview", async (req, res) => {
    const parsedPayload = analyzePayloadSchema.safeParse(req.body ?? {});

    if (!parsedPayload.success) {
      res.status(400).json({
        error: "invalid_preview_payload",
        details: parsedPayload.error.issues
      });
      return;
    }

    const date = parsedPayload.data.date ?? localIsoDate();
    const messages = listMessagesForDate(db, date);

    try {
      const analysis = await activeAnalysisEngine().analyze(date, messages);

      res.json({ mode: "preview", analysis });
    } catch (error) {
      handleAnalysisError(error, res);
    }
  });

  app.get("/api/manual-analysis/prompt", (req, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : "";

    if (!isCalendarDate(date)) {
      res.status(400).json({ error: "invalid_manual_analysis_date" });
      return;
    }

    const messages = listMessagesForDate(db, date);

    res.json({
      date,
      prompt: buildManualAnalysisPrompt(date, messages)
    });
  });

  function parseManualAnalysisPayload(req: express.Request, res: express.Response) {
    const parsedPayload = manualAnalysisPayloadSchema.safeParse(req.body ?? {});

    if (!parsedPayload.success) {
      res.status(400).json({
        error: "invalid_manual_analysis_payload",
        details: parsedPayload.error.issues
      });
      return null;
    }

    try {
      return parseAnalysisJson(
        parsedPayload.data.analysisText,
        parsedPayload.data.date
      );
    } catch (error) {
      res.status(400).json({
        error: "invalid_manual_analysis_result",
        message: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  app.post("/api/manual-analysis/preview", (req, res) => {
    const analysis = parseManualAnalysisPayload(req, res);

    if (!analysis) {
      return;
    }

    res.json({ mode: "manual-preview", analysis });
  });

  app.post("/api/manual-analysis/settle", (req, res) => {
    const analysis = parseManualAnalysisPayload(req, res);

    if (!analysis) {
      return;
    }

    const storedAnalysis = upsertDailyAnalysis(db, analysis);
    const equipment = createEquipmentRecommendation(
      db,
      analysis.analysisDate,
      analysis.recommendedEquipment[0]
    );

    res.json({ analysis: storedAnalysis.report, equipment });
  });

  app.get("/api/analysis", (req, res) => {
    const date =
      typeof req.query.date === "string" && req.query.date.length > 0
        ? req.query.date
        : localIsoDate();

    if (!isCalendarDate(date)) {
      res.status(400).json({ error: "invalid_analysis_date" });
      return;
    }

    try {
      res.json({ analysis: getDailyAnalysis(db, date).report });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("daily_analysis_not_found:")) {
        res.status(404).json({ error: "daily_analysis_not_found" });
        return;
      }

      throw error;
    }
  });

  app.get("/api/equipment", (_req, res) => {
    res.json({ items: listEquipmentItems(db) });
  });

  app.patch("/api/equipment/:id/state", (req, res) => {
    const parsedPayload = equipmentStateSchema.safeParse(req.body);

    if (!parsedPayload.success) {
      res.status(400).json({ error: "invalid_equipment_state" });
      return;
    }

    const equipmentId = parsePositiveInteger(req.params.id);

    if (equipmentId === null) {
      res.status(400).json({ error: "invalid_equipment_id" });
      return;
    }

    try {
      const item = updateEquipmentState(db, equipmentId, parsedPayload.data.state);

      res.json({ item });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("equipment_item_not_found:")) {
        res.status(404).json({ error: "equipment_item_not_found" });
        return;
      }

      throw error;
    }
  });

  const consoleDist = options.consoleDist ?? options.env?.AGE_FX_CONSOLE_DIST;

  if (consoleDist) {
    app.use(express.static(consoleDist));
    app.get("*", (_req, res) => {
      res.sendFile(join(consoleDist, "index.html"));
    });
  }

  return app;
}
