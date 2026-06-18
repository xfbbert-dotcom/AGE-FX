import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { DEFAULT_DATA_ROOT } from "../config.js";
import { applySchema } from "./schema.js";

const require = createRequire(__filename);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

export function openAgeDatabase(dataRoot = DEFAULT_DATA_ROOT): DatabaseSyncType {
  for (const directory of ["data", "exports", "equipment", "logs"]) {
    mkdirSync(join(dataRoot, directory), { recursive: true });
  }

  const db = new DatabaseSync(join(dataRoot, "data", "age-fx.sqlite"));
  applySchema(db);

  return db;
}
