#!/usr/bin/env node

import { Command } from 'commander';
import { compileBrain } from '../compiler/compiler.js';
import { openDatabase } from '../compiler/db.js';
import { createServer } from '../server/api.js';
import { startMcpServer } from '../mcp/server.js';
import { executeTool } from '../mcp/tools.js';

const program = new Command();

program
  .name('wazuh-brain')
  .description('Graph-based shared brain and control room for Wazuh repositories and plugins')
  .version('1.0.0');

program
  .command('compile')
  .description('Compile markdown/YAML rules, doctrine, and graph connections into SQLite database')
  .option('-d, --db <path>', 'Database output path', '.cache/brain.sqlite')
  .action(async (opts: { db: string }) => {
    try {
      console.log('Compiling Wazuh Shared Brain...');
      const result = await compileBrain({ dbPath: opts.db });
      console.log(`✓ Brain compiled successfully:`);
      console.log(`  - Versions: ${result.versionsCount}`);
      console.log(`  - Plugins:  ${result.pluginsCount}`);
      console.log(`  - Rules:    ${result.rulesCount}`);
      console.log(`  - Doctrine: ${result.doctrineCount}`);
      console.log(`  - Nodes:    ${result.nodesCount}`);
      console.log(`  - Edges:    ${result.edgesCount}`);
    } catch (err: unknown) {
      console.error('Compilation failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start local REST API and Control Room dashboard')
  .option('-p, --port <number>', 'Port to listen on', '3333')
  .option('-d, --db <path>', 'Database path', '.cache/brain.sqlite')
  .action(async (opts: { port: string; db: string }) => {
    try {
      await compileBrain({ dbPath: opts.db });
      const port = parseInt(opts.port, 10);
      const server = createServer({ dbPath: opts.db });
      server.listen(port, '127.0.0.1', () => {
        console.log(`\n  ┌──────────────────────────────────────────────────┐`);
        console.log(`  │  Wazuh Shared Brain - Control Room Active        │`);
        console.log(`  │  Local URL: http://localhost:${port}               │`);
        console.log(`  └──────────────────────────────────────────────────┘\n`);
      });
    } catch (err: unknown) {
      console.error('Server failed to start:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start Model Context Protocol (MCP) server over stdio for AI agents')
  .option('-d, --db <path>', 'Database path', '.cache/brain.sqlite')
  .action(async (opts: { db: string }) => {
    try {
      await compileBrain({ dbPath: opts.db });
      await startMcpServer({ dbPath: opts.db });
    } catch (err: unknown) {
      console.error('MCP server failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('query <identifier>')
  .description('Quick terminal lookup for a rule, node, or doctrine')
  .option('-d, --db <path>', 'Database path', '.cache/brain.sqlite')
  .action(async (identifier: string, opts: { db: string }) => {
    try {
      const db = openDatabase(opts.db);
      const res = executeTool(db, 'brain_resolve_context', { component_or_file: identifier });
      console.log(JSON.stringify(res, null, 2));
      db.close();
    } catch (err: unknown) {
      console.error('Query failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
