import { z } from 'zod';

export const SeverityEnum = z.enum(['HARD', 'WARN', 'TIP']);
export const DoctrineStatusEnum = z.enum(['ACTIVE', 'SUPERSEDED', 'DEPRECATED']);
export const VersionChannelEnum = z.enum(['stable', 'beta', 'rc', 'alpha']);
export const PluginCategoryEnum = z.enum(['wazuh', 'platform']);
export const NodeTypeEnum = z.enum([
  'skill',
  'agent',
  'tool',
  'hook',
  'reference',
  'plugin',
  'service',
  'daemon',
  'decoder',
]);
export const EdgeTypeEnum = z.enum([
  'INVOKES',
  'DEPENDS_ON',
  'OVERRIDES',
  'INTERCEPTS',
  'READS',
  'CONFLICTS_WITH',
]);

export const VersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  base_version: z.string().optional(),
  channel: VersionChannelEnum.default('stable'),
  is_prerelease: z.boolean().default(false),
});

export const RuleSchema = z.object({
  id: z.string(),
  severity: SeverityEnum,
  category: z.string(),
  origin: z.string().optional(),
  overrides: z.string().optional(),
  wazuh_versions: z.array(z.string()).optional(),
  title: z.string(),
  body: z.string(),
  version_id: z.string().optional(),
  plugin_id: z.string().optional(),
});

export const DoctrineSchema = z.object({
  id: z.string(),
  status: DoctrineStatusEnum,
  date: z.string(),
  title: z.string(),
  scope: z.string().optional(),
  thread_ref: z.string().optional(),
  wazuh_versions: z.array(z.string()).optional(),
  body: z.string(),
  version_id: z.string().optional(),
  plugin_id: z.string().optional(),
});

export const NodeSchema = z.object({
  id: z.string(),
  type: NodeTypeEnum,
  label: z.string(),
  package: z.string(),
  file_path: z.string().optional(),
  description: z.string().optional(),
  version_id: z.string().optional(),
  plugin_id: z.string().optional(),
});

export const ConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: EdgeTypeEnum,
  weight: z.string().optional(),
  description: z.string().optional(),
  version_id: z.string().optional(),
  plugin_id: z.string().optional(),
});

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  wazuh_versions: z.array(z.string()),
  category: PluginCategoryEnum.optional().default('wazuh'),
});

export type Version = z.infer<typeof VersionSchema>;
export type VersionChannel = z.infer<typeof VersionChannelEnum>;
export type Rule = z.infer<typeof RuleSchema>;
export type Doctrine = z.infer<typeof DoctrineSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type PluginCategory = z.infer<typeof PluginCategoryEnum>;
export type Severity = z.infer<typeof SeverityEnum>;
export type DoctrineStatus = z.infer<typeof DoctrineStatusEnum>;
export type NodeType = z.infer<typeof NodeTypeEnum>;
export type EdgeType = z.infer<typeof EdgeTypeEnum>;
