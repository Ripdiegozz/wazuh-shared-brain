import React from 'react';
import { Search, Layers, Box, Cpu, ShieldAlert, BookOpen } from 'lucide-react';
import type { BrainVersion, BrainPlugin } from '../types.js';

interface NavbarProps {
  versions: BrainVersion[];
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  plugins: BrainPlugin[];
  selectedPlugins: string[];
  onTogglePlugin: (pluginId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    nodesCount: number;
    edgesCount: number;
    rulesCount: number;
    doctrineCount: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  versions,
  selectedVersion,
  onSelectVersion,
  plugins,
  selectedPlugins,
  onTogglePlugin,
  searchQuery,
  onSearchChange,
  stats,
}) => {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 select-none shrink-0 z-30">
      {/* Left: Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-sm tracking-tight text-ink-primary">
            Wazuh Control Room
          </span>
        </div>

        {/* Version Switcher */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-border">
          <Layers className="w-3.5 h-3.5 text-ink-tertiary" />
          <select
            value={selectedVersion}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="bg-canvas text-xs text-ink-primary border border-border rounded px-2 py-1 outline-none hover:border-border-strong focus:border-white transition-colors"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plugin Toggles */}
        {plugins.length > 0 && (
          <div className="flex items-center gap-1 pl-2">
            {plugins.map((p) => {
              const active = selectedPlugins.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onTogglePlugin(p.id)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded border transition-all ${
                    active
                      ? 'bg-white/10 text-white border-white/30'
                      : 'bg-transparent text-ink-tertiary border-border hover:border-border-strong hover:text-ink-secondary'
                  }`}
                  title={p.description}
                >
                  +{p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle: Search input */}
      <div className="relative w-80 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search rules, nodes, doctrine..."
          className="w-full bg-canvas text-xs text-ink-primary pl-8 pr-3 py-1.5 rounded border border-border placeholder:text-ink-tertiary outline-none hover:border-border-strong focus:border-white transition-colors"
        />
      </div>

      {/* Right: Stats Summary */}
      <div className="flex items-center gap-4 text-xs font-mono text-ink-secondary">
        <div className="flex items-center gap-1.5" title="Nodes in graph">
          <Box className="w-3.5 h-3.5 text-ink-tertiary" />
          <span className="text-ink-primary font-semibold">{stats.nodesCount}</span>
          <span className="text-[10px] text-ink-tertiary">NODES</span>
        </div>
        <div className="flex items-center gap-1.5" title="Edges / Connections">
          <Cpu className="w-3.5 h-3.5 text-ink-tertiary" />
          <span className="text-ink-primary font-semibold">{stats.edgesCount}</span>
          <span className="text-[10px] text-ink-tertiary">EDGES</span>
        </div>
        <div className="flex items-center gap-1.5" title="Rules">
          <ShieldAlert className="w-3.5 h-3.5 text-ink-tertiary" />
          <span className="text-ink-primary font-semibold">{stats.rulesCount}</span>
          <span className="text-[10px] text-ink-tertiary">RULES</span>
        </div>
        <div className="flex items-center gap-1.5" title="Doctrine Entries">
          <BookOpen className="w-3.5 h-3.5 text-ink-tertiary" />
          <span className="text-ink-primary font-semibold">{stats.doctrineCount}</span>
          <span className="text-[10px] text-ink-tertiary">DOCTRINE</span>
        </div>
      </div>
    </header>
  );
};
