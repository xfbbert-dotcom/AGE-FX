import { describe, expect, it, vi } from "vitest";
import {
  buildManualAnalysisPrompt,
  createOpenAiAnalysisEngine,
  MissingLlmConfigError,
  parseAnalysisJson,
  systemPrompt
} from "../src/analysis/llmAnalyzer.js";
import type { CapturedMessageRecord } from "../src/messages/messageRepository.js";

function capturedMessage(
  id: number,
  messageRole: CapturedMessageRecord["messageRole"],
  messageText: string
): CapturedMessageRecord {
  return {
    id,
    source: "chatgpt",
    capturedAt: `2026-06-20T12:${String(id).padStart(2, "0")}:00.000Z`,
    conversationDate: "2026-06-20",
    conversationTitle: "AGE-FX 深潜",
    pageUrl: "https://chatgpt.com/c/example",
    messageRole,
    messageText,
    contentHash: `${id}`.padStart(64, "0")
  };
}

function analysisPayload(thoughtTitle = "逆向认知坍缩") {
  return {
    analysisDate: "2026-06-20",
    thoughtTitle,
    thoughtSummary:
      "潜意识冰山：用户不是要一个普通总结器，而是在寻找一种把 AI 对话变成自我进化装备的认知操作系统。\n\n非共识洞察：未来的个人生产力入口不是任务列表，而是能从对话残骸中打印工具的本地智脑。",
    coreThemes: ["非共识个人操作系统"],
    repeatedQuestions: ["如何把思考直接打印成工具"],
    newlyFormedJudgments: ["分类面板不等于洞察"],
    unclosedThinkingLoops: ["需要定义深潜分析触发方式"],
    reusableMaterial: ["AGE System Brain prompt"],
    threadsToContinueTomorrow: ["继续装备打印协议"],
    recommendedEquipment: [
      {
        equipmentName: "黑箱逆燃器",
        equipmentType: "非共识透视器",
        whyThisEquipment: "解决浅层总结无法产生认知增益的问题。",
        sourceBattleInsight: "控制台不能只是分类，它必须打印装备。",
        minimumViableVersion: "一个单文件 HTML，粘贴洞察后生成反共识卡片。",
        expectedBenefit: "把模糊直觉变成可反复使用的思考武器。",
        printPrompt: "制作黑箱逆燃器。",
        state: "recommended"
      }
    ]
  };
}

