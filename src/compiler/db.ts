import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function openDatabase(dbPath = '.cache/brain.sqlite'): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_version TEXT,
      channel TEXT NOT NULL DEFAULT 'stable',
      is_prerelease INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      wazuh_versions TEXT
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      package TEXT NOT NULL,
      file_path TEXT,
      description TEXT,
      version_id TEXT,
      plugin_id TEXT,
      PRIMARY KEY (id, version_id, plugin_id)
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      type TEXT NOT NULL,
      weight TEXT,
      description TEXT,
      version_id TEXT,
      plugin_id TEXT
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      origin TEXT,
      overrides TEXT,
      version_id TEXT,
      plugin_id TEXT,
      wazuh_versions TEXT,
      PRIMARY KEY (id, version_id, plugin_id)
    );

    CREATE TABLE IF NOT EXISTS doctrine (
      id TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      scope TEXT,
      thread_ref TEXT,
      version_id TEXT,
      plugin_id TEXT,
      wazuh_versions TEXT,
      PRIMARY KEY (id, version_id, plugin_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS fts_search USING fts5(
      id,
      title,
      body,
      entity_type,
      version_id,
      plugin_id
    );
  `);
}
