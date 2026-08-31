import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import * as THREE from 'three';
import { Globe, RefreshCw } from 'lucide-react';
import type { BrainNode, BrainEdge } from '../types.js';

// Polyfill determinantAffine for Three.js >= 0.170 compatibility with three-render-objects
interface Matrix4Extended extends THREE.Matrix4 {
  determinantAffine?: () => number;
}

if (typeof (THREE.Matrix4.prototype as Matrix4Extended).determinantAffine === 'undefined') {
  (THREE.Matrix4.prototype as Matrix4Extended).determinantAffine = function (this: THREE.Matrix4): number {
    const te = this.elements;
    return (
      (te[0] ?? 1) * ((te[5] ?? 1) * (te[10] ?? 1) - (te[6] ?? 0) * (te[9] ?? 0)) -
      (te[1] ?? 0) * ((te[4] ?? 0) * (te[10] ?? 1) - (te[6] ?? 0) * (te[8] ?? 0)) +
      (te[2] ?? 0) * ((te[4] ?? 0) * (te[9] ?? 0) - (te[5] ?? 1) * (te[8] ?? 0))
    );
  };
}

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
  daemon: '#94a3b8',
  decoder: '#8b5cf6',
};

function createTextSprite(text: string, color = '#ffffff'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(32, 8, 1);
  return sprite;
}

