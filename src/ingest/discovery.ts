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
  'packages', // Internal shared libraries (osd-i18n, osd-utils, etc.)
  'scripts',
  'developer_examples',
  'examples',
  'src/dev',
]);

const WAZUH_KEYWORDS = [
  'wazuh',
  'security-dashboard',
  'security_dashboard',
  'securityanalytics',
  'security_analytics',
  'reporting',
  'reports',
  'notifications',
  'alerting',
  'threat-intel',
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

    const hasOsdJson = entries.some(
      (e) => e.isFile() && (e.name === 'opensearch_dashboards.json' || e.name === 'kibana.json')
    );
    const hasPkgJson = entries.some((e) => e.isFile() && e.name === 'package.json');

    // Only inspect directories that have a genuine plugin manifest or wazuh plugin config
    if (hasOsdJson || hasPkgJson) {
      const plugin = parsePluginDirectory(currentDir, hasOsdJson, hasPkgJson);
      if (plugin) {
        discovered.push(plugin);
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
        // Skip path if it is inside packages or developer_examples
        const subPath = path.join(currentDir, entry.name);
        const normalized = subPath.replace(/\\/g, '/');
        if (
          normalized.includes('/packages/') ||
          normalized.includes('/developer_examples') ||
          normalized.includes('/examples/')
        ) {
          continue;
        }
        crawl(subPath, currentDepth + 1);
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
  const normalizedPath = pluginDir.replace(/\\/g, '/');
  // Discard internal shared libraries and developer examples
  if (
    normalizedPath.includes('/packages/') ||
    normalizedPath.includes('/developer_examples') ||
    normalizedPath.includes('/examples/')
  ) {
    return null;
  }

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
  let isRealPlugin = false;

  // 1. Read opensearch_dashboards.json / kibana.json if present
  if (hasOsdJson) {
    const osdPath = fs.existsSync(path.join(pluginDir, 'opensearch_dashboards.json'))
      ? path.join(pluginDir, 'opensearch_dashboards.json')
      : path.join(pluginDir, 'kibana.json');

    try {
      const raw = fs.readFileSync(osdPath, 'utf-8');
      const json = JSON.parse(raw) as Record<string, unknown>;
      if (typeof json['id'] === 'string') {
        id = json['id'];
        name = json['id'];
        isRealPlugin = true;
      }
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

      // If package has an explicit "wazuh" block or opensearchDashboards config, it's a real plugin
      if (json['wazuh'] && typeof json['wazuh'] === 'object') {
        isRealPlugin = true;
        const wazuhObj = json['wazuh'] as Record<string, unknown>;
        if (typeof wazuhObj['version'] === 'string') {
          wazuhVersion = wazuhObj['version'];
        }
      }

      if (json['opensearchDashboards'] && typeof json['opensearchDashboards'] === 'object') {
        isRealPlugin = true;
        const osdObj = json['opensearchDashboards'] as Record<string, unknown>;
        if (typeof osdObj['version'] === 'string') {
          opensearchDashboardsVersion = osdObj['version'];
        }
      }

      // If it has no plugin manifest and no wazuh/opensearchDashboards block, it is just a plain library
      if (!hasOsdJson && !isRealPlugin) {
        return null;
      }

      if (typeof json['name'] === 'string') {
        name = json['name'];
        if (!hasOsdJson) {
          id = json['name'];
        }
      }
      if (typeof json['version'] === 'string' && !hasOsdJson) version = json['version'];
      if (typeof json['description'] === 'string') description = json['description'];
    } catch {
      // ignore parse errors
    }
  }

  if (!isRealPlugin) {
    return null;
  }

  // Ignore npm utility scopes (@elastic/..., @osd/..., @babel/...) unless explicitly a wazuh plugin
  if (
    id.startsWith('@elastic/') ||
    id.startsWith('@osd/') ||
    id.startsWith('@opensearch/') ||
    id.startsWith('-osd-') ||
    id.startsWith('-elastic-')
  ) {
    return null;
  }

  const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const pluginIdentity = `${cleanId} ${name.toLowerCase()}`;
  const isWazuh = WAZUH_KEYWORDS.some((kw) => pluginIdentity.includes(kw));

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
    category: isWazuh ? 'wazuh' : 'platform',
  };
}
