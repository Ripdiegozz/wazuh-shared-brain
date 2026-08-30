# Wazuh Shared Brain 🧠

> **Ultra-efficient, graph-structured shared brain and visual control room for Wazuh versions, repositories, and plugins.**

Designed specifically for AI coding agents (Claude, Cline, Cursor, OpenCode, OMP) and security engineers working across multiple Wazuh repositories. It eliminates **context bloat** by serving surgical micro-payloads (50–150 tokens) over the Model Context Protocol (MCP) while maintaining strict **version isolation** and **plugin overlays**.

---

## 🌟 Key Features

1. **Zero-Context-Bloat MCP Server:** Instead of loading full repositories or monolithic rule files into the prompt, agents query concise summaries and 1-depth graph slices on demand.
2. **Version & Plugin Isolation:** Scopes rules, doctrines, and architectural DAGs by Wazuh version (`v4.8`, `v4.9`, `v4.10`) with dynamic plugin overlays (`threat-intel`, `custom-decoders`).
3. **Local-First SQLite Engine:** Compiles Markdown/YAML sources into an indexed SQLite database with FTS5 search (< 1ms query latency).
4. **Scandinavian-Designed "Control Room":** High-density, restrained dark web dashboard featuring:
   - **2D Hierarchical Flow Map:** Visual column routing (Daemons, Agents, Decoders, Plugins) with SVG bezier curve connections.
   - **3D Orbital Graph:** Interactive Three.js force-directed node cluster with auto-orbiting camera.
   - **Rules & Doctrine Matrices:** Filterable invariants (`HARD`, `WARN`, `TIP`) and architectural directives.
   - **Terminal REPL Simulator:** Live testing of MCP tools with micro-payload token estimates.

---

## 📁 Repository Structure

```
wazuh-shared-brain/
├── versions/
│   ├── v4.8/
│   │   ├── rules/          # WZ-01.md, WZ-02.md (Invariants & constraints)
│   │   ├── doctrine/       # DOC-01-event-pipeline.md (Architectural decisions)
│   │   ├── nodes/          # analysisd.yml, remoted.yml, wazuh-agent.yml
│   │   └── connections.yml # Direct dependencies & invocations
│   └── v4.9/
│       ├── rules/          # WZ-03.md (Version additions & overrides)
│       ├── doctrine/       # DOC-03-index-sharding.md
│       ├── nodes/          # engine-v2.yml
│       └── connections.yml
├── plugins/
│   └── threat-intel/
│       ├── plugin.yml      # Compatibility manifest (e.g. ">=4.8")
│       ├── rules/          # TI-01.md
│       ├── nodes/          # threat-intel.yml
│       └── connections.yml # Cross-boundary hooks & intercepts
├── src/
│   ├── core/               # Zod schemas & type definitions
│   ├── compiler/           # Markdown/YAML -> SQLite compiler
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
git clone https://github.com/your-org/wazuh-shared-brain.git
cd wazuh-shared-brain
npm install
```

### 2. Compile the Brain
Compiles all Markdown and YAML sources into `.cache/brain.sqlite`:
```bash
npm run compile
```

### 3. Launch the Control Room Dashboard
```bash
npm run serve
# Open http://localhost:3333 in your browser
```

### 4. Build Frontend for Production
```bash
npm run build
```

---

## 🤖 Configuring MCP for AI Agents

Add `wazuh-shared-brain` to your AI agent's configuration to enable zero-context-bloat queries:

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "wazuh-shared-brain": {
      "command": "node",
      "args": ["/absolute/path/to/wazuh-shared-brain/dist/cli/index.js", "mcp"]
    }
  }
}
```

### Cline / Cursor / OpenCode MCP Config
```json
{
  "mcpServers": {
    "wazuh-brain": {
      "command": "npx",
      "args": ["-y", "tsx", "src/cli/index.ts", "mcp"],
      "cwd": "/absolute/path/to/wazuh-shared-brain"
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

| Tool | Parameters | Description | Context Cost |
|---|---|---|---|
| `brain_list_versions` | None | Lists available Wazuh versions and installed plugins. | ~30 tokens |
| `brain_get_rules` | `version`, `category?`, `severity?` | Returns concise rule headers (ID, title, severity) without body. | ~100 tokens |
| `brain_get_rule_detail` | `rule_id` | Fetches full specification, origin, and overrides for a specific rule. | ~150 tokens |
| `brain_get_doctrine` | `version`, `status?`, `topic?` | Fetches active architectural decisions and RFC consensus. | ~150 tokens |
| `brain_explore_graph` | `node_id`, `version`, `depth?` | Explores direct 1-depth inbound/outbound dependencies for a node. | ~120 tokens |
| `brain_resolve_context` | `component_or_file`, `version` | Discovers rules, doctrine, and nodes affecting a given file or daemon. | ~150 tokens |

---

## 💻 CLI Commands

```bash
# Compile markdown/YAML files into SQLite
wazuh-brain compile [--db <path>]

# Start web control room & REST API
wazuh-brain serve [--port 3333] [--db <path>]

# Start stdio MCP server
wazuh-brain mcp [--db <path>]

# Query component or rule from terminal
wazuh-brain query analysisd
```

---

## 🧪 Testing

Run the full test suite with Vitest:
```bash
npm test
```

Includes unit tests for schemas, compiler DAG resolution, FTS5 full-text indexing, MCP tools micro-payload validation, and end-to-end integration workflows.

---

## 🎨 Scandinavian Design System

The Control Room UI adheres to Scandinavian design principles:
- **Canvas:** `#0A0A0A` (Restrained near-black canvas)
- **Surface:** `#141414` (Neutral dark surfaces)
- **Border:** `rgb(255 255 255 / 10%)`
- **Typography:** `Inter Variable`, sentence case, 8px layout grid.
- **Inks:** 100% Primary, 56% Secondary, 36% Tertiary.
