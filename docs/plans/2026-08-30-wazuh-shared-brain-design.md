# Wazuh Shared Brain - System Architecture & Design Document

**Date:** 2026-08-30  
**Status:** Approved  
**Author:** AI & Engineering Team  

---

## 1. Overview & Objectives

Wazuh is an expansive security ecosystem with multiple repositories, daemons, plugins, decoders, and rules. When AI agents operate across Wazuh repositories, passing monolithic context dumps degrades performance and inflates token usage.

**Wazuh Shared Brain** provides an efficient, graph-structured shared knowledge base and control room that:
1. **Eliminates context bloat:** Delivers targeted micro-payloads (50–150 tokens) to LLM agents via MCP tools rather than full repository/rule dumps.
2. **Maintains version & plugin isolation:** Scopes rules, doctrines, and architectural graphs by Wazuh version (`v4.8`, `v4.9`, `v4.10`) and dynamic plugin overlays (`suricata-integration`, `custom-decoders`, etc.).
3. **Offers a Local-First visual control room:** Provides a Scandinavian-designed, high-density Web UI ("Control Room") with 2D column connections, 3D interactive node graphs, filterable rule matrices, and doctrine records.

---

## 2. Architecture & System Flow

```
┌──────────────────────────────────────────────────────────┐
│             Single Source of Truth (Git)                 │
│  • versions/v4.8/, versions/v4.9/ (Rules, Doctrine, DAG) │
│  • plugins/threat-intel/, plugins/decoders/ (Overlays)   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Brain Compiler (TypeScript/Node)            │
│  • YAML & Markdown Frontmatter Parser                    │
│  • Semantic DAG Resolver (Inheritance + Overrides)       │
│  • Schema Validator & Cross-Reference Checker           │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Compiled SQLite Database (.cache)           │
│  • Indexed relational tables (nodes, edges, rules, etc.) │
│  • FTS5 Full-Text Search index                           │
└──────────────┬─────────────────────────────┬─────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────────┐ ┌─────────────────────────┐
│       MCP Server (Stdio)     │ │   Web UI ("Control Room")│
│  • brain_get_rules           │ │   • 2D Hierarchical Map │
│  • brain_get_rule_detail     │ │   • 3D Orbital Graph    │
│  • brain_get_doctrine        │ │   • Rules & Doctrine    │
│  • brain_explore_graph       │ │   • Scandinavian Design │
│  • brain_resolve_context     │ │   • Fast SQLite backend │
└──────────────────────────────┘ └─────────────────────────┘
```

---

## 3. Data Model & Storage Hierarchy

### 3.1 Directory Structure
```
wazuh-shared-brain/
├── versions/
│   ├── v4.8/
│   │   ├── rules/
│   │   │   ├── WZ-01.md
│   │   │   └── WZ-02.md
│   │   ├── doctrine/
│   │   │   ├── DOC-01-event-pipeline.md
│   │   │   └── DOC-02-decoder-precedence.md
│   │   ├── nodes/
│   │   │   ├── analysisd.yml
│   │   │   ├── wazuh-agent.yml
│   │   │   └── remoted.yml
│   │   └── connections.yml
│   └── v4.9/
│       ├── rules/
│       ├── doctrine/
│       ├── nodes/
│       └── connections.yml
├── plugins/
│   ├── threat-intel/
│   │   ├── plugin.yml
│   │   ├── rules/
│   │   ├── nodes/
│   │   └── connections.yml
│   └── custom-decoders/
│       └── ...
└── .cache/
    └── brain.sqlite
```

### 3.2 Entity Definitions & Schemas

#### Rule (`rules/*.md`)
```markdown
---
id: WZ-01
severity: HARD # HARD | WARN | TIP
category: Ingestion & Parsing
origin: "Wazuh Core #1420"
overrides: "WZ-PRE-04"
wazuh_versions: ["4.8.x", "4.9.x"]
---
# Output Contract Invariant
The normalization pipeline must strictly adhere to the unified event schema. Decoders must never emit unstructured JSON blobs directly into the analysis pipeline.
```

#### Doctrine (`doctrine/*.md`)
```markdown
---
id: DOC-01
status: ACTIVE # ACTIVE | SUPERSEDED | DEPRECATED
date: "2026-08-25"
title: "Single Worker Queue Allocation for High-Throughput Decoders"
scope: "analysisd, remoted"
thread_ref: "https://github.com/wazuh/wazuh/pull/18920"
wazuh_versions: [">=4.8"]
---
Decoders processing over 10k EPS must utilize dedicated ring-buffer channels.
```

#### Node (`nodes/*.yml`)
```yaml
id: "analysisd"
type: "daemon" # daemon | agent | decoder | hook | skill | tool | reference
label: "Analysis Engine"
package: "wazuh-core"
file_path: "src/analysisd/main.c"
description: "Core analysis and rule evaluation daemon"
```

#### Connections (`connections.yml`)
```yaml
connections:
  - from: "remoted"
    to: "analysisd"
    type: "INVOKES" # INVOKES | DEPENDS_ON | OVERRIDES | READS | CONFLICTS_WITH
    weight: "CRITICAL"
    description: "Forwards encrypted raw agent payloads for rule evaluation"
  - from: "threat-intel"
    to: "analysisd"
    type: "INTERCEPTS"
    description: "Appends IOC reputation data before rule execution"
```

