import type { DatabaseSync } from "node:sqlite";
import type { DailyBattleAnalysis } from "./analyzer.js";

export interface DailyAnalysisRecord {
  id: number;
  analysisDate: string;
  thoughtTitle: string;
  report: DailyBattleAnalysis;
  createdAt: string;
}

interface DailyAnalysisRow {
  id: number;
  analysis_date: string;
  thought_title: string;
  report_json: string;
  created_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapDailyAnalysisRow(row: DailyAnalysisRow): DailyAnalysisRecord {
  return {
    id: row.id,
    analysisDate: row.analysis_date,
    thoughtTitle: row.thought_title,
    report: JSON.parse(row.report_json) as DailyBattleAnalysis,
    createdAt: row.created_at
  };
}

export function upsertDailyAnalysis(
  db: DatabaseSync,
  analysis: DailyBattleAnalysis
): DailyAnalysisRecord {
  db.prepare(
    `
      INSERT INTO daily_analyses (
        analysis_date,
        thought_title,
        report_json,
        created_at
      ) VALUES (
        $analysisDate,
        $thoughtTitle,
        $reportJson,
        $createdAt
      )
      ON CONFLICT(analysis_date) DO UPDATE SET
        thought_title = excluded.thought_title,
        report_json = excluded.report_json,
        created_at = excluded.created_at
    `
  ).run({
    $analysisDate: analysis.analysisDate,
    $thoughtTitle: analysis.thoughtTitle,
    $reportJson: JSON.stringify(analysis),
    $createdAt: nowIso()
  });

  return getDailyAnalysis(db, analysis.analysisDate);
}

export function getDailyAnalysis(
  db: DatabaseSync,
  analysisDate: string
): DailyAnalysisRecord {
  const row = db
    .prepare(
      `
        SELECT id, analysis_date, thought_title, report_json, created_at
        FROM daily_analyses
        WHERE analysis_date = $analysisDate
      `
    )
    .get({ $analysisDate: analysisDate }) as unknown as DailyAnalysisRow | undefined;

  if (!row) {
    throw new Error(`daily_analysis_not_found:${analysisDate}`);
  }

  return mapDailyAnalysisRow(row);
}

export function listDailyAnalyses(db: DatabaseSync): DailyAnalysisRecord[] {
  const rows = db
    .prepare(
      `
        SELECT id, analysis_date, thought_title, report_json, created_at
        FROM daily_analyses
        ORDER BY analysis_date DESC
      `
    )
    .all() as unknown as DailyAnalysisRow[];

  return rows.map(mapDailyAnalysisRow);
}
