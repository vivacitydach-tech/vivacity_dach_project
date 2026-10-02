import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pm-core.sqlite');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS work_package_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS work_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type_name TEXT NOT NULL DEFAULT 'Activity',
    priority_name TEXT NOT NULL DEFAULT 'Normal',
    percentage_done INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    bcf_guid TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_wp_project ON work_packages(project_id);
`);

const seedTypes = [
  'Defect',
  'RFI',
  'Change Order',
  'Snag',
  'Safety',
  'Design',
  'Activity',
];

const insertType = db.prepare(
  'INSERT OR IGNORE INTO work_package_types (name) VALUES (?)',
);
for (const name of seedTypes) {
  insertType.run(name);
}