---

## 4. SQLite Storage Engine & Compilation Pipeline

### 4.1 SQLite Schema
- `versions (id TEXT PRIMARY KEY, name TEXT, base_version TEXT)`
- `plugins (id TEXT PRIMARY KEY, name TEXT, compatible_versions JSON)`
- `nodes (id TEXT PRIMARY KEY, type TEXT, label TEXT, package TEXT, file_path TEXT, description TEXT, version_id TEXT, plugin_id TEXT)`
- `edges (id TEXT PRIMARY KEY, source TEXT, target TEXT, type TEXT, weight TEXT, description TEXT, version_id TEXT, plugin_id TEXT)`
- `rules (id TEXT PRIMARY KEY, severity TEXT, category TEXT, title TEXT, body TEXT, origin TEXT, overrides TEXT, version_id TEXT, plugin_id TEXT)`
- `doctrine (id TEXT PRIMARY KEY, status TEXT, date TEXT, title TEXT, body TEXT, scope TEXT, thread_ref TEXT, version_id TEXT, plugin_id TEXT)`
- `fts_search USING fts5(id, title, body, entity_type, version_id)`

---

## 5. MCP Server (Zero-Context-Bloat Protocol)

The MCP server runs over stdio (`npx wazuh-brain mcp` or `node dist/mcp/index.js`) and exposes the following tools:

| Tool | Parameters | Returns | Context Cost |
|---|---|---|---|
| `brain_list_versions` | None | Available Wazuh versions and installed plugins | ~30 tokens |
| `brain_get_rules` | `version`, `category?`, `severity?` | List of rule IDs, titles, and severity badges | ~100 tokens |
| `brain_get_rule_detail` | `rule_id`, `version` | Complete rule text, rationale, and origin | ~150 tokens |
| `brain_get_doctrine` | `version`, `topic?`, `status?` | Active architectural decisions & directives | ~150 tokens |
| `brain_explore_graph` | `node_id`, `version`, `depth?`, `direction?` | Immediate upstream/downstream neighbors only | ~120 tokens |
| `brain_resolve_context` | `component_or_file`, `version` | Rules and graph nodes affecting given component | ~150 tokens |

---

## 6. Scandinavian Design System & Web Dashboard

### 6.1 Design Tokens (Scandinavian System)
- **Canvas:** `#0A0A0A` (deep restrained dark background)
- **Surface:** `#141414` (clean neutral dark surface)
- **Border:** `rgb(255 255 255 / 10%)`
- **Primary Ink:** `rgb(255 255 255 / 100%)`
- **Secondary Ink:** `rgb(255 255 255 / 56%)`
- **Tertiary Ink:** `rgb(255 255 255 / 36%)`
- **Severity Accents:**
  - `HARD`: Neutral high-contrast badge / Subtle crimson warning indicator
  - `WARN`: Calibrated amber indicator
  - `TIP`: Restrained neutral badge
- **Typography:** `Inter Variable`, System Sans, 8px layout grid, strict sentence case, left-aligned layout chapters.

### 6.2 Visual Interfaces
1. **The Map (`/map`):**
   - **Column View:** Vertically grouped node categories (`Daemons`, `Decoders`, `Plugins`, `Skills`, `References`) linked with dynamic SVG bezier paths.
   - **3D Orbital View:** Three.js / Canvas-driven 3D node sphere with auto-orbit, node selection, and camera zoom.
   - **Inspector Panel:** Right-hand drawer showing node details, files, and incoming/outgoing edges.
2. **The Rules (`/rules`):**
   - High-density data table with severity filtering (`HARD`, `WARN`, `TIP`), category pills, and origin links.
3. **The Doctrine (`/doctrine`):**
   - Card grid of active architectural decisions, discussion links, and timestamps.
4. **Version & Plugin Matrix:**
   - Quick header dropdown to switch active Wazuh version and toggle plugin layers.

---

## 7. CLI Toolchain

- `wazuh-brain compile`: Validates and compiles sources into `.cache/brain.sqlite`.
- `wazuh-brain serve [--port 3333]`: Starts local web server + REST API for the dashboard.
- `wazuh-brain mcp`: Starts the stdio Model Context Protocol server.
- `wazuh-brain query <rule_id|node_id>`: Quick terminal lookup for rules and node connections.

---

## 8. Verification & Test Plan

1. **Compiler Unit Tests:**
   - Verifies frontmatter and YAML parsing.
   - Validates inheritance resolution between Wazuh `v4.8` and `v4.9`.
   - Tests cycle detection and broken reference handling in DAG.
2. **SQLite Performance & FTS5 Tests:**
   - Confirms query latency < 2ms for complex neighbor traversals and full-text searches.
3. **MCP Server Integration Tests:**
   - Simulates agent tool requests and validates response token counts and schemas.
4. **UI Visual & Functional Tests:**
   - Verifies 2D column bezier connections, 3D graph interactivity, filter states, and Scandinavian design token compliance.
