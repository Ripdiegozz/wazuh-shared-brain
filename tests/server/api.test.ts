import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { compileBrain } from '../../src/compiler/compiler.js';
import { createServer, type AppServer } from '../../src/server/api.js';
import fs from 'node:fs';

interface VersionsResponse {
  versions: Array<{ id: string; name: string }>;
  plugins: Array<{ id: string; name: string }>;
}

interface RulesResponse {
  rules: Array<{ id: string; severity: string; title: string }>;
}

interface GraphResponse {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string }>;
}

describe('Local REST API Suite', () => {
  const testDbPath = '.cache/test-api-brain.sqlite';
  let server: AppServer;
  let baseUrl: string;

  beforeAll(async () => {
    await compileBrain({ dbPath: testDbPath, rootDir: process.cwd() });
    server = createServer({ dbPath: testDbPath });
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
    await server.closeServer();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('GET /api/versions returns version metadata', async () => {
    const res = await fetch(`${baseUrl}/api/versions`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as VersionsResponse;
    expect(data.versions.length).toBeGreaterThanOrEqual(2);
    expect(data.plugins.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/rules returns filtered rules', async () => {
    const res = await fetch(`${baseUrl}/api/rules?version=v4.8`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as RulesResponse;
    expect(data.rules.length).toBeGreaterThan(0);
  });

  it('GET /api/graph returns nodes and edges for visualization', async () => {
    const res = await fetch(`${baseUrl}/api/graph?version=v4.8`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as GraphResponse;
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.edges.length).toBeGreaterThan(0);
  });

  it('GET /api/search performs FTS5 lookup', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=Output`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: Array<{ id: string; title: string }> };
    expect(data.results.length).toBeGreaterThan(0);
  });
});
