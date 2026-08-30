import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import type { BrainNode, BrainEdge } from '../types.js';

interface ColumnMap2DProps {
  nodes: BrainNode[];
  edges: BrainEdge[];
  selectedNode: BrainNode | null;
  onSelectNode: (node: BrainNode) => void;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WAZUH_KEYWORDS = [
  'wazuh',
  'securitydashboards',
  'securityanalytics',
  'reports',
  'notifications',
  'alerting',
  'threat-intel',
];

const TYPE_STYLES: Record<string, { badgeBg: string; badgeText: string; borderColor: string }> = {
  skill: { badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-400', borderColor: 'border-blue-500/30' },
  agent: { badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
  tool: { badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400', borderColor: 'border-amber-500/30' },
  hook: { badgeBg: 'bg-rose-500/10', badgeText: 'text-rose-400', borderColor: 'border-rose-500/30' },
  reference: { badgeBg: 'bg-purple-500/10', badgeText: 'text-purple-400', borderColor: 'border-purple-500/30' },
  plugin: { badgeBg: 'bg-sky-500/10', badgeText: 'text-sky-400', borderColor: 'border-sky-500/30' },
  service: { badgeBg: 'bg-cyan-500/10', badgeText: 'text-cyan-400', borderColor: 'border-cyan-500/30' },
  daemon: { badgeBg: 'bg-neutral-500/10', badgeText: 'text-neutral-400', borderColor: 'border-neutral-500/30' },
};

export const ColumnMap2D: React.FC<ColumnMap2DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [wazuhOnlyPlugins, setWazuhOnlyPlugins] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());

  // Development governance columns matching inspiration
  const categories = [
    { key: 'skill', label: 'SKILLS', match: (n: BrainNode) => n.type === 'skill' },
    { key: 'agent', label: 'AGENTES', match: (n: BrainNode) => n.type === 'agent' },
    { key: 'tool', label: 'HERRAMIENTAS', match: (n: BrainNode) => n.type === 'tool' },
    { key: 'hook', label: 'HOOKS', match: (n: BrainNode) => n.type === 'hook' },
    { key: 'reference', label: 'REFERENCIAS', match: (n: BrainNode) => n.type === 'reference' },
    {
      key: 'plugin',
      label: 'PLUGINS & SERVICES',
      match: (n: BrainNode) => n.type === 'plugin' || n.type === 'service' || n.type === 'daemon',
    },
  ];

  // Measure card coordinates for SVG curve rendering
  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, NodePosition>();

    nodeRefs.current.forEach((el, id) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.set(id, {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    });

    setPositions(newPositions);
  }, []);

  useEffect(() => {
    updatePositions();
    const timeout = setTimeout(updatePositions, 100);
    window.addEventListener('resize', updatePositions);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePositions);
    };
  }, [nodes, edges, wazuhOnlyPlugins, updatePositions]);

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setTimeout(updatePositions, 50);
  };

  const activeNodeId = hoveredNodeId ?? selectedNode?.id ?? null;

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden relative select-none">
      {/* Top instruction bar */}
      <div className="p-3 px-4 border-b border-border flex items-center justify-between text-xs text-ink-secondary bg-surface/50 shrink-0">
        <div>
          <span className="font-semibold text-ink-primary">Development Governance Flow:</span> Hover or click any skill, agent, tool, or reference to trace dependencies and CI gates.
        </div>
        <div className="font-mono text-[11px] text-ink-tertiary">
          {nodes.length} Nodes • {edges.length} Connections
        </div>
      </div>

      {/* Main Column Layout Container */}
      <div
        ref={containerRef}
        onScroll={updatePositions}
        className="flex-1 overflow-x-auto overflow-y-hidden p-6 relative flex gap-6 justify-start min-w-[1100px]"
      >
        {/* SVG Bezier Curves Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {edges.map((edge) => {
            const srcPos = positions.get(edge.source);
            const tgtPos = positions.get(edge.target);
            if (!srcPos || !tgtPos) return null;

            // Start from right of source, end at left of target (or vice versa if reversed)
            const isLeftToRight = srcPos.x < tgtPos.x;
            const x1 = isLeftToRight ? srcPos.x + srcPos.width : srcPos.x;
            const y1 = srcPos.y + srcPos.height / 2;
            const x2 = isLeftToRight ? tgtPos.x : tgtPos.x + tgtPos.width;
            const y2 = tgtPos.y + tgtPos.height / 2;

            const dx = Math.abs(x2 - x1) * 0.5;
            const pathData = `M ${x1} ${y1} C ${x1 + (isLeftToRight ? dx : -dx)} ${y1}, ${
              x2 + (isLeftToRight ? -dx : dx)
            } ${y2}, ${x2} ${y2}`;

            const isHighlighted =
              activeNodeId === edge.source || activeNodeId === edge.target;
            const isDimmed = activeNodeId !== null && !isHighlighted;

            return (
              <g key={edge.id}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={
                    isHighlighted
                      ? edge.type === 'OVERRIDES'
                        ? '#f59e0b'
                        : '#3b82f6'
                      : 'rgba(255, 255, 255, 0.12)'
                  }
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeDasharray={edge.type === 'INTERCEPTS' ? '4 3' : undefined}
                  opacity={isDimmed ? 0.05 : isHighlighted ? 1 : 0.35}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* Columns */}
        {categories.map((col) => {
          let rawColNodes = nodes.filter(col.match);
          if (rawColNodes.length === 0) return null;

          // Apply Wazuh Only filter on plugins column if active
          if (col.key === 'plugin' && wazuhOnlyPlugins) {
            rawColNodes = rawColNodes.filter((n) => {
              const idLower = n.id.toLowerCase();
              const labelLower = n.label.toLowerCase();
              return WAZUH_KEYWORDS.some(
                (kw) => idLower.includes(kw) || labelLower.includes(kw)
              );
            });
          }

          const filterText = columnFilters[col.key] ?? '';
          const colNodes = rawColNodes.filter(
            (n) =>
              n.label.toLowerCase().includes(filterText.toLowerCase()) ||
              n.id.toLowerCase().includes(filterText.toLowerCase()) ||
              (n.description && n.description.toLowerCase().includes(filterText.toLowerCase()))
          );

          return (
            <div
              key={col.key}
              className="flex-1 flex flex-col min-w-[200px] max-w-[260px] z-20 max-h-[calc(100vh-140px)] bg-surface/40 border border-border/60 rounded-xl p-3 shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2 px-1 shrink-0">
                <span className="font-mono text-xs font-semibold tracking-wider text-ink-secondary">
                  {col.label}
                </span>
                <span className="text-[10px] font-mono text-ink-tertiary">
                  {colNodes.length} / {nodes.filter(col.match).length}
                </span>
              </div>

              {/* Wazuh Only Toggle for Plugins */}
              {col.key === 'plugin' && (
                <div className="flex border border-border rounded p-0.5 mb-2 bg-canvas text-[10px] shrink-0 font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setWazuhOnlyPlugins(true);
                      setTimeout(updatePositions, 50);
                    }}
                    className={`flex-1 py-0.5 px-1 rounded transition-all flex items-center justify-center gap-1 ${
                      wazuhOnlyPlugins
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-ink-tertiary hover:text-ink-primary'
                    }`}
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-sky-400" />
                    <span>Wazuh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWazuhOnlyPlugins(false);
                      setTimeout(updatePositions, 50);
                    }}
                    className={`flex-1 py-0.5 px-1 rounded transition-all ${
                      !wazuhOnlyPlugins
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-ink-tertiary hover:text-ink-primary'
                    }`}
                  >
                    All
                  </button>
                </div>
              )}

              {/* Column Search Filter if > 4 items */}
              {rawColNodes.length > 4 && (
                <div className="relative mb-2 shrink-0">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-ink-tertiary" />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                    className="w-full bg-canvas text-[11px] text-ink-primary pl-6 pr-2 py-1 rounded border border-border/80 outline-none focus:border-white"
                  />
                </div>
              )}

              {/* Scrollable Node Cards Container */}
              <div
                onScroll={updatePositions}
                className="flex-1 overflow-y-auto space-y-2 pr-1"
              >
                {colNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isConnected =
                    activeNodeId !== null &&
                    edges.some(
                      (e) =>
                        (e.source === activeNodeId && e.target === node.id) ||
                        (e.target === activeNodeId && e.source === node.id)
                    );

                  const typeStyle = TYPE_STYLES[node.type] ?? {
                    badgeBg: 'bg-white/5',
                    badgeText: 'text-ink-tertiary',
                    borderColor: 'border-border',
                  };

                  return (
                    <div
                      key={node.id}
                      ref={(el) => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else nodeRefs.current.delete(node.id);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => onSelectNode(node)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-white/15 border-white shadow-lg text-white'
                          : isHovered || isConnected
                          ? 'bg-surface-raised border-white/40 text-white'
                          : 'bg-surface border-border hover:border-border-strong text-ink-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-semibold tracking-tight truncate pr-1">
                          {node.label}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase shrink-0 font-semibold border ${typeStyle.badgeBg} ${typeStyle.badgeText} ${typeStyle.borderColor}`}
                        >
                          {node.type}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-ink-tertiary truncate">
                        {node.file_path ?? node.package}
                      </div>
                    </div>
                  );
                })}

                {colNodes.length === 0 && (
                  <div className="text-[11px] text-ink-tertiary text-center py-6">
                    No items match filter.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
