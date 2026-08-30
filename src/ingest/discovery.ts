import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredPlugin } from './types.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.cache',
  'coverage',
  '.vscode',
  '.idea',
  'cypress',
  'test',
  'tests',
  'fixtures',
]);

const IGNORED_PACKAGES = [
  'eslint-config',
  'babel-preset',
  'prettier-config',
  'stylelint-config',
  'safer-lodash',
  'antlr-grammar',
  'osd-dev-utils',
  'osd-eslint',
  'osd-test',
  'osd-cross-platform',
  'osd-i18n',
  'osd-config',
];

export function discoverLocalPlugins(rootDir: string, maxDepth = 4): DiscoveredPlugin[] {
  const discovered: DiscoveredPlugin[] = [];
  const resolvedRoot = path.resolve(rootDir);

  if (!fs.existsSync(resolvedRoot)) {
    return discovered;
  }

  function crawl(currentDir: string, currentDepth: number): void {
    if (currentDepth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasOsdJson = entries.some((e) => e.isFile() && (e.name === 'opensearch_dashboards.json' || e.name === 'kibana.json'));
    const hasPkgJson = entries.some((e) => e.isFile() && e.name === 'package.json');

    if (hasOsdJson || hasPkgJson) {
      const plugin = parsePluginDirectory(currentDir, hasOsdJson, hasPkgJson);
      if (plugin) {
        discovered.push(plugin);
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
        crawl(path.join(currentDir, entry.name), currentDepth + 1);
      }
    }
  }

  crawl(resolvedRoot, 0);
  return discovered;
}

function parsePluginDirectory(
  pluginDir: string,
  hasOsdJson: boolean,
  hasPkgJson: boolean
): DiscoveredPlugin | null {
  let id = path.basename(pluginDir);
  let name = id;
  let version = '1.0.0';
  let description: string | undefined;
  let wazuhVersion: string | undefined;
  let opensearchDashboardsVersion: string | undefined;
  const requiredPlugins: string[] = [];
  const optionalPlugins: string[] = [];
  let server = false;
  let ui = false;
  let isIgnoredDevPackage = false;

  // 1. Read opensearch_dashboards.json / kibana.json if present
  if (hasOsdJson) {
    const osdPath = fs.existsSync(path.join(pluginDir, 'opensearch_dashboards.json'))
      ? path.join(pluginDir, 'opensearch_dashboards.json')
      : path.join(pluginDir, 'kibana.json');

    try {
      const raw = fs.readFileSync(osdPath, 'utf-8');
      const json = JSON.parse(raw) as Record<string, unknown>;
      if (typeof json['id'] === 'string') id = json['id'];
      if (typeof json['version'] === 'string') version = json['version'];
      if (typeof json['opensearchDashboardsVersion'] === 'string') {
        opensearchDashboardsVersion = json['opensearchDashboardsVersion'];
      }
      if (Array.isArray(json['requiredPlugins'])) {
        for (const p of json['requiredPlugins']) {
          if (typeof p === 'string') requiredPlugins.push(p);
        }
      }
      if (Array.isArray(json['optionalPlugins'])) {
        for (const p of json['optionalPlugins']) {
          if (typeof p === 'string') optionalPlugins.push(p);
        }
      }
      server = Boolean(json['server']);
      ui = Boolean(json['ui']);
    } catch {
      // ignore parse errors
    }
  }

  // 2. Read package.json if present
  if (hasPkgJson) {
    const pkgPath = path.join(pluginDir, 'package.json');
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const json = JSON.parse(raw) as Record<string, unknown>;

      if (typeof json['name'] === 'string') {
        name = json['name'];
        if (!hasOsdJson) {
          id = json['name'];
        }
      }

      // Check if this is an internal tooling / dev utility package
      const pkgNameLower = name.toLowerCase();
      if (
        !hasOsdJson &&
        !json['wazuh'] &&
        IGNORED_PACKAGES.some((ign) => pkgNameLower.includes(ign))
      ) {
        isIgnoredDevPackage = true;
      }

      if (typeof json['version'] === 'string' && !hasOsdJson) version = json['version'];
      if (typeof json['description'] === 'string') description = json['description'];

      if (json['wazuh'] && typeof json['wazuh'] === 'object') {
        const wazuhObj = json['wazuh'] as Record<string, unknown>;
        if (typeof wazuhObj['version'] === 'string') {
          wazuhVersion = wazuhObj['version'];
        }
      }

      if (json['opensearchDashboards'] && typeof json['opensearchDashboards'] === 'object') {
        const osdObj = json['opensearchDashboards'] as Record<string, unknown>;
        if (typeof osdObj['version'] === 'string') {
          opensearchDashboardsVersion = osdObj['version'];
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (isIgnoredDevPackage) {
    return null;
  }

  // Deduplicate and sanitize ID
  const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

  return {
    id: cleanId,
    name,
    version,
    description,
    wazuhVersion,
    opensearchDashboardsVersion,
    requiredPlugins: [...new Set(requiredPlugins)],
    optionalPlugins: [...new Set(optionalPlugins)],
    server,
    ui,
    sourcePath: pluginDir,
  };
}
