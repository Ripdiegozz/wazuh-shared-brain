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
  'packages',
  'scripts',
  'developer_examples',
  'examples',
  'src/dev',
]);

const WAZUH_OFFICIAL_KEYWORDS = [
  'wazuh',
  'security-dashboard',
  'security_dashboard',
  'securityanalytics',
  'security_analytics',
  'securitydashboards',
  'reportsdashboards',
  'reporting',
  'notificationsdashboards',
  'notifications',
  'alertingdashboards',
  'alerting',
  'threat-intel',
  'assistant',
  'agent_traces',
  'chat',
];

const REPO_CONTAINER_NAMES = new Set([
  'opensearch-dashboards',
  'wazuh-dashboard-plugins',
  'wazuh-dashboard',
]);

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

    if (hasOsdJson || hasPkgJson) {
      const plugin = parsePluginDirectory(currentDir, hasOsdJson, hasPkgJson);
      if (plugin) {
        // Prevent duplicate IDs across worktrees/branches
        if (!discovered.some((d) => d.id === plugin.id)) {
          discovered.push(plugin);
        }
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
        const subPath = path.join(currentDir, entry.name);
        const normalized = subPath.replace(/\\/g, '/');

        // Ignore test fixtures, developer examples, and non-wazuh internal plugins
        if (
          normalized.includes('/packages/') ||
          normalized.includes('/developer_examples') ||
          normalized.includes('/examples/') ||
          normalized.includes('/test/')
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
  if (
    normalizedPath.includes('/packages/') ||
    normalizedPath.includes('/developer_examples') ||
    normalizedPath.includes('/examples/') ||
    normalizedPath.includes('/test/')
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
  let isExplicitWazuh = false;

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

      if (json['wazuh'] && typeof json['wazuh'] === 'object') {
        isExplicitWazuh = true;
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

  // Skip root container repositories that aren't individual plugins
  if (!hasOsdJson && REPO_CONTAINER_NAMES.has(id)) {
    return null;
  }

  // Map AI assistant / chat / agent_traces
  if (id === 'chat' || id === 'agent_traces' || id.includes('assistant')) {
    isExplicitWazuh = true;
    if (id === 'chat') {
      id = 'wazuh-ai-assistant';
      name = 'Wazuh AI Assistant';
      description = 'Generative AI Assistant for alert triage and security queries';
    } else if (id === 'agent_traces') {
      name = 'Wazuh Agent Traces';
    }
  }

  const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const pluginIdentity = `${cleanId} ${name.toLowerCase()}`;

  // STRICT FILTER: Must be explicitly an official Wazuh plugin or AI Assistant
  const isWazuh =
    isExplicitWazuh ||
    WAZUH_OFFICIAL_KEYWORDS.some((kw) => pluginIdentity.includes(kw));

  if (!isWazuh) {
    return null; // Exclude non-wazuh base OpenSearch plugins
  }

  return {
    id: cleanId,
    name: formatPluginDisplayName(cleanId, name),
    version,
    description: description ?? `${name} for Wazuh Dashboard`,
    wazuhVersion,
    opensearchDashboardsVersion,
    requiredPlugins: [...new Set(requiredPlugins)],
    optionalPlugins: [...new Set(optionalPlugins)],
    server,
    ui,
    sourcePath: pluginDir,
    category: 'wazuh',
  };
}

function formatPluginDisplayName(id: string, rawName: string): string {
  const map: Record<string, string> = {
    'wazuh': 'Wazuh App',
    'wazuhcore': 'Wazuh Core',
    'wazuhcheckupdates': 'Wazuh Check Updates',
    'wazuh-security-dashboard-plugin': 'Wazuh Security Plugin',
    'securitydashboards': 'Wazuh Security Plugin',
    'wazuh-dashboard-security-analytics': 'Wazuh Security Analytics',
    'securityanalyticsdashboards': 'Wazuh Security Analytics',
    'wazuh-dashboard-reporting': 'Wazuh Reporting',
    'reportsdashboards': 'Wazuh Reporting',
    'wazuh-dashboard-notifications': 'Wazuh Notifications',
    'notificationsdashboards': 'Wazuh Notifications',
    'wazuh-dashboard-alerting': 'Wazuh Alerting',
    'alertingdashboards': 'Wazuh Alerting',
    'wazuh-ai-assistant': 'Wazuh AI Assistant',
    'agent_traces': 'Wazuh Agent Traces',
    'threat-intel': 'Threat Intelligence Overlay',
  };

  return map[id] ?? map[rawName] ?? rawName;
}
