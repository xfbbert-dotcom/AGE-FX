import type { DatabaseSync } from "node:sqlite";

export type EquipmentState = "recommended" | "approved" | "printed" | "archived";

export interface EquipmentItem {
  id: number;
  analysisDate: string;
  equipmentName: string;
  equipmentType: string;
  whyThisEquipment: string;
  sourceBattleInsight: string;
  minimumViableVersion: string;
  expectedBenefit: string;
  printPrompt: string;
  state: EquipmentState;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentRecommendationInput {
  equipmentName: string;
  equipmentType: string;
  whyThisEquipment: string;
  sourceBattleInsight: string;
  minimumViableVersion: string;
  expectedBenefit: string;
  printPrompt: string;
  state: EquipmentState;
}

interface EquipmentItemRow {
  id: number;
  analysis_date: string;
  equipment_name: string;
  equipment_type: string;
  why_this_equipment: string;
  source_battle_insight: string;
  minimum_viable_version: string;
  expected_benefit: string;
  print_prompt: string;
  state: EquipmentState;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapEquipmentItemRow(row: EquipmentItemRow): EquipmentItem {
  return {
    id: row.id,
    analysisDate: row.analysis_date,
    equipmentName: row.equipment_name,
    equipmentType: row.equipment_type,
    whyThisEquipment: row.why_this_equipment,
    sourceBattleInsight: row.source_battle_insight,
    minimumViableVersion: row.minimum_viable_version,
    expectedBenefit: row.expected_benefit,
    printPrompt: row.print_prompt,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createEquipmentRecommendation(
  db: DatabaseSync,
  analysisDate: string,
  recommendation: EquipmentRecommendationInput
): EquipmentItem {
  const timestamp = nowIso();
  const result = db
    .prepare(`
      INSERT INTO equipment_items (
        analysis_date,
        equipment_name,
        equipment_type,
        why_this_equipment,
        source_battle_insight,
        minimum_viable_version,
        expected_benefit,
        print_prompt,
        state,
        created_at,
        updated_at
      ) VALUES (
        $analysisDate,
        $equipmentName,
        $equipmentType,
        $whyThisEquipment,
        $sourceBattleInsight,
        $minimumViableVersion,
        $expectedBenefit,
        $printPrompt,
        $state,
        $createdAt,
        $updatedAt
      )
    `)
    .run({
      $analysisDate: analysisDate,
      $equipmentName: recommendation.equipmentName,
      $equipmentType: recommendation.equipmentType,
      $whyThisEquipment: recommendation.whyThisEquipment,
      $sourceBattleInsight: recommendation.sourceBattleInsight,
      $minimumViableVersion: recommendation.minimumViableVersion,
      $expectedBenefit: recommendation.expectedBenefit,
      $printPrompt: recommendation.printPrompt,
      $state: recommendation.state,
      $createdAt: timestamp,
      $updatedAt: timestamp
    });

  return getEquipmentItem(db, Number(result.lastInsertRowid));
}

export function getEquipmentItem(db: DatabaseSync, id: number): EquipmentItem {
  const row = db
    .prepare(`
      SELECT
        id,
        analysis_date,
        equipment_name,
        equipment_type,
        why_this_equipment,
        source_battle_insight,
        minimum_viable_version,
        expected_benefit,
        print_prompt,
        state,
        created_at,
        updated_at
      FROM equipment_items
      WHERE id = $id
    `)
    .get({ $id: id }) as unknown as EquipmentItemRow | undefined;

  if (!row) {
    throw new Error(`equipment_item_not_found:${id}`);
  }

  return mapEquipmentItemRow(row);
}

export function updateEquipmentState(
  db: DatabaseSync,
  id: number,
  state: EquipmentState
): EquipmentItem {
  db.prepare(`
    UPDATE equipment_items
    SET state = $state,
        updated_at = $updatedAt
    WHERE id = $id
  `).run({
    $id: id,
    $state: state,
    $updatedAt: nowIso()
  });

  return getEquipmentItem(db, id);
}

export function listEquipmentItems(db: DatabaseSync): EquipmentItem[] {
  const rows = db
    .prepare(`
      SELECT
        id,
        analysis_date,
        equipment_name,
        equipment_type,
        why_this_equipment,
        source_battle_insight,
        minimum_viable_version,
        expected_benefit,
        print_prompt,
        state,
        created_at,
        updated_at
      FROM equipment_items
      ORDER BY created_at DESC, id DESC
    `)
    .all() as unknown as EquipmentItemRow[];

  return rows.map(mapEquipmentItemRow);
}
