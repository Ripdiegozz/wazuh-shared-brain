# Wazuh Shared Brain 🧠

> **Ultra-efficient, graph-structured shared brain and visual control room for Wazuh versions, repositories, and plugins.**

Designed specifically for AI coding agents (Claude, Cline, Cursor, OpenCode, OMP) and security engineers working across multiple Wazuh repositories. It eliminates **context bloat** by serving surgical micro-payloads (50–150 tokens) over the Model Context Protocol (MCP) while maintaining strict **version isolation**, **prerelease / beta detection**, and **plugin overlays**.

---

## 🌟 Key Features

1. **Zero-Context-Bloat MCP Server:** Instead of loading full repositories or monolithic rule files into the prompt, agents query concise summaries and 1-depth graph slices on demand.
2. **Universal Ingestion Engine (`wazuh-brain ingest`):** Auto-discovers and extracts plugins, daemons, and dependency DAGs (`requiredPlugins`, `optionalPlugins`) from any local directory on any OS, or directly from GitHub.
3. **Version & Prerelease Isolation:** Scopes rules, doctrines, and architectural DAGs by Wazuh version (`v4.8`, `v4.9`, `v4.10`) and beta/rc channels (`v4.9-beta1`, `v5.0.0-alpha`) with dynamic plugin overlays (`threat-intel`, `security-analytics`, `reporting`).
4. **Local-First SQLite Engine:** Compiles Markdown/YAML sources into an indexed SQLite database with FTS5 search (< 1ms query latency).
5. **Scandinavian-Designed "Control Room":** High-density, restrained dark web dashboard featuring:
   - **2D Hierarchical Flow Map:** Visual column routing (Daemons, Agents, Decoders, Plugins) with SVG bezier curve connections.
   - **3D Orbital Graph:** Interactive Three.js force-directed node cluster with auto-orbiting camera.
   - **Rules & Doctrine Matrices:** Filterable invariants (`HARD`, `WARN`, `TIP`) and architectural directives.
   - **Terminal REPL Simulator:** Live testing of MCP tools with micro-payload token estimates.

---

## 📁 Repository Structure

```
wazuh-shared-brain/
├── versions/
│   ├── v4.8/               # Rules, doctrine & node connections
│   ├── v4.9/
│   └── v4.9-beta1/         # Beta/Prerelease channel
├── plugins/
│   ├── threat-intel/
│   ├── wazuh-dashboard-security-analytics/
│   ├── wazuh-security-dashboards-plugin/
│   └── wazuh-dashboard-reporting/
├── src/
│   ├── core/               # Zod schemas & version channel types
│   ├── compiler/           # Markdown/YAML -> SQLite compiler with FTS5
│   ├── ingest/             # Universal local/remote plugin ingestion engine
│   ├── mcp/                # Model Context Protocol stdio server & tools
│   ├── server/             # Local REST API & static file server
│   ├── cli/                # CLI toolchain (wazuh-brain)
│   └── ui/                 # React 19 + Tailwind + Three.js Control Room
└── docs/plans/             # Architecture RFCs & implementation plans
```

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Ripdiegozz/wazuh-shared-brain.git
cd wazuh-shared-brain
npm install
```

### 2. Auto-Ingest Wazuh Plugins & Repositories (Universal)
```bash
# Option A: Scan any local directory containing Wazuh repositories / worktrees
wazuh-brain ingest --dir /path/to/your/wazuh/repos

# Option B: Fetch directly from GitHub without local clones
wazuh-brain ingest --remote --org wazuh --repos wazuh-dashboard-plugins,wazuh-security-dashboards-plugin,wazuh-dashboard-security-analytics,wazuh-dashboard-reporting,wazuh-dashboard-notifications
```

### 3. Compile the Brain
```bash
wazuh-brain compile
```

### 4. Launch the Control Room Dashboard
```bash
wazuh-brain serve
# Open http://localhost:3333 in your browser
```

---

## 🤖 Configuring MCP for AI Agents

Add `wazuh-shared-brain` to your AI agent configuration to enable zero-context-bloat queries:

### Antigravity / OpenCode (`opencode.json`)
```json
{
  "mcp": {
    "wazuh-shared-brain": {
      "command": ["npx", "-y", "tsx", "/path/to/wazuh-shared-brain/src/cli/index.ts", "mcp"],
      "enabled": true,
      "type": "local"
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "wazuh-shared-brain": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/wazuh-shared-brain/src/cli/index.ts", "mcp"]
    }
  }
}
```

---

## 🧪 Testing

Run the full test suite with Vitest:
```bash
npm test
```
Includes unit tests for schemas, compiler DAG resolution, FTS5 full-text indexing, plugin auto-discovery, MCP tools micro-payload validation, and end-to-end integration workflows.
