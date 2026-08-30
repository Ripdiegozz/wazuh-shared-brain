import type Database from 'better-sqlite3';
import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
}

export const tools: ToolDefinition[] = [
  {
    name: 'brain_list_versions',
    description: 'Lists all available Wazuh base versions and installed plugins in the shared brain.',
    parameters: z.object({}),
  },
  {
    name: 'brain_get_rules',
    description: 'Returns concise rule summaries (ID, severity, category, title) for a Wazuh version/plugin without bloating context with full bodies.',
    parameters: z.object({
      version: z.string().optional().describe('Wazuh version (e.g. v4.8, v4.9)'),
      plugin_id: z.string().optional().describe('Optional plugin ID filter'),
      category: z.string().optional().describe('Optional category filter'),
      severity: z.enum(['HARD', 'WARN', 'TIP']).optional().describe('Optional severity filter'),
    }),
  },
  {
    name: 'brain_get_rule_detail',
    description: 'Fetches the full specification, rationale, origin, and overrides for a specific rule ID.',
    parameters: z.object({
      rule_id: z.string().describe('Rule ID (e.g. WZ-01, TI-01)'),
    }),
  },
  {
    name: 'brain_get_doctrine',
    description: 'Fetches active architectural decisions, legal invariants, and design directives.',
    parameters: z.object({
      version: z.string().optional().describe('Wazuh version filter (e.g. v4.8)'),
      status: z.enum(['ACTIVE', 'SUPERSEDED', 'DEPRECATED']).optional().describe('Doctrine status (default ACTIVE)'),
      topic: z.string().optional().describe('Optional topic keyword filter'),
    }),
  },
  {
    name: 'brain_explore_graph',
    description: 'Explores direct 1-depth inbound and outbound dependencies/connections for a given node without dumping the whole graph.',
    parameters: z.object({
      node_id: z.string().describe('Target node identifier (e.g. analysisd, remoted, threat-intel)'),
      version: z.string().optional().describe('Wazuh version scope (e.g. v4.8)'),
      depth: z.number().optional().default(1).describe('Exploration depth (default 1)'),
    }),
  },
  {
    name: 'brain_resolve_context',
    description: 'Discovers which architectural nodes, rules, and doctrine policies apply to a specific file or component.',
    parameters: z.object({
      component_or_file: z.string().describe('Component ID (e.g. analysisd) or file path (e.g. src/analysisd/main.c)'),
      version: z.string().optional().describe('Wazuh version scope (e.g. v4.8)'),
    }),
  },
];

export function executeTool(db: Database.Database, toolName: string, args: Record<string, unknown>): unknown {
  switch (toolName) {
    case 'brain_list_versions': {
      const versions = db.prepare('SELECT id, name, base_version FROM versions').all();
      const plugins = db.prepare('SELECT id, name, version, description, wazuh_versions FROM plugins').all();
      return { versions, plugins };
    }

    case 'brain_get_rules': {
      const version = typeof args['version'] === 'string' ? args['version'] : '';
      const pluginId = typeof args['plugin_id'] === 'string' ? args['plugin_id'] : '';
      const category = typeof args['category'] === 'string' ? args['category'] : '';
      const severity = typeof args['severity'] === 'string' ? args['severity'] : '';

      let query = 'SELECT id, severity, category, title, origin, overrides, version_id, plugin_id FROM rules WHERE 1=1';
      const params: string[] = [];

      if (version && !pluginId) {
        query += ' AND (version_id = ? OR version_id = \'\' OR plugin_id != \'\')';
        params.push(version);
      } else if (pluginId) {
        query += ' AND plugin_id = ?';
        params.push(pluginId);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (severity) {
        query += ' AND severity = ?';
        params.push(severity);
      }

      query += ' ORDER BY id ASC';
      const rules = db.prepare(query).all(...params);
      return { rules, count: rules.length };
    }

    case 'brain_get_rule_detail': {
      const ruleId = String(args['rule_id'] ?? '');
      const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
      return { rule };
    }

    case 'brain_get_doctrine': {
      const version = typeof args['version'] === 'string' ? args['version'] : '';
      const status = typeof args['status'] === 'string' ? args['status'] : 'ACTIVE';
      const topic = typeof args['topic'] === 'string' ? args['topic'] : '';

      let query = 'SELECT id, status, date, title, body, scope, thread_ref, version_id, plugin_id FROM doctrine WHERE status = ?';
      const params: string[] = [status];

      if (version) {
        query += ' AND (version_id = ? OR version_id = \'\')';
        params.push(version);
      }

      if (topic) {
        query += ' AND (title LIKE ? OR body LIKE ? OR scope LIKE ?)';
        params.push(`%${topic}%`, `%${topic}%`, `%${topic}%`);
      }

      query += ' ORDER BY date DESC';
      const doctrines = db.prepare(query).all(...params);
      return { doctrines, count: doctrines.length };
    }

    case 'brain_explore_graph': {
      const nodeId = String(args['node_id'] ?? '');
      const version = typeof args['version'] === 'string' ? args['version'] : '';

      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      let inQuery = 'SELECT id, source AS "from", type, weight, description FROM edges WHERE target = ?';
      let outQuery = 'SELECT id, target AS "to", type, weight, description FROM edges WHERE source = ?';
      const inParams: string[] = [nodeId];
      const outParams: string[] = [nodeId];

      if (version) {
        inQuery += ' AND (version_id = ? OR version_id = \'\' OR plugin_id != \'\')';
        outQuery += ' AND (version_id = ? OR version_id = \'\' OR plugin_id != \'\')';
        inParams.push(version);
        outParams.push(version);
      }

      const inbound = db.prepare(inQuery).all(...inParams);
      const outbound = db.prepare(outQuery).all(...outParams);

      return {
        node,
        inbound,
        outbound,
      };
    }

    case 'brain_resolve_context': {
      const target = String(args['component_or_file'] ?? '');
      const version = typeof args['version'] === 'string' ? args['version'] : '';

      // Match nodes
      const nodes = db
        .prepare('SELECT * FROM nodes WHERE id = ? OR label LIKE ? OR file_path LIKE ?')
        .all(target, `%${target}%`, `%${target}%`);

      // Match rules
      const relevant_rules = db
        .prepare('SELECT id, severity, category, title, origin FROM rules WHERE title LIKE ? OR category LIKE ? OR body LIKE ?')
        .all(`%${target}%`, `%${target}%`, `%${target}%`);

      // Match doctrine
      const doctrine = db
        .prepare('SELECT id, status, date, title, scope FROM doctrine WHERE scope LIKE ? OR title LIKE ? OR body LIKE ?')
        .all(`%${target}%`, `%${target}%`, `%${target}%`);

      return {
        target,
        version,
        nodes,
        relevant_rules,
        doctrine,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
