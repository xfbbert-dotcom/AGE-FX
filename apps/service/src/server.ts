import type { DatabaseSync } from "node:sqlite";
import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  insertCapturedMessage,
  listMessagesForDate
} from "./messages/messageRepository.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const capturePayloadSchema = z.object({
  messages: z
    .array(
      z.object({
        source: z.enum(["chatgpt", "gemini"]),
        capturedAt: z.string().min(1),
        conversationDate: isoDateSchema,
        conversationTitle: z.string().nullable(),
        pageUrl: z.string().url(),
        messageRole: z.enum(["user", "assistant", "unknown"]),
        messageText: z.string().min(1),
        contentHash: z.string().min(1)
      })
    )
    .min(1)
});

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createServer(db: DatabaseSync, dataRoot: string): express.Express {
  const app = express();

  app.use(cors({ origin: true }));
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
