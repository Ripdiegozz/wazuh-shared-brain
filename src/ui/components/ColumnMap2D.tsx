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

  // Group nodes by category columns
  const categories = [
    { key: 'daemon', label: 'DAEMONS', match: (n: BrainNode) => n.type === 'daemon' },
    { key: 'agent', label: 'AGENTS', match: (n: BrainNode) => n.type === 'agent' },
    { key: 'decoder', label: 'DECODERS', match: (n: BrainNode) => n.type === 'decoder' },
    { key: 'plugin', label: 'PLUGINS', match: (n: BrainNode) => n.type === 'plugin' },
    { key: 'other', label: 'COMPONENTS', match: (n: BrainNode) => !['daemon', 'agent', 'decoder', 'plugin'].includes(n.type) },
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
          <span className="font-semibold text-ink-primary">2D Hierarchical Flow:</span> Hover or click a node to highlight its dependency chain.
        </div>
        <div className="font-mono text-[11px] text-ink-tertiary">
          {nodes.length} Nodes • {edges.length} Connections
        </div>
      </div>

      {/* Main Column Layout Container */}
      <div
        ref={containerRef}
        onScroll={updatePositions}
        className="flex-1 overflow-x-auto overflow-y-hidden p-6 relative flex gap-8 justify-around min-w-[900px]"
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
                  opacity={isDimmed ? 0.05 : isHighlighted ? 1 : 0.4}
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
              className="flex-1 flex flex-col min-w-[210px] max-w-[280px] z-20 max-h-[calc(100vh-140px)] bg-surface/40 border border-border/60 rounded-xl p-3 shadow-sm"
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
                    <span>Wazuh Only</span>
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

              {/* Column Search Filter if > 5 items */}
              {rawColNodes.length > 5 && (
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

                  const isWazuhNode = WAZUH_KEYWORDS.some(
                    (kw) =>
                      node.id.toLowerCase().includes(kw) ||
                      node.label.toLowerCase().includes(kw) ||
                      node.package.toLowerCase().includes(kw)
                  );

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
                        <div className="flex items-center gap-1 truncate pr-1">
                          {isWazuhNode && col.key === 'plugin' && (
                            <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                          )}
                          <span className="font-mono text-[11px] font-semibold tracking-tight truncate">
                            {node.label}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-ink-tertiary uppercase shrink-0">
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