export const OrbitalMap3D: React.FC<OrbitalMap3DProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fg3dRef = useRef<ForceGraphMethods | undefined>(undefined);
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

  // Filter links to strictly include nodes that exist in the current nodes array
  const graphData = useMemo(() => {
    const nodeMap = new Map<string, BrainNode>();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    const graphNodes: GraphNodeObject[] = nodes.map((n) => {
      const isHub = n.id === 'wazuh' || n.id === 'wazuh-app';
      return {
        id: n.id,
        name: n.label,
        type: n.type,
        package: n.package,
        val: isHub ? 16 : n.type === 'skill' ? 10 : n.type === 'agent' ? 9 : n.type === 'tool' ? 7 : 6,
        color: isHub ? '#38bdf8' : TYPE_COLORS[n.type] ?? '#94a3b8',
        raw: n,
      };
    });

    // Exclude dangling edges that break D3 force simulation
    const graphLinks: GraphLinkObject[] = [];
    for (const e of edges) {
      if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
        graphLinks.push({
          source: e.source,
          target: e.target,
          type: e.type,
          color: e.type === 'OVERRIDES' ? '#f59e0b' : 'rgba(255, 255, 255, 0.25)',
        });
      }
    }

    return {
      nodes: graphNodes,
      links: graphLinks,
    };
  }, [nodes, edges]);

  // Center camera on selected node in 3D
  useEffect(() => {
    if (fg3dRef.current && selectedNode && renderMode === '3d') {
      const node = graphData.nodes.find((n) => n.id === selectedNode.id);
      if (node && typeof node.x === 'number') {
        const distance = 160;
        const distRatio = 1 + distance / Math.hypot(node.val, node.val, node.val);
        fg3dRef.current.cameraPosition(
          { x: node.val * distRatio, y: node.val * distRatio, z: node.val * distRatio },
          { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
          1200
        );
      }
    }
  }, [selectedNode, renderMode, graphData]);

  // Initial 3D camera setup
  useEffect(() => {
    if (fg3dRef.current && renderMode === '3d') {
      fg3dRef.current.cameraPosition({ x: 0, y: 0, z: 280 }, { x: 0, y: 0, z: 0 }, 800);
    }
  }, [renderMode]);

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
          {graphData.nodes.length} Nodes • {graphData.links.length} Links • Drag: Orbit/Pan • Scroll: Zoom • Click: Inspect
        </div>
      </div>

      {/* Graph Renderer */}
      {dimensions.width > 0 && dimensions.height > 0 ? (
        renderMode === '3d' ? (
          <ForceGraph3D
            ref={fg3dRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0A0A0A"
            warmupTicks={60}
            cooldownTicks={120}
            d3VelocityDecay={0.25}
            nodeThreeObject={(node) => {
              const gn = node as GraphNodeObject;
              const isSelected = selectedNode?.id === gn.id;
              const isHub = gn.id === 'wazuh' || gn.id === 'wazuh-app';
              const r = isHub ? 8 : (gn.val ?? 6) * 0.7;

              const group = new THREE.Group();

              // 1. Core Sphere Mesh (Self-illuminating Basic Material so never black)
              const geometry = new THREE.SphereGeometry(r, 16, 16);
              const material = new THREE.MeshBasicMaterial({
                color: isSelected ? 0xffffff : gn.color,
              });
              const sphere = new THREE.Mesh(geometry, material);
              group.add(sphere);

              // 2. Outer Halo Ring if selected or hub
              if (isSelected || isHub) {
                const haloGeo = new THREE.SphereGeometry(r + 1.5, 12, 12);
                const haloMat = new THREE.MeshBasicMaterial({
                  color: isSelected ? 0x38bdf8 : 0xffffff,
                  wireframe: true,
                  transparent: true,
                  opacity: 0.35,
                });
                const halo = new THREE.Mesh(haloGeo, haloMat);
                group.add(halo);
              }

              // 3. Floating 3D Text Sprite
              const sprite = createTextSprite(gn.name, isSelected ? '#38bdf8' : '#e2e8f0');
              sprite.position.set(0, r + 4, 0);
              group.add(sprite);

              return group;
            }}
            linkOpacity={0.4}
            linkWidth={(link) => ((link as GraphLinkObject).type === 'OVERRIDES' ? 2.5 : 1.2)}
            linkColor={() => 'rgba(255, 255, 255, 0.3)'}
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
            d3VelocityDecay={0.2}
            warmupTicks={70}
            cooldownTicks={140}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const gn = node as GraphNodeObject;
              const isSelected = selectedNode?.id === gn.id;
              const isHub = gn.id === 'wazuh' || gn.id === 'wazuh-app';
              const r = isHub ? 12 : (gn.val ?? 6) * 1.3;
              const x = gn.x ?? 0;
              const y = gn.y ?? 0;

              // Draw outer glow ring if selected or hub
              if (isSelected || isHub) {
                ctx.beginPath();
                ctx.arc(x, y, r + 5, 0, 2 * Math.PI, false);
                ctx.fillStyle = isHub ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.2)';
                ctx.fill();
              }

              // Draw node body
              ctx.beginPath();
              ctx.arc(x, y, r, 0, 2 * Math.PI, false);
              ctx.fillStyle = isSelected ? '#ffffff' : gn.color;
              ctx.fill();
              ctx.lineWidth = isSelected ? 2.5 : 1;
              ctx.strokeStyle = isSelected ? '#38bdf8' : isHub ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
              ctx.stroke();

              // Draw label text below node
              const label = gn.name;
              const fontSize = Math.max(11 / globalScale, 4);
              ctx.font = `${isHub ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = isSelected ? '#38bdf8' : isHub ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
              ctx.fillText(label, x, y + r + 3);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const gn = node as GraphNodeObject;
              const r = (gn.val ?? 6) * 1.5 + 4;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(gn.x ?? 0, gn.y ?? 0, r, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            linkColor={() => 'rgba(255, 255, 255, 0.25)'}
            linkWidth={(link) => ((link as GraphLinkObject).type === 'OVERRIDES' ? 2 : 1)}
            linkDirectionalArrowLength={4.5}
            linkDirectionalArrowRelPos={0.95}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={(node) => {
              const gn = node as GraphNodeObject;
              if (gn.raw) onSelectNode(gn.raw);
            }}
          />
        )
      ) : (
        <div className="flex items-center gap-2 text-xs text-ink-tertiary font-mono">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Initializing orbital topology physics...</span>
        </div>
      )}
    </div>
  );
};
