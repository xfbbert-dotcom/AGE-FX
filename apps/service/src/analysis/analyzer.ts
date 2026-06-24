import type { EquipmentState } from "../equipment/equipmentRepository.js";
import type { CapturedMessageRecord } from "../messages/messageRepository.js";

export interface EquipmentRecommendation {
  equipmentName: string;
  equipmentType: string;
  whyThisEquipment: string;
  sourceBattleInsight: string;
  minimumViableVersion: string;
  expectedBenefit: string;
  printPrompt: string;
  state: EquipmentState;
}

export interface DailyBattleAnalysis {
  analysisDate: string;
  thoughtTitle: string;
  thoughtSummary: string;
  coreThemes: string[];
  repeatedQuestions: string[];
  newlyFormedJudgments: string[];
  unclosedThinkingLoops: string[];
  reusableMaterial: string[];
  threadsToContinueTomorrow: string[];
  recommendedEquipment: EquipmentRecommendation[];
}

interface BattleSignals {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  sources: string[];
  categories: string[];
  keywords: string[];
  questionCount: number;
  judgmentCount: number;
  loopCount: number;
  latestCategory: string;
}

const emptyDayThread =
  "Open ChatGPT or Gemini in Edge with C-Funnels enabled so AGE-FX can capture tomorrow's battle record.";

const noisePattern =
  /creating image|final tuning|cancel send|selected text|ChatGPT says: edit|正在创建图片|最后微调|取消发送|所选内容/i;

const categoryPatterns: Array<{ category: string; pattern: RegExp }> = [
  {
    category: "architecture and system design",
    pattern: /architecture|system|schema|database|service|whitepaper|架构|系统|数据库|服务|白皮书/i
  },
  {
    category: "tool and equipment creation",
    pattern: /tool|equipment|card|template|prompt|workflow|print|工具|装备|卡片|模板|提示词|打印/i
  },
  {
    category: "capture reliability",
    pattern: /capture|extension|edge|browser|selector|抓取|捕获|插件|浏览器/i
  },
  {
    category: "console and preview experience",
    pattern: /console|preview|analysis|panel|refresh|控制台|预览|分析|面板|刷新/i
  },
  {
    category: "daily settlement cadence",
    pattern: /midnight|daily|settlement|tomorrow|today|complete day|just-ended day|零点|结算|整天|全天|昨天|今天|明天/i
  },
  {
    category: "product direction",
    pattern: /product|user|market|investor|产品|用户|市场|投资人/i
  }
];

const keywordPatterns: Array<{ keyword: string; pattern: RegExp }> = [
  { keyword: "preview", pattern: /preview|预览/i },
  {
    keyword: "settlement",
    pattern: /settlement|midnight|complete day|just-ended day|零点|结算|整天|全天|昨天/i
  },
  { keyword: "capture", pattern: /capture|captured|extension|selector|抓取|捕获|插件/i },
  { keyword: "database", pattern: /database|sqlite|raw records|数据库|原始记录/i },
  { keyword: "equipment", pattern: /equipment|tool|print|装备|工具|打印/i },
  { keyword: "architecture", pattern: /architecture|system|whitepaper|架构|系统|白皮书/i },
  { keyword: "console", pattern: /console|panel|控制台|面板/i },
  { keyword: "refresh", pattern: /refresh|timely|update|刷新|更新/i }
];

const questionPattern = /\?|could|should|how|why|what|can|does|is |are |吗|什么|怎么|为什么|是不是|能不能|可不可以/i;
const judgmentPattern = /i think|i believe|should|need to|decide|will|must|我觉得|我认为|应该|需要|决定|可以|必须/i;
const loopPattern = /tomorrow|next|follow up|unclosed|need to decide|明天|之后|接下来|未完成|继续|待定/i;

function normalizeMessageText(messageText: string): string {
  return messageText
    .replace(/^(You said:|ChatGPT says:|Gemini says:|你说：|ChatGPT 说：|Gemini 说：)\s*/i, "")
    .replace(/^selected text\s*/i, "")
    .replace(/^所选内容\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUserThought(message: CapturedMessageRecord): boolean {
  return message.messageRole === "user" || message.messageText.trim().startsWith("你说：");
}

function meaningfulTexts(messages: CapturedMessageRecord[]): string[] {
  return messages
    .map((message) => normalizeMessageText(message.messageText))
    .filter((text) => text.length > 0 && !noisePattern.test(text));
}

function countMatches(texts: string[], pattern: RegExp): number {
  return texts.filter((text) => pattern.test(text)).length;
}

function categoriesForText(text: string): string[] {
  return categoryPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ category }) => category);
}

