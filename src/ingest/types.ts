export interface DiscoveredPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  wazuhVersion?: string;
  opensearchDashboardsVersion?: string;
  requiredPlugins: string[];
  optionalPlugins: string[];
  server: boolean;
  ui: boolean;
  sourcePath?: string;
  repository?: string;
}

export interface IngestOptions {
  localDir?: string;
  remote?: boolean;
  githubOrg?: string;
  repositories?: string[];
  githubToken?: string;
  outDir?: string;
  compileAfter?: boolean;
}

export interface IngestSummary {
  pluginsDiscovered: number;
  versionsDetected: string[];
  nodesGenerated: number;
  connectionsGenerated: number;
  sourcesWritten: string[];
}
