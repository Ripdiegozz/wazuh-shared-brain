# Wazuh Shared Brain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an ultra-efficient, version-isolated, graph-based shared brain for Wazuh repositories and plugins featuring a compiled SQLite engine, a micro-payload MCP server, and a Scandinavian-designed "Control Room" web dashboard.

**Architecture:** Markdown with YAML frontmatter serves as the single source of truth under `versions/` and `plugins/`. A TypeScript compiler parses, resolves inheritance/overrides across versions, and compiles the graph and full-text index into `.cache/brain.sqlite`. An MCP server over stdio serves zero-context-bloat queries to AI agents, while a React/Tailwind/Three.js web dashboard provides 2D column connections, 3D interactive graphs, rules matrices, and doctrine records following Scandinavian design principles.

**Tech Stack:** Node.js/TypeScript, `better-sqlite3`, `zod`, `gray-matter`, `yaml`, `@modelcontextprotocol/sdk`, React, Vite, Tailwind CSS, Lucide React, `react-force-graph`, Vitest.

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

**Step 1: Write `package.json`, `tsconfig.json`, and `vitest.config.ts`**

```json
{
  "name": "wazuh-shared-brain",
  "version": "1.0.0",
  "description": "Graph-based shared brain and control room for Wazuh versions and plugins",
  "type": "module",
  "bin": {
    "wazuh-brain": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc && vite build",
    "test": "vitest run",
    "compile": "tsx src/cli/index.ts compile",
    "serve": "tsx src/cli/index.ts serve",
    "mcp": "tsx src/cli/index.ts mcp",
    "dev:ui": "vite"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.0",
    "better-sqlite3": "^11.8.1",
    "commander": "^13.1.0",
    "gray-matter": "^4.0.3",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-force-graph-2d": "^1.26.0",
    "react-force-graph-3d": "^1.26.0",
    "three": "^0.174.0",
    "yaml": "^2.7.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.13.5",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@types/three": "^0.174.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3",
    "vite": "^6.2.0",
    "vitest": "^3.0.7"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Step 2: Install dependencies**

Run: `npm install`
Expected: Dependencies installed cleanly without error.

**Step 3: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts package-lock.json
git commit -m "chore: scaffold project structure and dependencies"
```

---

### Task 2: Core Data Schemas & Seed Sources for Wazuh v4.8, v4.9 & Plugins

**Files:**
- Create: `src/core/schema.ts`
- Create: `tests/core/schema.test.ts`
- Create: `versions/v4.8/rules/WZ-01.md`
- Create: `versions/v4.8/rules/WZ-02.md`
- Create: `versions/v4.8/doctrine/DOC-01-event-pipeline.md`
- Create: `versions/v4.8/nodes/analysisd.yml`
- Create: `versions/v4.8/nodes/wazuh-agent.yml`
- Create: `versions/v4.8/nodes/remoted.yml`
- Create: `versions/v4.8/connections.yml`
- Create: `versions/v4.9/rules/WZ-03.md`
- Create: `versions/v4.9/connections.yml`
- Create: `plugins/threat-intel/plugin.yml`
- Create: `plugins/threat-intel/rules/TI-01.md`
- Create: `plugins/threat-intel/nodes/threat-intel.yml`
- Create: `plugins/threat-intel/connections.yml`

**Step 1: Write failing schema tests in `tests/core/schema.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { RuleSchema, DoctrineSchema, NodeSchema, ConnectionSchema } from '../../src/core/schema.js';

describe('Core Entity Schemas', () => {
  it('validates a Rule object', () => {
    const validRule = {
      id: 'WZ-01',
      severity: 'HARD',
      category: 'Ingestion',
      origin: 'Core #1420',
      wazuh_versions: ['4.8.x'],
      title: 'Unified Output Contract',
      body: 'Decoders must adhere to event schema.'
    };
    expect(RuleSchema.parse(validRule)).toEqual(validRule);
  });

  it('rejects invalid Rule severity', () => {
    const invalidRule = {
      id: 'WZ-01',
      severity: 'UNKNOWN',
      category: 'Ingestion',
      title: 'Title',
      body: 'Body'
    };
    expect(() => RuleSchema.parse(invalidRule)).toThrow();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run tests/core/schema.test.ts`
Expected: FAIL (Cannot find module `../../src/core/schema.js`)

**Step 3: Implement schemas in `src/core/schema.ts`**

