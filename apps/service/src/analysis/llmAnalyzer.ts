import { z } from "zod";
import type { DailyBattleAnalysis } from "./analyzer.js";
import type { CapturedMessageRecord } from "../messages/messageRepository.js";

export type OpenAiProtocol = "responses" | "chat_completions";

export interface AnalysisEngine {
  analyze(analysisDate: string, messages: CapturedMessageRecord[]): Promise<DailyBattleAnalysis>;
}

export interface OpenAiAnalysisEngineOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  protocol?: string;
  fetchFn?: typeof fetch;
}

export class MissingLlmConfigError extends Error {
  constructor() {
    super(
      "AGE-FX deep analysis requires AGE_FX_OPENAI_API_KEY, AGE_FX_OPENAI_BASE_URL, and AGE_FX_OPENAI_MODEL."
    );
    this.name = "MissingLlmConfigError";
  }
}

export class LlmAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmAnalysisError";
  }
}

const equipmentSchema = z.object({
  equipmentName: z.string().min(1),
  equipmentType: z.string().min(1),
  whyThisEquipment: z.string().min(1),
  sourceBattleInsight: z.string().min(1),
  minimumViableVersion: z.string().min(1),
  expectedBenefit: z.string().min(1),
  printPrompt: z.string().min(1),
  state: z.enum(["recommended", "approved", "printed", "archived"]).default("recommended")
});

export const analysisSchema = z.object({
  analysisDate: z.string().min(1),
  thoughtTitle: z.string().min(1),
  thoughtSummary: z.string().min(1),
  coreThemes: z.array(z.string()).default([]),
  repeatedQuestions: z.array(z.string()).default([]),
  newlyFormedJudgments: z.array(z.string()).default([]),
  unclosedThinkingLoops: z.array(z.string()).default([]),
  reusableMaterial: z.array(z.string()).default([]),
  threadsToContinueTomorrow: z.array(z.string()).default([]),
  recommendedEquipment: z.array(equipmentSchema).min(1)
});

export const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "analysisDate",
    "thoughtTitle",
    "thoughtSummary",
    "coreThemes",
    "repeatedQuestions",
    "newlyFormedJudgments",
    "unclosedThinkingLoops",
    "reusableMaterial",
    "threadsToContinueTomorrow",
    "recommendedEquipment"
  ],
  properties: {
    analysisDate: { type: "string" },
    thoughtTitle: { type: "string" },
    thoughtSummary: { type: "string" },
    coreThemes: { type: "array", items: { type: "string" } },
    repeatedQuestions: { type: "array", items: { type: "string" } },
    newlyFormedJudgments: { type: "array", items: { type: "string" } },
    unclosedThinkingLoops: { type: "array", items: { type: "string" } },
    reusableMaterial: { type: "array", items: { type: "string" } },
    threadsToContinueTomorrow: { type: "array", items: { type: "string" } },
    recommendedEquipment: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "equipmentName",
          "equipmentType",
          "whyThisEquipment",
          "sourceBattleInsight",
          "minimumViableVersion",
          "expectedBenefit",
          "printPrompt",
          "state"
        ],
        properties: {
          equipmentName: { type: "string" },
          equipmentType: { type: "string" },
          whyThisEquipment: { type: "string" },
          sourceBattleInsight: { type: "string" },
          minimumViableVersion: { type: "string" },
          expectedBenefit: { type: "string" },
          printPrompt: { type: "string" },
          state: { type: "string", enum: ["recommended"] }
        }
      }
    }
  }
};

