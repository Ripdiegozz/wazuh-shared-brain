import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';
import { openDatabase } from './db.js';
import {
  RuleSchema,
  DoctrineSchema,
  NodeSchema,
  ConnectionSchema,
  PluginManifestSchema,
  type Rule,
  type Doctrine,
  type Node,
  type Connection,
  type PluginManifest,
  type VersionChannel,
} from '../core/schema.js';

export interface CompileOptions {
  dbPath?: string;
  rootDir?: string;
}

export interface CompileResult {
  versionsCount: number;
  pluginsCount: number;
  rulesCount: number;
  doctrineCount: number;
  nodesCount: number;
  edgesCount: number;
}

function parseVersionMetadata(versionId: string): {
  name: string;
  baseVersion: string | null;
  channel: VersionChannel;
  isPrerelease: number;
} {
  const match = versionId.match(/^(.+?)-(beta\d*|rc\d*|alpha\d*)$/i);
  if (match && match[1] && match[2]) {
    const rawChannel = match[2].toLowerCase();
    const channel: VersionChannel = rawChannel.startsWith('beta')
      ? 'beta'
      : rawChannel.startsWith('rc')
      ? 'rc'
      : 'alpha';

    return {
      name: `Wazuh ${versionId}`,
      baseVersion: match[1],
      channel,
      isPrerelease: 1,
    };
  }

  return {
    name: `Wazuh ${versionId}`,
    baseVersion: null,
    channel: 'stable',
    isPrerelease: 0,
  };
}

