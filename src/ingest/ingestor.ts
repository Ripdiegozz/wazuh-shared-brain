import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { discoverLocalPlugins } from './discovery.js';
import { fetchRemotePlugins } from './github.js';
import { compileBrain } from '../compiler/compiler.js';
import type { IngestOptions, IngestSummary, DiscoveredPlugin } from './types.js';

export async function ingestWazuhPlugins(options: IngestOptions = {}): Promise<IngestSummary> {
  const rootDir = options.outDir ?? process.cwd();
  let discovered: DiscoveredPlugin[] = [];

  // 1. Discovery from Local or Remote
  if (options.remote) {
    discovered = await fetchRemotePlugins({
      org: options.githubOrg,
      repositories: options.repositories,
      token: options.githubToken,
    });
  } else {
    const scanDir = options.localDir ?? path.join(rootDir, '..');
    discovered = discoverLocalPlugins(scanDir);
  }

  const pluginsDir = path.join(rootDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  const versionsDetected = new Set<string>();
  let nodesGenerated = 0;
  let connectionsGenerated = 0;
  const sourcesWritten: string[] = [];

  // 2. Generate Plugin Manifests, Nodes, and Connections
  for (const plugin of discovered) {
    const targetPluginDir = path.join(pluginsDir, plugin.id);
    const targetNodesDir = path.join(targetPluginDir, 'nodes');
    if (!fs.existsSync(targetNodesDir)) {
      fs.mkdirSync(targetNodesDir, { recursive: true });
    }

    const wazuhVersionConstraint = plugin.wazuhVersion ? `>=${plugin.wazuhVersion}` : '>=4.8';
    if (plugin.wazuhVersion) {
      versionsDetected.add(plugin.wazuhVersion);
    }

    // Write plugin.yml
    const manifestPath = path.join(targetPluginDir, 'plugin.yml');
    const manifestContent = YAML.stringify({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description ?? `Wazuh Dashboard plugin ${plugin.name}`,
      wazuh_versions: [wazuhVersionConstraint],
      opensearch_dashboards_version: plugin.opensearchDashboardsVersion,
    });
    fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
    sourcesWritten.push(manifestPath);

    // Write node file
    const nodePath = path.join(targetNodesDir, `${plugin.id}.yml`);
    const nodeContent = YAML.stringify({
      id: plugin.id,
      type: 'plugin',
      label: plugin.name,
      package: plugin.repository ?? plugin.id,
      file_path: plugin.sourcePath ? path.relative(rootDir, plugin.sourcePath) : undefined,
      description: plugin.description ?? `${plugin.name} module for Wazuh Dashboard`,
    });
    fs.writeFileSync(nodePath, nodeContent, 'utf-8');
    nodesGenerated++;
    sourcesWritten.push(nodePath);

    // Write connections.yml
    const connections: Array<{
      from: string;
      to: string;
      type: string;
      weight: string;
      description?: string;
    }> = [];

    for (const req of plugin.requiredPlugins) {
      connections.push({
        from: plugin.id,
        to: req,
        type: 'DEPENDS_ON',
        weight: 'CRITICAL',
        description: `Required dashboard plugin dependency: ${req}`,
      });
      connectionsGenerated++;
    }

    for (const opt of plugin.optionalPlugins) {
      connections.push({
        from: plugin.id,
        to: opt,
        type: 'DEPENDS_ON',
        weight: 'OPTIONAL',
        description: `Optional dashboard plugin integration: ${opt}`,
      });
      connectionsGenerated++;
    }

    if (connections.length > 0) {
      const connPath = path.join(targetPluginDir, 'connections.yml');
      fs.writeFileSync(connPath, YAML.stringify({ connections }), 'utf-8');
      sourcesWritten.push(connPath);
    }
  }

  // 3. Optional auto-compile
  if (options.compileAfter !== false) {
    await compileBrain({ rootDir });
  }

  return {
    pluginsDiscovered: discovered.length,
    versionsDetected: [...versionsDetected],
    nodesGenerated,
    connectionsGenerated,
    sourcesWritten,
  };
}
