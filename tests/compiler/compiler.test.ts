import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileBrain } from '../../src/compiler/compiler.js';
import { openDatabase } from '../../src/compiler/db.js';
import fs from 'node:fs';

interface RuleRow {
  id: string;
  severity: string;
  category: string;
  title: string;
  body: string;
}

interface DoctrineRow {
  id: string;
  status: string;
  title: string;
  body: string;
}

interface VersionRow {
  id: string;
  name: string;
  base_version: string | null;
  channel: string;
  is_prerelease: number;
}

describe('Brain Compiler Engine', () => {
  const testDbPath = '.cache/test-brain.sqlite';

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('compiles versions and plugins into SQLite database with FTS5 search', async () => {
    const result = await compileBrain({ dbPath: testDbPath, rootDir: process.cwd() });
    expect(result.versionsCount).toBeGreaterThanOrEqual(3);
    expect(result.rulesCount).toBeGreaterThanOrEqual(4);
    expect(result.nodesCount).toBeGreaterThanOrEqual(6);
    expect(result.edgesCount).toBeGreaterThanOrEqual(5);

    const db = openDatabase(testDbPath);
    
    // Check version channels and beta detection
    const betaVersion = db.prepare('SELECT * FROM versions WHERE id = ?').get('v5.0.0-beta3') as VersionRow;
    expect(betaVersion).toBeDefined();
    expect(betaVersion.channel).toBe('beta');
    expect(betaVersion.is_prerelease).toBe(1);
    expect(betaVersion.base_version).toBe('v5.0.0');

    // Check rules table
    const rules = db.prepare('SELECT * FROM rules WHERE id = ?').all('WZ-01') as RuleRow[];
    expect(rules.length).toBe(1);
    expect(rules[0]?.severity).toBe('HARD');

    // Check doctrine table
    const doctrines = db.prepare('SELECT * FROM doctrine WHERE id = ?').all('DOC-01') as DoctrineRow[];
    expect(doctrines.length).toBe(1);
    expect(doctrines[0]?.status).toBe('ACTIVE');

    // Check nodes & edges
    const nodes = db.prepare('SELECT * FROM nodes WHERE id = ?').all('analysisd');
    expect(nodes.length).toBeGreaterThan(0);

    const edges = db.prepare('SELECT * FROM edges WHERE source = ? AND target = ?').all('remoted', 'analysisd');
    expect(edges.length).toBeGreaterThan(0);

    // Check FTS5 full text search
    const search = db.prepare("SELECT * FROM fts_search WHERE fts_search MATCH 'Output'").all();
    expect(search.length).toBeGreaterThan(0);

    db.close();
  });
});
