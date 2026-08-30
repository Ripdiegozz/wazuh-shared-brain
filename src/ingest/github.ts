import type { DiscoveredPlugin } from './types.js';

export const DEFAULT_WAZUH_REPOS = [
  'wazuh-dashboard-plugins',
  'wazuh-security-dashboards-plugin',
  'wazuh-dashboard-security-analytics',
  'wazuh-dashboard-notifications',
  'wazuh-dashboard-reporting',
  'wazuh-dashboard-alerting',
];

export async function fetchRemotePlugins(options: {
  org?: string;
  repositories?: string[];
  token?: string;
  branch?: string;
}): Promise<DiscoveredPlugin[]> {
  const org = options.org ?? 'wazuh';
  const repos = options.repositories ?? DEFAULT_WAZUH_REPOS;
  const branch = options.branch ?? 'main';
  const headers: Record<string, string> = {
    'User-Agent': 'Wazuh-Shared-Brain-Ingestor',
  };

  if (options.token) {
    headers['Authorization'] = `token ${options.token}`;
  }

  const discovered: DiscoveredPlugin[] = [];

  for (const repo of repos) {
    try {
      // 1. Attempt to fetch package.json from raw GitHub
      const pkgUrl = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/package.json`;
      const pkgRes = await fetch(pkgUrl, { headers });

      if (!pkgRes.ok) continue;
      const pkgJson = (await pkgRes.json()) as Record<string, unknown>;

      let wazuhVersion: string | undefined;
      let osdVersion: string | undefined;

      if (pkgJson['wazuh'] && typeof pkgJson['wazuh'] === 'object') {
        const wazuhObj = pkgJson['wazuh'] as Record<string, unknown>;
        if (typeof wazuhObj['version'] === 'string') wazuhVersion = wazuhObj['version'];
      }

      if (pkgJson['opensearchDashboards'] && typeof pkgJson['opensearchDashboards'] === 'object') {
        const osdObj = pkgJson['opensearchDashboards'] as Record<string, unknown>;
        if (typeof osdObj['version'] === 'string') osdVersion = osdObj['version'];
      }

      // 2. Attempt to fetch opensearch_dashboards.json if available
      let requiredPlugins: string[] = [];
      let optionalPlugins: string[] = [];
      let server = true;
      let ui = true;

      const osdUrl = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/opensearch_dashboards.json`;
      const osdRes = await fetch(osdUrl, { headers });
      if (osdRes.ok) {
        const osdJson = (await osdRes.json()) as Record<string, unknown>;
        if (Array.isArray(osdJson['requiredPlugins'])) {
          requiredPlugins = osdJson['requiredPlugins'].filter((p): p is string => typeof p === 'string');
        }
        if (Array.isArray(osdJson['optionalPlugins'])) {
          optionalPlugins = osdJson['optionalPlugins'].filter((p): p is string => typeof p === 'string');
        }
        if (typeof osdJson['server'] === 'boolean') server = osdJson['server'];
        if (typeof osdJson['ui'] === 'boolean') ui = osdJson['ui'];
      }

      const pluginId = String(pkgJson['name'] ?? repo).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

      discovered.push({
        id: pluginId,
        name: String(pkgJson['name'] ?? repo),
        version: String(pkgJson['version'] ?? '1.0.0'),
        description: typeof pkgJson['description'] === 'string' ? pkgJson['description'] : undefined,
        wazuhVersion,
        opensearchDashboardsVersion: osdVersion,
        requiredPlugins,
        optionalPlugins,
        server,
        ui,
        repository: `${org}/${repo}`,
      });
    } catch {
      // Continue on repo network/parse error
    }
  }

  return discovered;
}