function rankedEvidence<T extends { pattern: RegExp }>(
  texts: string[],
  items: Array<T>
): Array<T & { count: number }> {
  return items
    .map((item) => ({
      ...item,
      count: countMatches(texts, item.pattern)
    }))
    .filter(({ count }) => count > 0)
    .sort((left, right) => right.count - left.count);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function firstOrFallback(values: string[], fallback: string): string {
  return values.length > 0 ? values[0] : fallback;
}

function lastOrFallback(values: string[], fallback: string): string {
  return values.length > 0 ? values[values.length - 1] : fallback;
}

function inferSignals(messages: CapturedMessageRecord[]): BattleSignals {
  const allTexts = meaningfulTexts(messages);
  const userTexts = meaningfulTexts(messages.filter(isUserThought));
  const categories = rankedEvidence(allTexts, categoryPatterns).map(({ category }) => category);
  const keywords = rankedEvidence(allTexts, keywordPatterns).map(({ keyword }) => keyword);
  const latestText = lastOrFallback(allTexts, "");
  const latestCategory = lastOrFallback(
    categoriesForText(latestText),
    lastOrFallback(categories, "thinking review")
  );

  return {
    totalMessages: messages.length,
    userMessages: userTexts.length,
    assistantMessages: messages.filter((message) => message.messageRole === "assistant").length,
    sources: unique(messages.map((message) => message.source)),
    categories,
    keywords,
    questionCount: userTexts.filter((text) => questionPattern.test(text)).length,
    judgmentCount: userTexts.filter((text) => judgmentPattern.test(text)).length,
    loopCount: allTexts.filter((text) => loopPattern.test(text)).length,
    latestCategory
  };
}

function sourceSummary(sources: string[]): string {
  if (sources.length === 0) {
    return "no AI source";
  }

  return sources.join(" and ");
}

function createEmptyDayRecommendation(): EquipmentRecommendation {
  return {
    equipmentName: "C-Funnels Capture Check",
    equipmentType: "capture_check",
    whyThisEquipment: "No messages were captured for this battle day.",
    sourceBattleInsight: "No captured battle record",
    minimumViableVersion: "Open ChatGPT or Gemini in Edge and confirm C-Funnels captures one message.",
    expectedBenefit: "Restores tomorrow's local battle record before analysis begins.",
    printPrompt: "Print a small C-Funnels capture checklist for the desk.",
    state: "recommended"
  };
}

function createConceptCardRecommendation(signals: BattleSignals): EquipmentRecommendation {
  const sourceBattleInsight = `Latest meaningful thread centers on ${signals.latestCategory}, with ${signals.userMessages} user turns grounded by ${signals.assistantMessages} assistant replies.`;

  return {
    equipmentName: "Lake Blue Concept Card",
    equipmentType: "concept_card",
    whyThisEquipment: `The day is producing reusable structure around ${signals.latestCategory}.`,
    sourceBattleInsight,
    minimumViableVersion: `A one-page card that names the ${signals.latestCategory} problem, the current judgment, the unresolved loop, and the next action.`,
    expectedBenefit: "Turns the day's scattered thinking into a compact object that can be reviewed or built on tomorrow.",
    printPrompt: `Create a lake-blue concept card summarizing the ${signals.latestCategory} thread without quoting the raw transcript.`,
    state: "recommended"
  };
}

function createThoughtSummary(signals: BattleSignals): string {
  const primaryCategory = firstOrFallback(signals.categories, signals.latestCategory);
  const secondaryCategory = signals.categories.find((category) => category !== primaryCategory);
  const keywordSummary =
    signals.keywords.length > 0 ? signals.keywords.slice(0, 5).join("、") : signals.latestCategory;
  const sourceText = sourceSummary(signals.sources).replace(" and ", " 和 ");
  const secondaryText = secondaryCategory
    ? `同时，${secondaryCategory} 也在旁边浮现出来，它不是独立的杂项，更像是主线下面的支撑结构。`
    : "目前还没有形成很强的第二主线，今天更像是在围绕一个核心问题反复校准。";
  const questionText =
    signals.questionCount > 0
      ? "你今天不是在简单收集信息，而是在反复追问：一个想法怎样才能从灵感变成可操作的结构。"
      : "今天的表达更偏探索和整理，问题感还在形成中，但已经能看见一个需要被收束的方向。";
  const judgmentText =
    signals.judgmentCount > 0
      ? "一个新的判断正在变清楚：你需要的不是更多碎片标签，而是能把思考压缩成判断、线索和下一步行动的结构。"
      : "今天还没有出现很硬的最终判断，更像是在为后续判断搭建语境和边界。";
  const loopText =
    signals.loopCount > 0
      ? "未闭合的地方也很明确：下一步要决定这个方向的最小可用版本，以及它应该以什么规则继续运转。"
      : `仍然值得明天继续追的线索，是把 ${signals.latestCategory} 变成一个具体 artifact，而不是继续停留在讨论里。`;

  return [
    `今天的思考主线集中在 ${primaryCategory}。从全天 ${signals.totalMessages} 条捕获记录来看，其中有 ${signals.userMessages} 条来自你的主动思考，${signals.assistantMessages} 条来自 GPT/Gemini 的回应，来源覆盖 ${sourceText}。这些内容合在一起看，不像是一组零散聊天，更像是在为一个可以长期使用的个人思考系统定规则。`,
    `${questionText} 关键词集中在 ${keywordSummary}，说明你真正关心的是“这个系统怎么变得有用”，而不是界面上多几个分类。${secondaryText}`,
    `GPT/Gemini 的回复在今天的战况里更像辅助雷达：它们提供解释、边界和可能路径，但真正的主导线仍然来自你的选择。${judgmentText}`,
    `${loopText} 这也是当前最值得保留的战果：你已经发现，AGE-FX Thought Console 的价值不应该是把思考拆成六个小盒子，而是把一整天的对话压缩成一份能读、能复盘、能推动装备打印的战况报告。`,
    `推荐打印的装备应该服务于这个收束动作：它要把今天的主线、当前判断、未解决的问题和明天要继续推进的动作放在同一个小工具里。这样明天打开控制台时，你看到的不是一堆标签，而是一份真正能接住“湖蓝之智”的连续思考记录。`
  ].join("\n\n");
}

export function analyzeDailyBattle(
  analysisDate: string,
  messages: CapturedMessageRecord[]
): DailyBattleAnalysis {
  const signals = inferSignals(messages);

  if (signals.userMessages === 0) {
    return {
      analysisDate,
      thoughtTitle: "No captured battle record",
      thoughtSummary:
        "今天还没有捕获到可用于分析的主动思考记录。AGE-FX 会继续等待你在 Edge 里的 ChatGPT 或 Gemini 对话；只要 C-Funnels 捕获到新的用户思考和助手回复，预览就可以读取当天累计记录生成临时战况。正式战况仍然只会在本地零点结算刚刚结束的昨天。",
      coreThemes: [],
      repeatedQuestions: [],
      newlyFormedJudgments: [],
      unclosedThinkingLoops: [],
      reusableMaterial: [],
      threadsToContinueTomorrow: [emptyDayThread],
      recommendedEquipment: [createEmptyDayRecommendation()]
    };
  }

  const primaryCategory = firstOrFallback(signals.categories, signals.latestCategory);
  const secondaryCategory = signals.categories.find((category) => category !== primaryCategory);
  const keywordSummary =
    signals.keywords.length > 0 ? signals.keywords.slice(0, 4).join(", ") : signals.latestCategory;

  return {
    analysisDate,
    thoughtTitle: `Daily battle for ${analysisDate}`,
    thoughtSummary: createThoughtSummary(signals),
    coreThemes: [
      `Primary theme: ${primaryCategory} is the strongest visible thinking lane.`,
      ...(secondaryCategory ? [`Secondary theme: ${secondaryCategory} is now visible in the same-day record.`] : []),
      `Evidence keywords: ${keywordSummary}.`,
      `conversation pattern: ${signals.totalMessages} captured turns, including ${signals.userMessages} user turns and ${signals.assistantMessages} assistant replies across ${sourceSummary(signals.sources)}.`
    ],
    repeatedQuestions:
      signals.questionCount > 0
        ? [
            `A question cluster is forming around how to turn ${primaryCategory} from an idea into a usable structure.`
          ]
        : [`No strong question cluster yet; the day is still mostly exploratory around ${primaryCategory}.`],
    newlyFormedJudgments:
      signals.judgmentCount > 0
        ? [
            `A working preference is forming: ${primaryCategory} should be handled through clearer structure instead of ad-hoc conversation.`
          ]
        : [`No firm judgment is visible yet; ${primaryCategory} remains in exploration mode.`],
    unclosedThinkingLoops:
      signals.loopCount > 0
        ? [
            `An open loop remains: decide the next concrete version or operating rule for ${primaryCategory}.`
          ]
        : [`The next open loop is to choose one concrete follow-up for ${signals.latestCategory}.`],
    reusableMaterial: [
      `Reusable material: the ${signals.latestCategory} thread can become a card, checklist, template, or small tool; current evidence keywords are ${keywordSummary}.`,
      ...(secondaryCategory
        ? [`Secondary material: ${secondaryCategory} may support the same equipment concept.`]
        : [])
    ],
    threadsToContinueTomorrow: [
      `Continue the ${signals.latestCategory} thread by defining one decision, one artifact, and one test.`
    ],
    recommendedEquipment: [createConceptCardRecommendation(signals)]
  };
}
