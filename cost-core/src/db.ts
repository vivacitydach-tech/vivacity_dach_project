import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cost-core.sqlite');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    code TEXT,
    local_project_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS boq_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    currency TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_boq_project ON boq_items(project_id);
`);
