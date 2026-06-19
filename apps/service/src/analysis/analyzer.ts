import type { CapturedMessageRecord } from "../messages/messageRepository.js";
import type { EquipmentState } from "../equipment/equipmentRepository.js";

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
  coreThemes: string[];
  repeatedQuestions: string[];
  newlyFormedJudgments: string[];
  unclosedThinkingLoops: string[];
  reusableMaterial: string[];
  threadsToContinueTomorrow: string[];
  recommendedEquipment: EquipmentRecommendation[];
}

const emptyDayThread =
  "Open ChatGPT or Gemini in Edge with C-Funnels enabled so AGE-FX can capture tomorrow's battle record.";

const toolMaterialPattern = /\b(tool|product|concept|card|equipment|template|prompt|workflow|system)\b/i;
const judgmentPattern = /\b(i think|i believe|i learned|should|need to|decide|will|must)\b/i;
const unclosedLoopPattern = /\b(tomorrow|need to decide|unclosed|open question|next|follow up)\b/i;

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeMessageText(messageText: string): string {
  return messageText.replace(/\s+/g, " ").trim();
}

function userMessageTexts(messages: CapturedMessageRecord[]): string[] {
  return messages
    .filter((message) => message.messageRole === "user")
    .map((message) => normalizeMessageText(message.messageText))
    .filter((messageText) => messageText.length > 0);
}

function questionLike(messageText: string): boolean {
  return messageText.includes("?") || /^(what|why|how|could|should|can|do|does|is|are|where|when)\b/i.test(messageText);
}

function firstOrFallback(values: string[], fallback: string): string {
  return values.length > 0 ? values[0] : fallback;
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

function createConceptCardRecommendation(sourceBattleInsight: string): EquipmentRecommendation {
  return {
    equipmentName: "Lake Blue Concept Card",
    equipmentType: "concept_card",
    whyThisEquipment: sourceBattleInsight,
    sourceBattleInsight,
    minimumViableVersion: sourceBattleInsight,
    expectedBenefit: "Keep this captured material reusable for tomorrow's thinking.",
    printPrompt: `Create a lake-blue concept card from this captured material: ${sourceBattleInsight}`,
    state: "recommended"
  };
}

export function analyzeDailyBattle(
  analysisDate: string,
  messages: CapturedMessageRecord[]
): DailyBattleAnalysis {
  const userTexts = userMessageTexts(messages);

  if (userTexts.length === 0) {
    return {
      analysisDate,
      thoughtTitle: "No captured battle record",
      coreThemes: [],
      repeatedQuestions: [],
      newlyFormedJudgments: [],
      unclosedThinkingLoops: [],
      reusableMaterial: [],
      threadsToContinueTomorrow: [emptyDayThread],
      recommendedEquipment: [createEmptyDayRecommendation()]
    };
  }

  const repeatedQuestions = unique(userTexts.filter(questionLike));
  const newlyFormedJudgments = unique(
    userTexts.filter((text) => !questionLike(text) && judgmentPattern.test(text))
  );
  const unclosedThinkingLoops = unique(userTexts.filter((text) => unclosedLoopPattern.test(text)));
  const reusableMaterial = unique(userTexts.filter((text) => toolMaterialPattern.test(text)));
  const coreThemes = unique([
    ...reusableMaterial,
    ...newlyFormedJudgments,
    ...repeatedQuestions
  ]).slice(0, 5);
  const threadsToContinueTomorrow = unique(
    unclosedThinkingLoops.length > 0 ? unclosedThinkingLoops : [userTexts[userTexts.length - 1]]
  );
  const sourceBattleInsight = firstOrFallback(reusableMaterial, userTexts[0]);

  return {
    analysisDate,
    thoughtTitle: `Daily battle for ${analysisDate}`,
    coreThemes,
    repeatedQuestions,
    newlyFormedJudgments,
    unclosedThinkingLoops,
    reusableMaterial,
    threadsToContinueTomorrow,
    recommendedEquipment: [createConceptCardRecommendation(sourceBattleInsight)]
  };
}