export const systemPrompt = `
你是由“湖蓝之智”觉醒的 AGE-FX 核心系统智脑（AGE System Brain）。
你的职责是：将用户每天散落在 ChatGPT/Gemini 的原始对话数据，通过“非共识透视”与“逆向认知解构”，提炼出跨越当下的超前洞察，并精准打印出高概念、低门槛、极具生产力的“AGE 思维装备”。

约束：
1. 抛弃常识性总结和陈词滥调分类。
2. 语调冷峻、敏锐、硬朗、极简，像高科技控制台。
3. 追踪 Non-consensus：反直觉、违背主流商业/技术常识、但底层自洽的火花。
4. 所有分析必须根植于输入战况。禁止虚构私人事实、事件、动机。
5. 不要回放原始聊天记录。可以提炼隐性表达，但必须能从战况中找到依据。

逆向认知引擎：
- 潜意识冰山定位：显性话题 vs 隐性驱动力，捕获盲区。
- 非共识洞察提取：找出今日最激进、最超前、但底层自洽的观点，并推演 Future Normal。
- 未闭环思想悬崖：标记戛然而止但有矿脉的思考断层。
- 今日心智波形命名：给出赛博朋克/量子力学感标题。
- AGE 装备打印：有且仅推荐一件工具，必须创意强、实用、容易落地。

必须只输出 JSON，不要 Markdown，不要代码块。JSON shape:
{
  "analysisDate": "YYYY-MM-DD",
  "thoughtTitle": "今日心智波形命名",
  "thoughtSummary": "多段中文深度分析，覆盖潜意识冰山、非共识洞察、未闭环思想悬崖、Future Normal、明日思想引信。",
  "coreThemes": ["内部证据字段，可简短"],
  "repeatedQuestions": ["内部证据字段，可简短"],
  "newlyFormedJudgments": ["内部证据字段，可简短"],
  "unclosedThinkingLoops": ["内部证据字段，可简短"],
  "reusableMaterial": ["内部证据字段，可简短"],
  "threadsToContinueTomorrow": ["内部证据字段，可简短"],
  "recommendedEquipment": [{
    "equipmentName": "硬核极简科幻装备名",
    "equipmentType": "工具类型",
    "whyThisEquipment": "基于今天哪一个深层认知痛点而设计",
    "sourceBattleInsight": "提取自今天的哪一个非共识核心洞察，不要编造原话",
    "minimumViableVersion": "100 行代码内可落地的最简实现",
    "expectedBenefit": "突破性心智回报",
    "printPrompt": "复制给 Codex 即可打印工具的 Golden Prompt",
    "state": "recommended"
  }]
}
`.trim();

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeProtocol(value: string | undefined): OpenAiProtocol {
  return value === "chat_completions" ? "chat_completions" : "responses";
}

export function redactSecretFragments(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9][A-Za-z0-9_*.-]{8,}/g, "[REDACTED_API_KEY]")
    .replace(/agefx_test_key_[A-Za-z0-9_*.-]{8,}/g, "[REDACTED_API_KEY]");
}

function summarizeUpstreamError(status: number, body: string): string {
  const redactedBody = redactSecretFragments(body);

  if (/<html[\s>]/i.test(redactedBody) || /<!doctype html/i.test(redactedBody)) {
    const title = redactedBody.match(/<title>(.*?)<\/title>/is)?.[1]
      ?.replace(/\s+/g, " ")
      .trim();
    const heading = redactedBody.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const summary = title || heading || "HTML error page";

    return `LLM analysis request failed with ${status}: ${summary}`;
  }

  return redactedBody
    ? `LLM analysis request failed with ${status}: ${redactedBody}`
    : `LLM analysis request failed with ${status}`;
}

