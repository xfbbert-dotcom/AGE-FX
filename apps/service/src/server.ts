import type { DatabaseSync } from "node:sqlite";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { analyzeDailyBattle } from "./analysis/analyzer.js";
import { upsertDailyAnalysis } from "./analysis/analysisRepository.js";
import {
  createEquipmentRecommendation,
  listEquipmentItems,
  updateEquipmentState
} from "./equipment/equipmentRepository.js";
import { createContentHash } from "./hash.js";
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

export interface ServerOptions {
  allowedExtensionOrigins?: string[];
  allowAnyExtensionOrigin?: boolean;
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

function createCorsOriginConfig(options: ServerOptions = {}): CorsOriginConfig {
  return {
    allowedExtensionOrigins: new Set(
      options.allowedExtensionOrigins ??
        parseAllowedExtensionOrigins(process.env.AGE_FX_EXTENSION_ORIGINS)
    ),
    allowAnyExtensionOrigin:
      options.allowAnyExtensionOrigin ??
      process.env.AGE_FX_ALLOW_ANY_EXTENSION_ORIGIN === "1"
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

const analyzePayloadSchema = z.object({
  date: z
    .string()
    .refine(isCalendarDate, {
      message: "Invalid calendar date"
    })
    .optional()
});

const equipmentStateSchema = z.object({
  state: z.enum(["recommended", "approved", "printed", "archived"])
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
  const corsOriginConfig = createCorsOriginConfig(options);

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedCorsOrigin(origin, corsOriginConfig));
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

        const result = insertCapturedMessage(db, {
          ...message,
          contentHash: recomputedHash
        });

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

  app.post("/api/analyze", (req, res) => {
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
    const analysis = analyzeDailyBattle(date, messages);
    upsertDailyAnalysis(db, analysis);
    const equipment = createEquipmentRecommendation(
      db,
      date,
      analysis.recommendedEquipment[0]
    );

    res.json({ analysis, equipment });
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

  return app;
}
