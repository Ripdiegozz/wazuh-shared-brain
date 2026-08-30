import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { compileBrain } from '../../src/compiler/compiler.js';
import { openDatabase } from '../../src/compiler/db.js';
import { createServer, type AppServer } from '../../src/server/api.js';
import { executeTool } from '../../src/mcp/tools.js';
import fs from 'node:fs';

interface VersionItem {
  id: string;
  name: string;
}

interface RuleSummaryItem {
  id: string;
  severity: string;
  title: string;
}

interface RuleDetailItem {
  id: string;
  severity: string;
  title: string;
  body: string;
  origin?: string;
}

describe('Wazuh Shared Brain - End-to-End Workflow', () => {
  const e2eDbPath = '.cache/e2e-brain.sqlite';
  let server: AppServer;
  let baseUrl: string;
  let db: ReturnType<typeof openDatabase>;

  beforeAll(async () => {
    // 1. Compile brain from source repository
    const result = await compileBrain({ dbPath: e2eDbPath, rootDir: process.cwd() });
    expect(result.versionsCount).toBeGreaterThanOrEqual(2);
    expect(result.rulesCount).toBeGreaterThanOrEqual(3);
    expect(result.nodesCount).toBeGreaterThanOrEqual(5);

    db = openDatabase(e2eDbPath);
    server = createServer({ dbPath: e2eDbPath });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    db.close();
    await server.closeServer();
    if (fs.existsSync(e2eDbPath)) fs.unlinkSync(e2eDbPath);
  });

  it('Stage 1: Validates version isolation and plugin inheritance', () => {
    // Version v4.8 rules
    const v48Rules = executeTool(db, 'brain_get_rules', { version: 'v4.8' }) as {
      rules: RuleSummaryItem[];
    };
    expect(v48Rules.rules.some((r) => r.id === 'WZ-01')).toBe(true);
    expect(v48Rules.rules.some((r) => r.id === 'TI-01')).toBe(true); // Plugin overlay included

    // Plugin specific filter
    const pluginRules = executeTool(db, 'brain_get_rules', { plugin_id: 'threat-intel' }) as {
      rules: RuleSummaryItem[];
    };
    expect(pluginRules.rules.length).toBe(1);
    expect(pluginRules.rules[0]?.id).toBe('TI-01');
  });

  it('Stage 2: Verifies micro-payload efficiency (zero context bloat)', () => {
    const res = executeTool(db, 'brain_get_rules', { version: 'v4.8' }) as {
      rules: RuleSummaryItem[];
    };
    const jsonString = JSON.stringify(res);
    // Estimated tokens: 1 token ~= 4 characters. Ensure payload is concise (< 500 chars per 3 rules)
    expect(jsonString.length).toBeLessThan(1200);

    // Detail fetch only on demand
    const detail = executeTool(db, 'brain_get_rule_detail', { rule_id: 'WZ-01' }) as {
      rule: RuleDetailItem;
    };
    expect(detail.rule.body.length).toBeGreaterThan(50);
  });

  it('Stage 3: Verifies graph exploration and context discovery', () => {
    const graphRes = executeTool(db, 'brain_explore_graph', {
      node_id: 'analysisd',
      version: 'v4.8',
      depth: 1,
    }) as {
      node: { id: string; label: string };
      inbound: Array<{ from: string; type: string }>;
      outbound: Array<{ to: string; type: string }>;
    };

    expect(graphRes.node.id).toBe('analysisd');
    expect(graphRes.inbound.length).toBeGreaterThan(0);
    expect(graphRes.outbound.length).toBeGreaterThan(0);
  });

  it('Stage 4: Verifies HTTP REST API endpoints for Control Room Dashboard', async () => {
    const [verRes, graphRes, rulesRes, docRes] = await Promise.all([
      fetch(`${baseUrl}/api/versions`),
      fetch(`${baseUrl}/api/graph?version=v4.8`),
      fetch(`${baseUrl}/api/rules?version=v4.8`),
      fetch(`${baseUrl}/api/doctrine?version=v4.8`),
    ]);

    expect(verRes.status).toBe(200);
    expect(graphRes.status).toBe(200);
    expect(rulesRes.status).toBe(200);
    expect(docRes.status).toBe(200);

    const verData = (await verRes.json()) as { versions: VersionItem[] };
    expect(verData.versions.length).toBeGreaterThanOrEqual(2);
  });
});
