import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { Globe, RefreshCw, Box } from 'lucide-react';
import type { BrainNode, BrainEdge } from '../types.js';

interface OrbitalMap3DProps {
  nodes: BrainNode[];
  edges: BrainEdge[];
  selectedNode: BrainNode | null;
  onSelectNode: (node: BrainNode) => void;
}

interface GraphNodeObject {
  id: string;
  name: string;
  type: string;
  package: string;
  val: number;
  color: string;
  raw: BrainNode;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLinkObject {
  source: string;
  target: string;
  type: string;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  skill: '#3b82f6',
  agent: '#10b981',
  tool: '#f59e0b',
  hook: '#f43f5e',
  reference: '#a855f7',
  plugin: '#0ea5e9',
  service: '#06b6d4',
  daemon: '#64748b',
  decoder: '#8b5cf6',
};

export const OrbitalMap3D: React.FC<OrbitalMap3DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Measure container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((n): GraphNodeObject => ({
        id: n.id,
        name: n.label,
        type: n.type,
        package: n.package,
        val: n.type === 'skill' ? 8 : n.type === 'agent' ? 7 : 5,
        color: TYPE_COLORS[n.type] ?? '#94a3b8',
        raw: n,
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        color: e.type === 'OVERRIDES' ? '#f59e0b' : 'rgba(255,255,255,0.2)',
      })),
    };
  }, [nodes, edges]);

  useEffect(() => {
    if (fgRef.current && selectedNode && renderMode === '3d') {
      const node = graphData.nodes.find((n) => n.id === selectedNode.id);
      if (node) {
        const distance = 140;
        const distRatio = 1 + distance / Math.hypot(node.val, node.val, node.val);
        fgRef.current.cameraPosition(
          { x: node.val * distRatio, y: node.val * distRatio, z: node.val * distRatio },
          { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
          1500
        );
      }
    }
  }, [selectedNode, renderMode, graphData]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full bg-canvas relative overflow-hidden flex items-center justify-center select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 bg-surface/90 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-2 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-ink-primary">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive Node Topology</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex border border-border rounded bg-canvas p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setRenderMode('3d')}
              className={`px-2 py-0.5 rounded transition-all ${
                renderMode === '3d'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              3D Sphere
            </button>
            <button
              onClick={() => setRenderMode('2d')}
              className={`px-2 py-0.5 rounded transition-all ${
                renderMode === '2d'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              2D Orbit
            </button>
          </div>
        </div>

        <div className="text-[11px] text-ink-tertiary font-mono">
          {nodes.length} Nodes • {edges.length} Links • Left-click: Orbit • Scroll: Zoom • Click node: Inspect
        </div>
      </div>

      {/* Graph Renderer (Render only when dimensions > 0) */}
      {dimensions.width > 0 && dimensions.height > 0 ? (
        renderMode === '3d' ? (
          <ForceGraph3D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0A0A0A"
            nodeLabel={(node) => {
              const gn = node as GraphNodeObject;
              return `${gn.name} (${gn.type})`;
            }}
            nodeColor={(node) => {
              const gn = node as GraphNodeObject;
              return selectedNode?.id === gn.id ? '#ffffff' : gn.color;
            }}
            nodeResolution={16}
            linkOpacity={0.35}
            linkWidth={(link) => {
              const gl = link as GraphLinkObject;
              return gl.type === 'OVERRIDES' ? 2 : 1;
            }}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={(node) => {
              const gn = node as GraphNodeObject;
              if (gn.raw) onSelectNode(gn.raw);
            }}
          />
        ) : (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0A0A0A"
            nodeLabel={(node) => {
              const gn = node as GraphNodeObject;
              return `${gn.name} (${gn.type})`;
            }}
            nodeColor={(node) => {
              const gn = node as GraphNodeObject;
              return selectedNode?.id === gn.id ? '#ffffff' : gn.color;
            }}
            nodeRelSize={6}
            linkColor={() => 'rgba(255, 255, 255, 0.2)'}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.006}
            onNodeClick={(node) => {
              const gn = node as GraphNodeObject;
              if (gn.raw) onSelectNode(gn.raw);
            }}
          />
        )
      ) : (
        <div className="flex items-center gap-2 text-xs text-ink-tertiary font-mono">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Initializing orbital canvas dimensions...</span>
        </div>
      )}
    </div>
  );
};
