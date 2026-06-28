import type { DatabaseSync } from "node:sqlite";
import { upsertDailyAnalysis } from "../analysis/analysisRepository.js";
import { createOpenAiAnalysisEngine, type AnalysisEngine } from "../analysis/llmAnalyzer.js";
import { createEquipmentRecommendation } from "../equipment/equipmentRepository.js";
import { listMessagesForDate } from "../messages/messageRepository.js";

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function previousLocalIsoDate(date = new Date()): string {
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);

  return localIsoDate(previousDay);
}

export function msUntilNextLocalMidnight(date = new Date()): number {
  const nextMidnight = new Date(date);
  nextMidnight.setHours(24, 0, 0, 0);

  return nextMidnight.getTime() - date.getTime();
}

export async function settleDailyBattle(
  db: DatabaseSync,
  analysisDate: string,
  analysisEngine: AnalysisEngine = createOpenAiAnalysisEngine()
) {
  const messages = listMessagesForDate(db, analysisDate);
  const analysis = await analysisEngine.analyze(analysisDate, messages);
  upsertDailyAnalysis(db, analysis);
  const equipment = createEquipmentRecommendation(
    db,
    analysisDate,
    analysis.recommendedEquipment[0]
  );

  return { analysis, equipment };
}

export function listPendingSettlementDates(db: DatabaseSync, now = new Date()): string[] {
  const today = localIsoDate(now);
  const rows = db
    .prepare(
      `
        SELECT DISTINCT captured_messages.conversation_date AS analysis_date
        FROM captured_messages
        LEFT JOIN daily_analyses
          ON daily_analyses.analysis_date = captured_messages.conversation_date
        WHERE captured_messages.conversation_date < $today
          AND daily_analyses.id IS NULL
        ORDER BY captured_messages.conversation_date ASC
      `
    )
    .all({ $today: today }) as unknown as Array<{ analysis_date: string }>;

  return rows.map((row) => row.analysis_date);
}

export async function settlePendingBattles(
  db: DatabaseSync,
  now = new Date(),
  analysisEngine: AnalysisEngine = createOpenAiAnalysisEngine()
) {
  const settled = [];

  for (const analysisDate of listPendingSettlementDates(db, now)) {
    settled.push(await settleDailyBattle(db, analysisDate, analysisEngine));
  }

  return settled;
}

export interface ScheduledSettlement {
  stop(): void;
}

export function scheduleMidnightSettlement(
  db: DatabaseSync,
  analysisEngine: AnalysisEngine = createOpenAiAnalysisEngine()
): ScheduledSettlement {
  let dailyTimer: NodeJS.Timeout | null = null;

  settlePendingBattles(db, new Date(), analysisEngine).catch((error: unknown) => {
    console.error("AGE-FX startup settlement backfill failed", error);
  });

  const runAndScheduleNext = () => {
    const analysisDate = previousLocalIsoDate();
    settleDailyBattle(db, analysisDate, analysisEngine).catch((error: unknown) => {
      console.error("AGE-FX midnight settlement failed", error);
    });
    dailyTimer = setInterval(() => {
      settleDailyBattle(db, previousLocalIsoDate(), analysisEngine).catch((error: unknown) => {
        console.error("AGE-FX midnight settlement failed", error);
      });
    }, 24 * 60 * 60 * 1000);
  };

  const initialTimer = setTimeout(runAndScheduleNext, msUntilNextLocalMidnight());

  return {
    stop() {
      clearTimeout(initialTimer);
      if (dailyTimer) {
        clearInterval(dailyTimer);
      }
    }
  };
}