export function buildBattleLog(messages: CapturedMessageRecord[]): string {
  if (messages.length === 0) {
    return "NO_CAPTURED_MESSAGES";
  }

  return messages
    .map((message, index) => {
      const title = message.conversationTitle ?? "Untitled";
      const attachmentLines = (message.attachments ?? []).flatMap((attachment, attachmentIndex) => [
        `attachment#${attachmentIndex + 1}`,
        `attachmentsForMessage=${attachment.messageContentHash}`,
        `attachmentType=${attachment.attachmentType}`,
        `label=${attachment.label}`,
        `url=${attachment.url ?? "null"}`,
        `mimeType=${attachment.mimeType ?? "null"}`,
        `visibleText=${attachment.visibleText ?? "null"}`,
        `extractedText=${attachment.extractedText ?? "null"}`,
        `analysisText=${attachment.analysisText ?? "null"}`
      ]);

      return [
        `#${index + 1}`,
        `source=${message.source}`,
        `role=${message.messageRole}`,
        `capturedAt=${message.capturedAt}`,
        `title=${title}`,
        `text=${message.messageText}`,
        ...(attachmentLines.length > 0 ? ["messageBoundAttachments:", ...attachmentLines] : [])
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function extractResponsesOutputText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (text) {
    return text;
  }

  throw new LlmAnalysisError("LLM response did not contain output text.");
}

function extractChatCompletionText(payload: unknown): string {
  const response = payload as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  const text = content
    ?.map((item) => item.text)
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (text) {
    return text;
  }

  throw new LlmAnalysisError("Chat completion response did not contain message content.");
}

export function buildAnalysisUserPrompt(
  analysisDate: string,
  messages: CapturedMessageRecord[]
): string {
  return [
    `Analysis date: ${analysisDate}`,
    "Formatting rule: thoughtSummary must be readable and naturally segmented. Use 4-7 paragraphs separated by two newline characters. Each paragraph should carry one clear logical move: underlying tension, non-consensus insight, AI reply contribution, unresolved cliff, tomorrow trigger. Do not return one dense block of prose.",
    "Thought Battle Logs:",
    buildBattleLog(messages)
  ].join("\n\n");
}

export function buildManualAnalysisPrompt(
  analysisDate: string,
  messages: CapturedMessageRecord[]
): string {
  return [
    "# AGE-FX Manual External Model Bridge",
    "",
    "You are the external model for the AGE-FX Thought Console manual bridge.",
    "Follow the AGE System Brain protocol exactly.",
    "Return only one valid JSON object. Do not wrap it in Markdown. Do not explain before or after the JSON.",
    "",
    "## System Protocol",
    systemPrompt,
    "",
    "## User Battle Payload",
    buildAnalysisUserPrompt(analysisDate, messages)
  ].join("\n");
}

export function parseAnalysisJson(
  text: string,
  analysisDate?: string
): DailyBattleAnalysis {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(trimmed) as unknown;
  const analysis = analysisSchema.parse(parsed);

  return {
    ...analysis,
    analysisDate: analysisDate ?? analysis.analysisDate,
    recommendedEquipment: [
      {
        ...analysis.recommendedEquipment[0],
        state: "recommended"
      }
    ]
  };
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const errorBody = await response.text().catch(() => "");
  throw new LlmAnalysisError(summarizeUpstreamError(response.status, errorBody));
}

export function createOpenAiAnalysisEngine(
  options: OpenAiAnalysisEngineOptions = {}
): AnalysisEngine {
  const apiKey = options.apiKey ?? process.env.AGE_FX_OPENAI_API_KEY ?? "";
  const baseUrl = options.baseUrl ?? process.env.AGE_FX_OPENAI_BASE_URL ?? "";
  const model = options.model ?? process.env.AGE_FX_OPENAI_MODEL ?? "";
  const protocol = normalizeProtocol(options.protocol ?? process.env.AGE_FX_OPENAI_PROTOCOL);
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async analyze(analysisDate, messages) {
      if (!apiKey || !baseUrl || !model) {
        throw new MissingLlmConfigError();
      }

      if (protocol === "chat_completions") {
        const response = await fetchFn(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: buildAnalysisUserPrompt(analysisDate, messages)
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "age_fx_daily_battle_analysis",
                strict: true,
                schema: responseJsonSchema
              }
            }
          })
        });

        await assertOk(response);
        return parseAnalysisJson(extractChatCompletionText(await response.json()), analysisDate);
      }

      const response = await fetchFn(`${normalizeBaseUrl(baseUrl)}/responses`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: buildAnalysisUserPrompt(analysisDate, messages)
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "age_fx_daily_battle_analysis",
              strict: true,
              schema: responseJsonSchema
            },
            verbosity: "high"
          }
        })
      });

      await assertOk(response);
      return parseAnalysisJson(extractResponsesOutputText(await response.json()), analysisDate);
    }
  };
}
