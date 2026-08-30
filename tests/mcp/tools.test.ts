import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type Database from 'better-sqlite3';
import { compileBrain } from '../../src/compiler/compiler.js';
import { openDatabase } from '../../src/compiler/db.js';
import { executeTool } from '../../src/mcp/tools.js';
import fs from 'node:fs';

describe('MCP Tools Suite', () => {
  const testDbPath = '.cache/test-mcp-brain.sqlite';
  let db: Database.Database;

  beforeAll(async () => {
    await compileBrain({ dbPath: testDbPath, rootDir: process.cwd() });
    db = openDatabase(testDbPath);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('brain_list_versions returns versions and plugins', () => {
    const res = executeTool(db, 'brain_list_versions', {}) as {
      versions: Array<{ id: string; name: string }>;
      plugins: Array<{ id: string; name: string; version: string }>;
    };
    expect(res.versions.length).toBeGreaterThanOrEqual(2);
    expect(res.plugins.length).toBeGreaterThanOrEqual(1);
  });

  it('brain_get_rules returns concise list without body (micro-payload)', () => {
    const res = executeTool(db, 'brain_get_rules', { version: 'v4.8' }) as {
      rules: Array<{ id: string; severity: string; category: string; title: string }>;
    };
    expect(Array.isArray(res.rules)).toBe(true);
    expect(res.rules.length).toBeGreaterThan(0);
    const firstRule = res.rules[0];
    expect(firstRule).toHaveProperty('id');
    expect(firstRule).toHaveProperty('severity');
    expect(firstRule).toHaveProperty('title');
    expect(firstRule).not.toHaveProperty('body');
  });

  it('brain_get_rule_detail returns full rule text for specific ID', () => {
    const res = executeTool(db, 'brain_get_rule_detail', { rule_id: 'WZ-01' }) as {
      rule: { id: string; severity: string; title: string; body: string; origin?: string };
    };
    expect(res.rule.id).toBe('WZ-01');
    expect(res.rule.severity).toBe('HARD');
    expect(res.rule.body).toContain('Output Contract');
  });

  it('brain_get_doctrine returns active architectural decisions', () => {
    const res = executeTool(db, 'brain_get_doctrine', { version: 'v4.8', status: 'ACTIVE' }) as {
      doctrines: Array<{ id: string; title: string; scope?: string; status: string }>;
    };
    expect(res.doctrines.length).toBeGreaterThan(0);
    expect(res.doctrines[0]?.status).toBe('ACTIVE');
  });

  it('brain_explore_graph returns only 1-depth neighbors', () => {
    const res = executeTool(db, 'brain_explore_graph', { node_id: 'analysisd', version: 'v4.8', depth: 1 }) as {
      node: { id: string; label: string; type: string };
      inbound: Array<{ from: string; type: string }>;
      outbound: Array<{ to: string; type: string }>;
    };
    expect(res.node.id).toBe('analysisd');
    expect(Array.isArray(res.inbound)).toBe(true);
    expect(Array.isArray(res.outbound)).toBe(true);
    expect(res.inbound.some((e) => e.from === 'remoted')).toBe(true);
  });

  it('brain_resolve_context pinpoints rules and nodes for a file or component', () => {
    const res = executeTool(db, 'brain_resolve_context', { component_or_file: 'analysisd', version: 'v4.8' }) as {
      nodes: Array<{ id: string; label: string }>;
      relevant_rules: Array<{ id: string; title: string; severity: string }>;
      doctrine: Array<{ id: string; title: string }>;
    };
    expect(res.nodes.some((n) => n.id === 'analysisd')).toBe(true);
    expect(Array.isArray(res.relevant_rules)).toBe(true);
    expect(Array.isArray(res.doctrine)).toBe(true);
  });
});
