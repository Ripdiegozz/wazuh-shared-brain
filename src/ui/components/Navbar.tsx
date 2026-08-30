import React, { useState, useRef, useEffect } from 'react';
import { Search, Layers, Box, Cpu, ShieldAlert, BookOpen, Sparkles, DownloadCloud, ChevronDown, CheckSquare, Square } from 'lucide-react';
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
  onOpenIngest: () => void;
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
  onOpenIngest,
  stats,
}) => {
  const [isPluginDropdownOpen, setIsPluginDropdownOpen] = useState(false);
  const [pluginFilter, setPluginFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentVersionObj = versions.find((v) => v.id === selectedVersion);
  const isPrerelease = Boolean(currentVersionObj?.is_prerelease);
  const channel = currentVersionObj?.channel ?? 'stable';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPluginDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(pluginFilter.toLowerCase()) ||
      p.id.toLowerCase().includes(pluginFilter.toLowerCase())
  );

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 select-none shrink-0 z-30 relative">
      {/* Left: Brand, Version & Plugin Filter Dropdown */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-sm tracking-tight text-ink-primary whitespace-nowrap">
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
                {v.name} {v.is_prerelease ? `[${(v.channel ?? 'beta').toUpperCase()}]` : ''}
              </option>
            ))}
          </select>

          {/* Active Channel Badge */}
          {isPrerelease && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-semibold">
              <Sparkles className="w-2.5 h-2.5" />
              {channel}
            </span>
          )}
        </div>

        {/* Clean Plugin Dropdown Menu */}
        {plugins.length > 0 && (
          <div className="relative pl-2 border-l border-border" ref={dropdownRef}>
            <button
              onClick={() => setIsPluginDropdownOpen(!isPluginDropdownOpen)}
              className={`h-7 px-2.5 rounded text-xs font-medium border flex items-center gap-1.5 transition-all ${
                selectedPlugins.length > 0
                  ? 'bg-white/10 text-white border-white/30'
                  : 'bg-canvas text-ink-secondary border-border hover:border-border-strong hover:text-ink-primary'
              }`}
            >
              <span>Plugins ({selectedPlugins.length}/{plugins.length})</span>
              <ChevronDown className="w-3 h-3 text-ink-tertiary" />
            </button>

            {/* Popover Dropdown */}
            {isPluginDropdownOpen && (
              <div className="absolute top-9 left-2 w-72 bg-surface-raised border border-border rounded-lg shadow-2xl p-2.5 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <input
                  type="text"
                  value={pluginFilter}
                  onChange={(e) => setPluginFilter(e.target.value)}
                  placeholder="Filter plugins..."
                  className="w-full bg-canvas text-xs text-ink-primary px-2 py-1.5 rounded border border-border outline-none focus:border-white"
                  autoFocus
                />

                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                  {filteredPlugins.map((p) => {
                    const active = selectedPlugins.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onTogglePlugin(p.id)}
                        className={`px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          active ? 'bg-white/15 text-white' : 'hover:bg-white/[0.04] text-ink-secondary'
                        }`}
                      >
                        <span className="truncate pr-2 font-mono text-[11px]">{p.name}</span>
                        {active ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  {filteredPlugins.length === 0 && (
                    <div className="text-[11px] text-ink-tertiary text-center py-3">No matching plugins.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle: Search input & Ingest Button */}
      <div className="flex items-center gap-2">
        <div className="relative w-64 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rules, nodes, doctrine..."
            className="w-full bg-canvas text-xs text-ink-primary pl-8 pr-3 py-1.5 rounded border border-border placeholder:text-ink-tertiary outline-none hover:border-border-strong focus:border-white transition-colors"
          />
        </div>

        <button
          onClick={onOpenIngest}
          className="h-8 px-2.5 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          title="Ingest Wazuh plugins and repositories from local folder or GitHub"
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Ingest</span>
        </button>
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
