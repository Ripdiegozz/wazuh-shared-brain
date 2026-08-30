import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { openDatabase } from '../compiler/db.js';

export interface ServerOptions {
  dbPath?: string;
  staticDir?: string;
}

export interface AppServer extends http.Server {
  db: Database.Database;
  closeServer(): Promise<void>;
}

export function createServer(options: ServerOptions = {}): AppServer {
  const db = openDatabase(options.dbPath);
  const staticDir = options.staticDir ?? path.join(process.cwd(), 'dist');

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // 1. GET /api/versions
    if (pathname === '/api/versions') {
      const versions = db.prepare('SELECT id, name, base_version, channel, is_prerelease FROM versions').all();
      const plugins = db.prepare('SELECT id, name, version, description, wazuh_versions FROM plugins').all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ versions, plugins }));
      return;
    }

    // 2. GET /api/rules
    if (pathname === '/api/rules') {
      const version = searchParams.get('version');
      const pluginId = searchParams.get('plugin_id');
      const category = searchParams.get('category');
      const severity = searchParams.get('severity');

      let query = 'SELECT * FROM rules WHERE 1=1';
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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rules }));
      return;
    }

    // 3. GET /api/doctrine
    if (pathname === '/api/doctrine') {
      const version = searchParams.get('version');
      const status = searchParams.get('status') ?? 'ACTIVE';
      const topic = searchParams.get('topic');

      let query = 'SELECT * FROM doctrine WHERE 1=1';
      const params: string[] = [];

      if (status !== 'ALL') {
        query += ' AND status = ?';
        params.push(status);
      }

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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ doctrines }));
      return;
    }

    // 4. GET /api/graph
    if (pathname === '/api/graph') {
      const version = searchParams.get('version');
      const pluginId = searchParams.get('plugin_id');

      let nodeQuery = 'SELECT id, type, label, package, file_path, description, version_id, plugin_id FROM nodes WHERE 1=1';
      let edgeQuery = 'SELECT id, source, target, type, weight, description, version_id, plugin_id FROM edges WHERE 1=1';
      const nodeParams: string[] = [];
      const edgeParams: string[] = [];

      if (version && !pluginId) {
        nodeQuery += ' AND (version_id = ? OR version_id = \'\' OR plugin_id != \'\')';
        edgeQuery += ' AND (version_id = ? OR version_id = \'\' OR plugin_id != \'\')';
        nodeParams.push(version);
        edgeParams.push(version);
      } else if (pluginId) {
        nodeQuery += ' AND plugin_id = ?';
        edgeQuery += ' AND plugin_id = ?';
        nodeParams.push(pluginId);
        edgeParams.push(pluginId);
      }

      const nodes = db.prepare(nodeQuery).all(...nodeParams);
      const edges = db.prepare(edgeQuery).all(...edgeParams);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ nodes, edges }));
      return;
    }

    // 5. GET /api/search
    if (pathname === '/api/search') {
      const q = searchParams.get('q') ?? '';
      if (!q) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: [] }));
        return;
      }

      const sanitizedQ = q.replace(/['"*]/g, '');
      const results = db
        .prepare('SELECT id, title, body, entity_type, version_id, plugin_id FROM fts_search WHERE fts_search MATCH ? LIMIT 25')
        .all(`${sanitizedQ}*`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results }));
      return;
    }

    // 6. Static files fallback
    if (fs.existsSync(staticDir)) {
      let filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(staticDir, 'index.html');
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentTypeMap: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
        };
        const contentType = contentTypeMap[ext] ?? 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }) as AppServer;

  server.db = db;
  server.closeServer = async function (): Promise<void> {
    db.close();
    return new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  return server;
}