describe("OpenAI LLM analysis engine", () => {
  it("requires explicit endpoint, model, and API key configuration", async () => {
    const engine = createOpenAiAnalysisEngine({
      apiKey: "",
      baseUrl: "",
      model: "",
      fetchFn: vi.fn()
    });

    await expect(engine.analyze("2026-06-20", [])).rejects.toBeInstanceOf(
      MissingLlmConfigError
    );
  });

  it("sends battle logs to the configured Responses endpoint and parses equipment JSON", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify(analysisPayload())
      })
    }));
    const engine = createOpenAiAnalysisEngine({
      apiKey: "test-key",
      baseUrl: "https://api.openai.test/v1",
      model: "test-model",
      protocol: "responses",
      fetchFn: fetchMock as unknown as typeof fetch
    });

    const analysis = await engine.analyze("2026-06-20", [
      capturedMessage(1, "user", "控制台分析太浅了，我要非共识理解。"),
      capturedMessage(2, "assistant", "可以升级为 AGE System Brain。")
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.test/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-key",
          "content-type": "application/json"
        })
      })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("test-model");
    expect(body.text.format.type).toBe("json_schema");
    expect(JSON.stringify(body.input)).toContain("AGE-FX 核心系统智脑");
    expect(JSON.stringify(body.input)).toContain("控制台分析太浅了");
    expect(analysis.thoughtTitle).toBe("逆向认知坍缩");
    expect(analysis.recommendedEquipment[0]).toMatchObject({
      equipmentName: "黑箱逆燃器",
      state: "recommended"
    });
  });

  it("supports OpenAI-compatible chat completions gateways", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(analysisPayload("兼容网关启动"))
            }
          }
        ]
      })
    }));
    const engine = createOpenAiAnalysisEngine({
      apiKey: "test-key",
      baseUrl: "https://api.openai-next.test/v1",
      model: "gpt-5",
      protocol: "chat_completions",
      fetchFn: fetchMock as unknown as typeof fetch
    });

    const analysis = await engine.analyze("2026-06-20", [
      capturedMessage(1, "user", "OpenAI Next 只展示 chat completions quickstart。")
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai-next.test/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[0]).toMatchObject({ role: "system" });
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("age_fx_daily_battle_analysis");
    expect(analysis.thoughtTitle).toBe("兼容网关启动");
  });

  it("includes compact upstream JSON error details when the LLM request fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            message: "Invalid value: 'json_object'. Supported values are: 'text', 'json_schema'."
          }
        })
    }));
    const engine = createOpenAiAnalysisEngine({
      apiKey: "test-key",
      baseUrl: "https://api.openai.test/v1",
      model: "test-model",
      fetchFn: fetchMock as unknown as typeof fetch
    });

    await expect(engine.analyze("2026-06-20", [])).rejects.toThrow(
      "Invalid value: 'json_object'"
    );
  });

  it("summarizes Cloudflare HTML timeout errors instead of returning the full page", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 524,
      text: async () =>
        '<!DOCTYPE html><html><head><title>openai-next.com | 524: A timeout occurred</title></head><body><h1>A timeout occurred</h1></body></html>'
    }));
    const engine = createOpenAiAnalysisEngine({
      apiKey: "test-key",
      baseUrl: "https://api.openai-next.test/v1",
      model: "gpt-5",
      protocol: "chat_completions",
      fetchFn: fetchMock as unknown as typeof fetch
    });

    await expect(engine.analyze("2026-06-20", [])).rejects.toThrow(
      "LLM analysis request failed with 524: openai-next.com | 524: A timeout occurred"
    );
    await expect(engine.analyze("2026-06-20", [])).rejects.not.toThrow("<!DOCTYPE html>");
  });

  it("redacts API key fragments from upstream LLM errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: {
            message:
              "Incorrect API key provided: sk-rNjP***********************************9dE6. You can find your API key at https://platform.openai.com/account/api-keys.",
            code: "invalid_api_key"
          }
        })
    }));
    const engine = createOpenAiAnalysisEngine({
      apiKey: "sk-rNjP-real-secret",
      baseUrl: "https://api.openai.test/v1",
      model: "test-model",
      fetchFn: fetchMock as unknown as typeof fetch
    });

    try {
      await engine.analyze("2026-06-20", []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("Incorrect API key provided: [REDACTED_API_KEY]");
      expect(message).not.toContain("sk-rNjP");
      expect(message).not.toContain("9dE6");
    }
  });

  it("builds a manual bridge prompt with protocol, date, source, role, and battle text", () => {
    const prompt = buildManualAnalysisPrompt("2026-06-20", [
      capturedMessage(1, "user", "Manual bridge should preserve the battle log."),
      capturedMessage(2, "assistant", "The response is supporting evidence.")
    ]);

    expect(prompt).toContain("AGE-FX Manual External Model Bridge");
    expect(prompt).toContain("Return only one valid JSON object");
    expect(prompt).toContain("AGE-FX 核心系统智脑");
    expect(prompt).toContain("Analysis date: 2026-06-20");
    expect(prompt).toContain("source=chatgpt");
    expect(prompt).toContain("role=user");
    expect(prompt).toContain("Manual bridge should preserve the battle log.");
    expect(prompt).toContain("role=assistant");
    expect(systemPrompt).toContain("湖蓝之智");
  });

  it("parses fenced JSON pasted back from a manual web model", () => {
    const analysis = parseAnalysisJson(
      ["```json", JSON.stringify(analysisPayload("Manual Bridge Collapse")), "```"].join("\n"),
      "2026-06-20"
    );

    expect(analysis).toMatchObject({
      analysisDate: "2026-06-20",
      thoughtTitle: "Manual Bridge Collapse"
    });
    expect(analysis.recommendedEquipment[0]).toMatchObject({
      equipmentName: "黑箱逆燃器",
      state: "recommended"
    });
  });
});
