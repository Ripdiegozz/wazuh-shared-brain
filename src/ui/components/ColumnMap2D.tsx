import React, { useState, useEffect, useRef } from 'react';
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

export const ColumnMap2D: React.FC<ColumnMap2DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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
  const updatePositions = () => {
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
  };

  useEffect(() => {
    updatePositions();
    const timeout = setTimeout(updatePositions, 100);
    window.addEventListener('resize', updatePositions);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePositions);
    };
  }, [nodes, edges]);

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
        className="flex-1 overflow-auto p-8 relative flex gap-12 justify-around min-w-[900px]"
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
          const colNodes = nodes.filter(col.match);
          if (colNodes.length === 0) return null;

          return (
            <div key={col.key} className="flex-1 flex flex-col gap-3 min-w-[160px] max-w-[240px] z-20">
              <div className="flex items-center justify-between border-b border-border/80 pb-1.5 px-1">
                <span className="font-mono text-xs font-semibold tracking-wider text-ink-secondary">
                  {col.label}
                </span>
                <span className="text-[10px] font-mono text-ink-tertiary">
                  {colNodes.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
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
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-white/15 border-white shadow-lg text-white'
                          : isHovered || isConnected
                          ? 'bg-surface-raised border-white/40 text-white'
                          : 'bg-surface border-border hover:border-border-strong text-ink-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-semibold tracking-tight truncate">
                          {node.label}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-ink-tertiary uppercase">
                          {node.type}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-ink-tertiary truncate">
                        {node.file_path ?? node.package}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
