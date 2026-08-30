import React from 'react';
import { X, FileCode, ArrowDownRight, ArrowUpRight, ShieldCheck, ExternalLink } from 'lucide-react';
import type { BrainNode, BrainEdge, BrainRule } from '../types.js';

interface NodeDrawerProps {
  node: BrainNode | null;
  edges: BrainEdge[];
  rules: BrainRule[];
  onClose: () => void;
  onSelectNodeById: (nodeId: string) => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  node,
  edges,
  rules,
  onClose,
  onSelectNodeById,
}) => {
  if (!node) return null;

  const inboundEdges = edges.filter((e) => e.target === node.id);
  const outboundEdges = edges.filter((e) => e.source === node.id);
  const associatedRules = rules.filter(
    (r) =>
      r.title.toLowerCase().includes(node.id.toLowerCase()) ||
      r.category.toLowerCase().includes(node.id.toLowerCase()) ||
      r.body.toLowerCase().includes(node.id.toLowerCase())
  );

  return (
    <div className="w-80 border-l border-border bg-surface flex flex-col h-full shrink-0 select-none z-30 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between bg-surface-raised/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white uppercase font-semibold">
              {node.type}
            </span>
            <span className="text-xs font-mono text-ink-tertiary">{node.package}</span>
          </div>
          <h2 className="text-sm font-semibold text-white tracking-tight">{node.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-ink-tertiary hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* File Path */}
        {node.file_path && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
              Source file
            </span>
            <div className="flex items-center gap-1.5 p-2 bg-canvas rounded border border-border font-mono text-[11px] text-ink-secondary">
              <FileCode className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
              <span className="truncate">{node.file_path}</span>
            </div>
          </div>
        )}

        {/* Description */}
        {node.description && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
              Description
            </span>
            <p className="text-ink-secondary leading-relaxed font-sans">{node.description}</p>
          </div>
        )}

        {/* Outbound Connections */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-sky-400" />
              <span>Invokes ({outboundEdges.length})</span>
            </div>
          </div>
          <div className="space-y-1">
            {outboundEdges.map((e) => (
              <div
                key={e.id}
                onClick={() => onSelectNodeById(e.target)}
                className="p-2 bg-canvas hover:bg-white/[0.04] border border-border rounded flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="font-mono text-ink-primary font-medium">{e.target}</span>
                <span className="text-[10px] font-mono text-ink-tertiary uppercase">{e.type}</span>
              </div>
            ))}
            {outboundEdges.length === 0 && (
              <div className="text-[11px] text-ink-tertiary italic p-1">No outbound dependencies.</div>
            )}
          </div>
        </div>

        {/* Inbound Connections */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
            <div className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-emerald-400" />
              <span>Invoked by ({inboundEdges.length})</span>
            </div>
          </div>
          <div className="space-y-1">
            {inboundEdges.map((e) => (
              <div
                key={e.id}
                onClick={() => onSelectNodeById(e.source)}
                className="p-2 bg-canvas hover:bg-white/[0.04] border border-border rounded flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="font-mono text-ink-primary font-medium">{e.source}</span>
                <span className="text-[10px] font-mono text-ink-tertiary uppercase">{e.type}</span>
              </div>
            ))}
            {inboundEdges.length === 0 && (
              <div className="text-[11px] text-ink-tertiary italic p-1">No incoming callers.</div>
            )}
          </div>
        </div>

        {/* Associated Invariants */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Associated rules ({associatedRules.length})</span>
          </div>
          <div className="space-y-1">
            {associatedRules.map((r) => (
              <div key={r.id} className="p-2 bg-canvas border border-border rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-ink-primary">{r.id}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-ink-tertiary">
                    {r.severity}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary">{r.title}</div>
              </div>
            ))}
            {associatedRules.length === 0 && (
              <div className="text-[11px] text-ink-tertiary italic p-1">No direct rule invariants linked.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