```typescript
import { z } from 'zod';

export const SeverityEnum = z.enum(['HARD', 'WARN', 'TIP']);
export const DoctrineStatusEnum = z.enum(['ACTIVE', 'SUPERSEDED', 'DEPRECATED']);
export const NodeTypeEnum = z.enum(['daemon', 'agent', 'decoder', 'hook', 'skill', 'tool', 'reference', 'plugin']);
export const EdgeTypeEnum = z.enum(['INVOKES', 'DEPENDS_ON', 'OVERRIDES', 'INTERCEPTS', 'READS', 'CONFLICTS_WITH']);

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
});

export type Rule = z.infer<typeof RuleSchema>;
export type Doctrine = z.infer<typeof DoctrineSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
```

**Step 4: Create seed data files for v4.8, v4.9, and threat-intel plugin**

Populate the `versions/` and `plugins/` directories with sample rules, doctrines, nodes, and connections.

**Step 5: Run tests to verify passing**

Run: `npx vitest run tests/core/schema.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/core/schema.ts tests/core/schema.test.ts versions/ plugins/
git commit -m "feat(core): add entity schemas and seed data for wazuh versions and plugins"
```

---

### Task 3: SQLite Storage & Graph Compiler Engine

**Files:**
- Create: `src/compiler/db.ts`
- Create: `src/compiler/compiler.ts`
- Create: `tests/compiler/compiler.test.ts`

**Step 1: Write compiler test in `tests/compiler/compiler.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileBrain } from '../../src/compiler/compiler.js';
import { openDatabase } from '../../src/compiler/db.js';
import fs from 'node:fs';

describe('Brain Compiler Engine', () => {
  const testDbPath = '.cache/test-brain.sqlite';

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('compiles versions and plugins into SQLite database with FTS5 search', async () => {
    const result = await compileBrain({ dbPath: testDbPath, rootDir: process.cwd() });
    expect(result.rulesCount).toBeGreaterThan(0);
    expect(result.nodesCount).toBeGreaterThan(0);

    const db = openDatabase(testDbPath);
    const rules = db.prepare('SELECT * FROM rules WHERE id = ?').all('WZ-01');
    expect(rules.length).toBe(1);

    const search = db.prepare('SELECT * FROM fts_search WHERE fts_search MATCH ?').all('Output');
    expect(search.length).toBeGreaterThan(0);
    db.close();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run tests/compiler/compiler.test.ts`
Expected: FAIL

**Step 3: Implement SQLite migrations and compiler**

- Implement `src/compiler/db.ts` with schema creation (tables for `versions`, `plugins`, `nodes`, `edges`, `rules`, `doctrine`, and `fts_search` table).
- Implement `src/compiler/compiler.ts` to crawl `versions/` and `plugins/`, parse YAML/Markdown with `gray-matter`, resolve inheritance/overrides, and batch-insert into SQLite.

**Step 4: Run test to verify passing**

Run: `npx vitest run tests/compiler/compiler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/compiler/db.ts src/compiler/compiler.ts tests/compiler/compiler.test.ts
git commit -m "feat(compiler): implement sqlite storage engine and brain compiler with fts5"
```

---

### Task 4: Token-Efficient MCP Server

**Files:**
- Create: `src/mcp/server.ts`
- Create: `src/mcp/tools.ts`
- Create: `tests/mcp/tools.test.ts`

**Step 1: Write MCP tool tests in `tests/mcp/tools.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { compileBrain } from '../../src/compiler/compiler.js';
import { openDatabase } from '../../src/compiler/db.js';
import { executeTool } from '../../src/mcp/tools.js';
import fs from 'node:fs';

describe('MCP Tools Suite', () => {
  const testDbPath = '.cache/test-mcp-brain.sqlite';
  let db: any;

  beforeAll(async () => {
    await compileBrain({ dbPath: testDbPath, rootDir: process.cwd() });
    db = openDatabase(testDbPath);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('brain_get_rules returns concise list with minimal tokens', () => {
    const res = executeTool(db, 'brain_get_rules', { version: 'v4.8' });
    expect(res).toBeDefined();
    expect(Array.isArray(res.rules)).toBe(true);
    expect(res.rules[0]).toHaveProperty('id');
    expect(res.rules[0]).toHaveProperty('severity');
    // Ensure full body is omitted to avoid context bloat
    expect(res.rules[0]).not.toHaveProperty('body');
  });

  it('brain_explore_graph returns only 1-depth neighbors', () => {
    const res = executeTool(db, 'brain_explore_graph', { node_id: 'analysisd', version: 'v4.8', depth: 1 });
    expect(res.node.id).toBe('analysisd');
    expect(Array.isArray(res.inbound)).toBe(true);
    expect(Array.isArray(res.outbound)).toBe(true);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run tests/mcp/tools.test.ts`