export async function compileBrain(options: CompileOptions = {}): Promise<CompileResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const dbPath = options.dbPath ?? path.join(rootDir, '.cache', 'brain.sqlite');

  const db = openDatabase(dbPath);

  let versionsCount = 0;
  let pluginsCount = 0;
  let rulesCount = 0;
  let doctrineCount = 0;
  let nodesCount = 0;
  let edgesCount = 0;

  const runTransaction = db.transaction(() => {
    // Clear existing data
    db.prepare('DELETE FROM versions').run();
    db.prepare('DELETE FROM plugins').run();
    db.prepare('DELETE FROM nodes').run();
    db.prepare('DELETE FROM edges').run();
    db.prepare('DELETE FROM rules').run();
    db.prepare('DELETE FROM doctrine').run();
    db.prepare('DELETE FROM fts_search').run();

    const insertVersion = db.prepare(
      'INSERT INTO versions (id, name, base_version, channel, is_prerelease) VALUES (?, ?, ?, ?, ?)'
    );
    const insertPlugin = db.prepare(
      'INSERT INTO plugins (id, name, version, description, wazuh_versions, category) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertNode = db.prepare(
      'INSERT INTO nodes (id, type, label, package, file_path, description, version_id, plugin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertEdge = db.prepare(
      'INSERT INTO edges (id, source, target, type, weight, description, version_id, plugin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertRule = db.prepare(
      'INSERT INTO rules (id, severity, category, title, body, origin, overrides, version_id, plugin_id, wazuh_versions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertDoctrine = db.prepare(
      'INSERT INTO doctrine (id, status, date, title, body, scope, thread_ref, version_id, plugin_id, wazuh_versions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertFts = db.prepare(
      'INSERT INTO fts_search (id, title, body, entity_type, version_id, plugin_id) VALUES (?, ?, ?, ?, ?, ?)'
    );

    // 1. Process Versions
    const versionsDir = path.join(rootDir, 'versions');
    if (fs.existsSync(versionsDir)) {
      const versionFolders = fs.readdirSync(versionsDir, { withFileTypes: true });

      for (const dirent of versionFolders) {
        if (!dirent.isDirectory()) continue;
        const versionId = dirent.name;
        const versionPath = path.join(versionsDir, versionId);

        const meta = parseVersionMetadata(versionId);
        insertVersion.run(versionId, meta.name, meta.baseVersion, meta.channel, meta.isPrerelease);
        versionsCount++;

        // Process Rules
        const rulesDir = path.join(versionPath, 'rules');
        if (fs.existsSync(rulesDir)) {
          const ruleFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
          for (const file of ruleFiles) {
            const raw = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
            const parsed = matter(raw);
            const title = (parsed.data['title'] as string | undefined) ?? parsed.content.split('\n')[0]?.replace(/^#*\s*/, '') ?? file;
            const ruleObj = RuleSchema.parse({
              id: parsed.data['id'] ?? path.basename(file, '.md'),
              severity: parsed.data['severity'],
              category: parsed.data['category'] ?? 'General',
              origin: parsed.data['origin'],
              overrides: parsed.data['overrides'],
              wazuh_versions: parsed.data['wazuh_versions'],
              title,
              body: parsed.content.trim(),
              version_id: versionId,
              plugin_id: '',
            });

            insertRule.run(
              ruleObj.id,
              ruleObj.severity,
              ruleObj.category,
              ruleObj.title,
              ruleObj.body,
              ruleObj.origin ?? null,
              ruleObj.overrides ?? null,
              versionId,
              '',
              JSON.stringify(ruleObj.wazuh_versions ?? [])
            );
            insertFts.run(ruleObj.id, ruleObj.title, ruleObj.body, 'rule', versionId, '');
            rulesCount++;
          }
        }

        // Process Doctrine
        const doctrineDir = path.join(versionPath, 'doctrine');
        if (fs.existsSync(doctrineDir)) {
          const docFiles = fs.readdirSync(doctrineDir).filter((f) => f.endsWith('.md'));
          for (const file of docFiles) {
            const raw = fs.readFileSync(path.join(doctrineDir, file), 'utf-8');
            const parsed = matter(raw);
            const title = (parsed.data['title'] as string | undefined) ?? parsed.content.split('\n')[0]?.replace(/^#*\s*/, '') ?? file;
            const docObj = DoctrineSchema.parse({
              id: parsed.data['id'] ?? path.basename(file, '.md'),
              status: parsed.data['status'] ?? 'ACTIVE',
              date: parsed.data['date'] ?? new Date().toISOString().split('T')[0],
              title,
              scope: parsed.data['scope'],
              thread_ref: parsed.data['thread_ref'],
              wazuh_versions: parsed.data['wazuh_versions'],
              body: parsed.content.trim(),
              version_id: versionId,
              plugin_id: '',
            });

            insertDoctrine.run(
              docObj.id,
              docObj.status,
              docObj.date,
              docObj.title,
              docObj.body,
              docObj.scope ?? null,
              docObj.thread_ref ?? null,
              versionId,
              '',
              JSON.stringify(docObj.wazuh_versions ?? [])
            );
            insertFts.run(docObj.id, docObj.title, docObj.body, 'doctrine', versionId, '');
            doctrineCount++;
          }
        }

        // Process Nodes
        const nodesDir = path.join(versionPath, 'nodes');
        if (fs.existsSync(nodesDir)) {
          const nodeFiles = fs.readdirSync(nodesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
          for (const file of nodeFiles) {
            const raw = fs.readFileSync(path.join(nodesDir, file), 'utf-8');
            const parsed = YAML.parse(raw) as Record<string, unknown>;
            const nodeObj = NodeSchema.parse({
              id: parsed['id'] ?? path.basename(file, path.extname(file)),
              type: parsed['type'],
              label: parsed['label'] ?? parsed['id'],
              package: parsed['package'] ?? 'wazuh',
              file_path: parsed['file_path'],
              description: parsed['description'],
              version_id: versionId,
              plugin_id: '',
            });

            insertNode.run(
              nodeObj.id,
              nodeObj.type,
              nodeObj.label,
              nodeObj.package,
              nodeObj.file_path ?? null,
              nodeObj.description ?? null,
              versionId,
              ''
            );
            insertFts.run(nodeObj.id, nodeObj.label, nodeObj.description ?? '', 'node', versionId, '');
            nodesCount++;
          }
        }

        // Process Connections
        const connPath = path.join(versionPath, 'connections.yml');
        if (fs.existsSync(connPath)) {
          const raw = fs.readFileSync(connPath, 'utf-8');
          const parsed = YAML.parse(raw) as { connections?: unknown[] };
          if (Array.isArray(parsed?.connections)) {
            for (let i = 0; i < parsed.connections.length; i++) {
              const item = parsed.connections[i];
              const connObj = ConnectionSchema.parse(item);
              const edgeId = `${versionId}_edge_${i}_${connObj.from}_${connObj.to}`;
              insertEdge.run(
                edgeId,
                connObj.from,
                connObj.to,
                connObj.type,
                connObj.weight ?? 'STANDARD',
                connObj.description ?? null,
                versionId,
                ''
              );
              edgesCount++;
            }
          }
        }
      }
    }

    // 2. Process Plugins
    const pluginsDir = path.join(rootDir, 'plugins');
    if (fs.existsSync(pluginsDir)) {
      const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true });

      for (const dirent of pluginFolders) {
        if (!dirent.isDirectory()) continue;
        const pluginFolder = dirent.name;
        const pluginPath = path.join(pluginsDir, pluginFolder);

        const manifestPath = path.join(pluginPath, 'plugin.yml');
        if (!fs.existsSync(manifestPath)) continue;

        const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
        const parsedManifest = YAML.parse(rawManifest) as Record<string, unknown>;
        const pluginObj = PluginManifestSchema.parse(parsedManifest);

        insertPlugin.run(
          pluginObj.id,
          pluginObj.name,
          pluginObj.version,
          pluginObj.description ?? null,
          JSON.stringify(pluginObj.wazuh_versions),
          pluginObj.category ?? 'wazuh'
        );

        // Process Plugin Rules
        const rulesDir = path.join(pluginPath, 'rules');
        if (fs.existsSync(rulesDir)) {
          const ruleFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
          for (const file of ruleFiles) {
            const raw = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
            const parsed = matter(raw);
            const title = (parsed.data['title'] as string | undefined) ?? parsed.content.split('\n')[0]?.replace(/^#*\s*/, '') ?? file;
            const ruleObj = RuleSchema.parse({
              id: parsed.data['id'] ?? path.basename(file, '.md'),
              severity: parsed.data['severity'],
              category: parsed.data['category'] ?? 'Plugin',
              origin: parsed.data['origin'],
              overrides: parsed.data['overrides'],
              wazuh_versions: parsed.data['wazuh_versions'] ?? pluginObj.wazuh_versions,
              title,
              body: parsed.content.trim(),
              version_id: '',
              plugin_id: pluginObj.id,
            });

            insertRule.run(
              ruleObj.id,
              ruleObj.severity,
              ruleObj.category,
              ruleObj.title,
              ruleObj.body,
              ruleObj.origin ?? null,
              ruleObj.overrides ?? null,
              '',
              pluginObj.id,
              JSON.stringify(ruleObj.wazuh_versions ?? [])
            );
            insertFts.run(ruleObj.id, ruleObj.title, ruleObj.body, 'rule', '', pluginObj.id);
            rulesCount++;
          }
        }

        // Process Plugin Nodes
        const nodesDir = path.join(pluginPath, 'nodes');
        if (fs.existsSync(nodesDir)) {
          const nodeFiles = fs.readdirSync(nodesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
          for (const file of nodeFiles) {
            const raw = fs.readFileSync(path.join(nodesDir, file), 'utf-8');
            const parsed = YAML.parse(raw) as Record<string, unknown>;
            const nodeObj = NodeSchema.parse({
              id: parsed['id'] ?? path.basename(file, path.extname(file)),
              type: parsed['type'] ?? 'plugin',
              label: parsed['label'] ?? parsed['id'],
              package: parsed['package'] ?? `plugin-${pluginObj.id}`,
              file_path: parsed['file_path'],
              description: parsed['description'],
              version_id: '',
              plugin_id: pluginObj.id,
            });

            insertNode.run(
              nodeObj.id,
              nodeObj.type,
              nodeObj.label,
              nodeObj.package,
              nodeObj.file_path ?? null,
              nodeObj.description ?? null,
              '',
              pluginObj.id
            );
            insertFts.run(nodeObj.id, nodeObj.label, nodeObj.description ?? '', 'node', '', pluginObj.id);
            nodesCount++;
          }
        }

        // Process Plugin Connections
        const connPath = path.join(pluginPath, 'connections.yml');
        if (fs.existsSync(connPath)) {
          const raw = fs.readFileSync(connPath, 'utf-8');
          const parsed = YAML.parse(raw) as { connections?: unknown[] };
          if (Array.isArray(parsed?.connections)) {
            for (let i = 0; i < parsed.connections.length; i++) {
              const item = parsed.connections[i];
              const connObj = ConnectionSchema.parse(item);
              const edgeId = `${pluginObj.id}_edge_${i}_${connObj.from}_${connObj.to}`;
              insertEdge.run(
                edgeId,
                connObj.from,
                connObj.to,
                connObj.type,
                connObj.weight ?? 'STANDARD',
                connObj.description ?? null,
                '',
                pluginObj.id
              );
              edgesCount++;
            }
          }
        }
      }
    }
  });

  runTransaction();
  db.close();

  return {
    versionsCount,
    pluginsCount,
    rulesCount,
    doctrineCount,
    nodesCount,
    edgesCount,
  };
}
