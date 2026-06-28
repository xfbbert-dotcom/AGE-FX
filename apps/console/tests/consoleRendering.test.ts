import { describe, expect, it, afterEach, vi } from "vitest";
import {
  REFRESH_INTERVAL_MS,
  createConsoleApi,
  responseErrorMessage,
  renderAnalysis,
  renderCollectionStatus,
  renderRuntimeSettings,
  setConsoleLanguage,
  todayIsoDate
} from "../src/main.js";

describe("console rendering", () => {
  afterEach(() => {
    localStorage.clear();
    setConsoleLanguage("zh");
    vi.restoreAllMocks();
  });

  it("renders the battle title and recommended equipment name", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis());

    expect(document.body.textContent).toContain("Daily battle for 2026-06-19");
    expect(document.body.textContent).toContain("Lake Blue Concept Card");
  });

  it("renders FX Burst as an equipment print chamber", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis());

    expect(document.body.textContent).toContain("装备打印舱");
    expect(document.body.textContent).toContain("确认打印");
    expect(document.body.textContent).toContain("暂存档案");
    expect(document.querySelector(".print-chamber")).not.toBeNull();
    expect(document.querySelectorAll(".equipment-state-button")).toHaveLength(2);
  });

  it("activates side navigation targets when clicked", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis());
    document
      .querySelector<HTMLButtonElement>('.side-nav-button[data-target="equipment-panel"]')!
      .click();

    expect(
      document
        .querySelector<HTMLButtonElement>('.side-nav-button[data-target="equipment-panel"]')!
        .classList.contains("is-active")
    ).toBe(true);
  });

  it("renders service data path and captured message count in Chinese by default", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis(), {
      dataRoot: "D:\\AGE-FX-Thought-Console",
      capturedMessages: 7
    });

    expect(document.body.textContent).toContain("D:\\AGE-FX-Thought-Console");
    expect(document.body.textContent).toContain("7 条捕获消息");
    expect(document.body.textContent).toContain("Lake Blue Concept Card");
  });

  it("labels preview as a temporary full current-day scan", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(
      createAnalysis(),
      {
        dataRoot: "D:\\AGE-FX-Thought-Console",
        capturedMessages: 9
      },
      "preview"
    );

    expect(document.body.textContent).toContain("今日临时全量扫描");
    expect(document.body.textContent).toContain("9 条捕获消息");
    expect(document.body.textContent).not.toContain("Generate");
  });

  it("labels manual bridge preview as non-persistent", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(
      createAnalysis(),
      {
        dataRoot: "D:\\AGE-FX-Thought-Console",
        capturedMessages: 9
      },
      "manual-preview"
    );

    expect(document.body.textContent).toContain("手动模型桥预览");
    expect(document.body.textContent).not.toContain("formal settlement");
  });

  it("formats today from the local calendar date instead of UTC", () => {
    const shanghaiEarlyMorning = new Date(2026, 0, 1, 1, 30, 0);

    expect(todayIsoDate(shanghaiEarlyMorning)).toBe("2026-01-01");
    expect(shanghaiEarlyMorning.toISOString().slice(0, 10)).toBe("2025-12-31");
  });

  it("uses a short refresh interval so the console follows new captures", () => {
    expect(REFRESH_INTERVAL_MS).toBeGreaterThanOrEqual(5000);
    expect(REFRESH_INTERVAL_MS).toBeLessThanOrEqual(15000);
  });

  it("keeps formal analysis out of the live refresh path", () => {
    const api = createConsoleApi("http://127.0.0.1:3987");

    expect(api.statusUrl("2026-06-20")).toBe(
      "http://127.0.0.1:3987/api/status?date=2026-06-20"
    );
    expect(api.settledAnalysisUrl("2026-06-19")).toBe(
      "http://127.0.0.1:3987/api/analysis?date=2026-06-19"
    );
    expect(api.previewUrl()).toBe("http://127.0.0.1:3987/api/preview");
    expect(api.manualPromptUrl("2026-06-20")).toBe(
      "http://127.0.0.1:3987/api/manual-analysis/prompt?date=2026-06-20"
    );
    expect(api.manualPreviewUrl()).toBe(
      "http://127.0.0.1:3987/api/manual-analysis/preview"
    );
    expect(api.manualSettleUrl()).toBe(
      "http://127.0.0.1:3987/api/manual-analysis/settle"
    );
    expect(api.runtimeConfigUrl()).toBe(
      "http://127.0.0.1:3987/api/settings/runtime-config"
    );
    expect(api.equipmentUrl()).toBe("http://127.0.0.1:3987/api/equipment");
    expect(api.equipmentStateUrl(7)).toBe(
      "http://127.0.0.1:3987/api/equipment/7/state"
    );
    expect(JSON.stringify(api)).not.toContain("/api/analyze");
  });

  it("keeps preview mode on the preview endpoint during live refresh", () => {
    const api = createConsoleApi("http://127.0.0.1:3987");

    expect(api.refreshPlan("preview", "2026-06-20", "2026-06-19")).toEqual({
      mode: "preview",
      statusUrl: "http://127.0.0.1:3987/api/status?date=2026-06-20",
      previewUrl: "http://127.0.0.1:3987/api/preview"
    });
    expect(api.refreshPlan("collection", "2026-06-20", "2026-06-19")).toEqual({
      mode: "collection",
      statusUrl: "http://127.0.0.1:3987/api/status?date=2026-06-20",
      settledAnalysisUrl: "http://127.0.0.1:3987/api/analysis?date=2026-06-19"
    });
  });

  it("escapes dynamic analysis strings before inserting markup", () => {
    const suspiciousText = `<img src=x onerror="window.__xss=1">`;
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis({
      analysisDate: "2026-06-19",
      thoughtTitle: suspiciousText,
      thoughtSummary: suspiciousText,
      coreThemes: [suspiciousText],
      repeatedQuestions: [],
      newlyFormedJudgments: [],
      unclosedThinkingLoops: [],
      reusableMaterial: [],
      threadsToContinueTomorrow: [],
      recommendedEquipment: [
        {
          equipmentName: suspiciousText,
          equipmentType: "concept_card",
          whyThisEquipment: suspiciousText,
          sourceBattleInsight: suspiciousText,
          minimumViableVersion: suspiciousText,
          expectedBenefit: suspiciousText,
          printPrompt: suspiciousText,
          state: "recommended"
        }
      ]
    });

    expect(document.querySelector("img")).toBeNull();
    expect(document.body.textContent).toContain(suspiciousText);
  });

  it("extracts service error details from failed JSON responses", async () => {
    const response = new Response(
      JSON.stringify({
        error: "llm_analysis_failed",
        message: "LLM analysis request failed with 400: invalid model"
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" }
      }
    );

    await expect(responseErrorMessage(response, "preview")).resolves.toBe(
      "AGE-FX preview returned 502: LLM analysis request failed with 400: invalid model"
    );
  });

  it("renders the plan A summary layout instead of six analysis category panels", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis());

    expect(document.body.textContent).toContain("今日战况分析");
    expect(document.body.textContent).toContain("今天的思考主线集中在湖蓝控制台体验");
    expect(document.body.textContent).toContain("推荐装备");
    expect(document.body.textContent).not.toContain("Core Themes");
    expect(document.body.textContent).not.toContain("Repeated Questions");
    expect(document.body.textContent).not.toContain("New Judgments");
    expect(document.body.textContent).not.toContain("Unclosed Loops");
    expect(document.body.textContent).not.toContain("Reusable Material");
    expect(document.body.textContent).not.toContain("Tomorrow Threads");
  });

  it("breaks a long single-block thought summary into readable paragraphs", () => {
    document.body.innerHTML = `<main id="app"></main>`;
    const analysis = createAnalysis();

    renderAnalysis({
      ...analysis,
      thoughtSummary:
        "第一层，今天的思考不是在寻找一个普通界面，而是在反复确认系统如何承接长期自我进化。这个问题背后真正的矛盾，是你希望工具既能自动运行，又不能剥夺你对判断的主权。第二层，模型回复提供了很多技术路径，但真正重要的不是路径数量，而是哪些路径可以稳定沉淀成日常仪式。第三层，未闭环的问题仍然是如何让装备打印从一次性灵感变成可复用流程。明天最值得继续推进的是启动补结算、分析呈现和装备确认之间的关系。"
    });

    expect(document.querySelectorAll(".summary-copy p").length).toBeGreaterThan(1);
  });

  it("renders Chinese UI labels by default", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis(createAnalysis());

    expect(document.body.textContent).toContain("今日战况分析");
    expect(document.body.textContent).toContain("推荐装备");
    expect(document.body.textContent).toContain("语言");
  });

  it("renders English UI labels after switching language", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    setConsoleLanguage("en");
    renderAnalysis(createAnalysis());

    expect(document.body.textContent).toContain("Daily Battle Analysis");
    expect(document.body.textContent).toContain("Recommended Equipment");
    expect(document.body.textContent).toContain("Language");
  });

  it("renders API settings without exposing the configured API key", () => {
    const html = renderRuntimeSettings({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
      hasApiKey: true,
      extensionOrigins: "chrome-extension://edgeid",
      protocol: "chat_completions"
    });

    expect(html).toContain("API 设置");
    expect(html).toContain("API Key 已配置");
    expect(html).toContain("https://api.openai.com/v1");
    expect(html).toContain("gpt-5.2");
    expect(html).toContain("chat_completions");
    expect(html).toContain("chrome-extension://edgeid");
    expect(html).not.toContain("sk-");
  });

  it("preserves unsaved API settings draft across settings re-render", () => {
    document.body.innerHTML = `<main id="settings"></main>`;
    const config = {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
      hasApiKey: false,
      extensionOrigins: "chrome-extension://edgeid",
      protocol: "responses"
    };
    const settings = document.querySelector<HTMLElement>("#settings")!;

    settings.innerHTML = renderRuntimeSettings(config);
    document.querySelector<HTMLInputElement>("#runtime-base-url")!.value =
      "https://draft.example/v1";
    document.querySelector<HTMLInputElement>("#runtime-model")!.value = "draft-model";
    document.querySelector<HTMLSelectElement>("#runtime-protocol")!.value =
      "chat_completions";
    document.querySelector<HTMLInputElement>("#runtime-api-key")!.value = "draft-key";
    document.querySelector<HTMLInputElement>("#runtime-extension-origins")!.value =
      "chrome-extension://draftid";

    settings.innerHTML = renderRuntimeSettings(config);

    expect(document.querySelector<HTMLInputElement>("#runtime-base-url")!.value).toBe(
      "https://draft.example/v1"
    );
    expect(document.querySelector<HTMLInputElement>("#runtime-model")!.value).toBe(
      "draft-model"
    );
    expect(document.querySelector<HTMLInputElement>("#runtime-api-key")!.value).toBe(
      "draft-key"
    );
    expect(document.querySelector<HTMLSelectElement>("#runtime-protocol")!.value).toBe(
      "chat_completions"
    );
    expect(
      document.querySelector<HTMLInputElement>("#runtime-extension-origins")!.value
    ).toBe("chrome-extension://draftid");
  });

  it("renders the collection page in Chinese without English control labels", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderCollectionStatus(
      "2026-06-22",
      "2026-06-21",
      {
        dataRoot: "D:\\AGE-FX-Thought-Console",
        capturedMessages: 3
      },
      null,
      {
        baseUrl: "https://api.openai-next.com/v1",
        model: "gpt-5",
        hasApiKey: true,
        extensionOrigins: "chrome-extension://edgeid",
        protocol: "chat_completions"
      }
    );

    expect(document.body.textContent).toContain("正在收集今日战况");
    expect(document.body.textContent).toContain("等待结算");
    expect(document.body.textContent).toContain("预览今日");
    expect(document.body.textContent).toContain("打开预览");
    expect(document.body.textContent).toContain("手动模型桥");
    expect(document.body.textContent).toContain("复制提示词");
    expect(document.body.textContent).not.toContain("Preview Today");
    expect(document.body.textContent).not.toContain("Open Preview");
    expect(document.body.textContent).not.toContain("Manual Model Bridge");
  });

  it("shows immediate feedback when preview is clicked", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Promise<Response>(() => undefined))
    );

    renderCollectionStatus(
      "2026-06-22",
      "2026-06-21",
      {
        dataRoot: "D:\\AGE-FX-Thought-Console",
        capturedMessages: 3
      },
      null
    );

    document.querySelector<HTMLButtonElement>("#preview-button")!.click();

    expect(document.body.textContent).toContain("预览启动中");
    expect(document.querySelector<HTMLButtonElement>("#preview-button")!.disabled).toBe(
      true
    );
  });

  function createAnalysis() {
    return {
      analysisDate: "2026-06-19",
      thoughtTitle: "Daily battle for 2026-06-19",
      thoughtSummary:
        "今天的思考主线集中在湖蓝控制台体验。你不是在寻找更多分类，而是在寻找一个能把全天思考收束成判断、线索和下一步装备的 AGE 系统视角。\n\nGPT/Gemini 的回复在这里作为辅助证据参与分析，但界面不回放原始对话。",
      coreThemes: ["Lake-blue cockpit flow"],
      repeatedQuestions: ["How should FX Burst focus the console?"],
      newlyFormedJudgments: ["I need a practical local console."],
      unclosedThinkingLoops: ["Decide tomorrow's equipment minimum version."],
      reusableMaterial: ["Reusable cockpit panel language"],
      threadsToContinueTomorrow: ["Continue equipment panel tuning."],
      recommendedEquipment: [
        {
          id: 1,
          analysisDate: "2026-06-19",
          equipmentName: "Lake Blue Concept Card",
          equipmentType: "concept_card",
          whyThisEquipment: "It compresses reusable material into a practical card.",
          sourceBattleInsight: "Lake-blue cockpit flow",
          minimumViableVersion: "One printable card with title, why, and next action.",
          expectedBenefit: "Keeps the next move visible.",
          printPrompt: "Print a lake-blue concept card.",
          state: "recommended" as const
        }
      ]
    };
  }
});
