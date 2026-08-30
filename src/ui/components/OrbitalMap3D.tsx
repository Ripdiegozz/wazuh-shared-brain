import React, { useEffect, useRef } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
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
  daemon: '#3b82f6',
  agent: '#10b981',
  decoder: '#8b5cf6',
  plugin: '#f59e0b',
  hook: '#ec4899',
  skill: '#06b6d4',
  reference: '#64748b',
};

export const OrbitalMap3D: React.FC<OrbitalMap3DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const graphData: { nodes: GraphNodeObject[]; links: GraphLinkObject[] } = {
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.label,
      type: n.type,
      package: n.package,
      val: n.type === 'daemon' ? 8 : 5,
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

  useEffect(() => {
    if (fgRef.current && selectedNode) {
      const node = graphData.nodes.find((n) => n.id === selectedNode.id);
      if (node) {
        // Center camera on node
        const distance = 120;
        const distRatio = 1 + distance / Math.hypot(node.val, node.val, node.val);
        fgRef.current.cameraPosition(
          { x: node.val * distRatio, y: node.val * distRatio, z: node.val * distRatio },
          { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
          1500
        );
      }
    }
  }, [selectedNode]);

  return (
    <div className="flex-1 h-full w-full bg-canvas relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 bg-surface/80 backdrop-blur border border-border rounded p-3 text-xs space-y-1 select-none pointer-events-none">
        <div className="font-semibold text-ink-primary">3D Orbital Graph</div>
        <div className="text-[11px] text-ink-tertiary">
          Left-click: Rotate • Right-click: Pan • Scroll: Zoom • Click node: Inspect
        </div>
      </div>

      <ForceGraph3D
        ref={fgRef}
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
        linkOpacity={0.3}
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
    </div>
  );
};