Expected: FAIL

**Step 3: Implement MCP tools and stdio server in `src/mcp/tools.ts` and `src/mcp/server.ts`**

Implement the 6 core micro-payload tools using `@modelcontextprotocol/sdk`.

**Step 4: Run test to verify passing**

Run: `npx vitest run tests/mcp/tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/mcp/server.ts src/mcp/tools.ts tests/mcp/tools.test.ts
git commit -m "feat(mcp): implement zero-context-bloat mcp server tools"
```

---

### Task 5: Local REST API & CLI Toolchain

**Files:**
- Create: `src/server/api.ts`
- Create: `src/cli/index.ts`
- Create: `tests/server/api.test.ts`

**Step 1: Write API tests in `tests/server/api.test.ts`**

Test `/api/versions`, `/api/rules`, `/api/doctrine`, `/api/graph`, and `/api/search` endpoints.

**Step 2: Run test to verify failure**

Run: `npx vitest run tests/server/api.test.ts`
Expected: FAIL

**Step 3: Implement lightweight HTTP server and CLI commands**

- Implement `src/server/api.ts` using native Node.js `http` module reading directly from `.cache/brain.sqlite`.
- Implement `src/cli/index.ts` with Commander (`compile`, `serve`, `mcp`, `query`).

**Step 4: Run test to verify passing**

Run: `npx vitest run tests/server/api.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api.ts src/cli/index.ts tests/server/api.test.ts
git commit -m "feat(cli): implement cli toolchain and local rest api"
```

---

### Task 6: Scandinavian-Designed Web Dashboard ("Control Room")

**Files:**
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `src/ui/index.css`
- Create: `src/ui/main.tsx`
- Create: `src/ui/App.tsx`
- Create: `src/ui/components/Navbar.tsx`
- Create: `src/ui/components/RulesTable.tsx`
- Create: `src/ui/components/DoctrineGrid.tsx`
- Create: `src/ui/components/ColumnMap2D.tsx`
- Create: `src/ui/components/OrbitalMap3D.tsx`
- Create: `src/ui/components/NodeDrawer.tsx`

**Step 1: Setup Tailwind with Scandinavian Design tokens**
- Canvas: `#0A0A0A`, Surface: `#141414`, Border: `rgb(255 255 255 / 10%)`, Inks: 100%, 56%, 36%.
- Strict typography: Inter, sentence case, 8px grid, no excessive gradients.

**Step 2: Implement Components**
- `RulesTable.tsx`: Filterable table with `HARD`, `WARN`, `TIP` badges, origin tags, and search.
- `DoctrineGrid.tsx`: Card grid for architectural doctrines with discussion links and version scopes.
- `ColumnMap2D.tsx`: Interactive multi-column layout (`Daemons`, `Agents`, `Plugins`, `Decoders`, `References`) connected with SVG cubic bezier curves highlighting active paths on hover.
- `OrbitalMap3D.tsx`: 3D node sphere with auto-orbiting camera and node click inspection using `react-force-graph-3d` / Three.js.
- `NodeDrawer.tsx`: Detailed metadata inspector for selected nodes.

**Step 3: Verify build and components**

Run: `npm run build`
Expected: Clean build without errors.

**Step 4: Commit**

```bash
git add index.html vite.config.ts tailwind.config.js src/ui/
git commit -m "feat(ui): implement scandinavian-designed control room web dashboard"
```

---

### Task 7: End-to-End Smoke Test & Documentation

**Files:**
- Create: `tests/e2e/workflow.test.ts`
- Create: `README.md`

**Step 1: Write full E2E workflow test**
- Compiles fresh brain from sources.
- Queries MCP tools for v4.8 and v4.9.
- Fetches API graph payload and verifies node/edge counts.

**Step 2: Run all tests**

Run: `npm test`
Expected: ALL PASS

**Step 3: Document usage in `README.md`**

**Step 4: Commit**

```bash
git add tests/e2e/workflow.test.ts README.md
git commit -m "docs: add readme and end-to-end integration tests"
```
