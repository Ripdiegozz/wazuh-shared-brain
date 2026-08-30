export interface BrainNode {
  id: string;
  type: string;
  label: string;
  package: string;
  file_path?: string;
  description?: string;
  version_id?: string;
  plugin_id?: string;
}

export interface BrainEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: string;
  description?: string;
  version_id?: string;
  plugin_id?: string;
}

export interface BrainRule {
  id: string;
  severity: 'HARD' | 'WARN' | 'TIP';
  category: string;
  title: string;
  body: string;
  origin?: string;
  overrides?: string;
  version_id?: string;
  plugin_id?: string;
  wazuh_versions?: string[];
}

export interface BrainDoctrine {
  id: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED';
  date: string;
  title: string;
  body: string;
  scope?: string;
  thread_ref?: string;
  version_id?: string;
  plugin_id?: string;
}

export interface BrainVersion {
  id: string;
  name: string;
  base_version?: string;
  channel?: 'stable' | 'beta' | 'rc' | 'alpha';
  is_prerelease?: number | boolean;
}

export interface BrainPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  wazuh_versions: string[];
}
