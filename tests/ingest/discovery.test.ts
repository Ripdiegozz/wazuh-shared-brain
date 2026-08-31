import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { discoverLocalPlugins } from '../../src/ingest/discovery.js';
import { ingestWazuhPlugins } from '../../src/ingest/ingestor.js';
import { openDatabase } from '../../src/compiler/db.js';

describe('Universal Ingestion Engine', () => {
  const fixtureDir = '.cache/test-fixture-repos';
  const testOutDir = '.cache/test-ingest-brain';

  beforeEach(() => {
    // Setup dummy plugin repo fixtures
    if (fs.existsSync(fixtureDir)) fs.rmSync(fixtureDir, { recursive: true, force: true });
    if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });

    fs.mkdirSync(path.join(fixtureDir, 'plugin-a'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'plugin-b'), { recursive: true });

    // Plugin A with opensearch_dashboards.json
    fs.writeFileSync(
      path.join(fixtureDir, 'plugin-a', 'opensearch_dashboards.json'),
      JSON.stringify({
        id: 'wazuh-security-dashboard-plugin',
        version: '5.0.0',
        requiredPlugins: ['wazuhCore', 'navigation'],
        optionalPlugins: ['securityAnalytics'],
        server: true,
        ui: true,
      })
    );

    // Plugin B with package.json
    fs.writeFileSync(
      path.join(fixtureDir, 'plugin-b', 'package.json'),
      JSON.stringify({
        name: 'wazuh-dashboard-reporting',
        version: '5.0.0',
        description: 'Automated PDF/CSV Report Generation',
        wazuh: { version: '5.0.0' },
      })
    );
  });

  afterEach(() => {
    if (fs.existsSync(fixtureDir)) fs.rmSync(fixtureDir, { recursive: true, force: true });
    if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });
  });

  it('discoverLocalPlugins detects plugins across directories', () => {
    const plugins = discoverLocalPlugins(fixtureDir);
    expect(plugins.length).toBe(2);

    const pluginA = plugins.find((p) => p.id === 'wazuh-security-dashboard-plugin');
    expect(pluginA).toBeDefined();
    expect(pluginA?.requiredPlugins).toContain('wazuhCore');
    expect(pluginA?.requiredPlugins).toContain('navigation');
    expect(pluginA?.optionalPlugins).toContain('securityAnalytics');

    const pluginB = plugins.find((p) => p.id === 'wazuh-dashboard-reporting');
    expect(pluginB).toBeDefined();
    expect(pluginB?.wazuhVersion).toBe('5.0.0');
  });

  it('ingestWazuhPlugins generates YAML/Markdown sources and auto-compiles SQLite', async () => {
    const summary = await ingestWazuhPlugins({
      localDir: fixtureDir,
      outDir: testOutDir,
      compileAfter: true,
    });

    expect(summary.pluginsDiscovered).toBe(2);
    expect(summary.nodesGenerated).toBe(2);
    expect(summary.connectionsGenerated).toBe(5); // 2 required + 1 optional + 2 central wazuh hub links

    // Verify generated file exists
    const manifestPath = path.join(
      testOutDir,
      'plugins',
      'wazuh-security-dashboard-plugin',
      'plugin.yml'
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify SQLite was compiled
    const dbPath = path.join(testOutDir, '.cache', 'brain.sqlite');
    expect(fs.existsSync(dbPath)).toBe(true);
    const db = openDatabase(dbPath);
    const nodes = db.prepare('SELECT * FROM nodes WHERE id = ?').all('wazuh-security-dashboard-plugin');
    expect(nodes.length).toBe(1);
    db.close();
  });
});
