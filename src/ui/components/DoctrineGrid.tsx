import React from 'react';
import { ExternalLink, Calendar, Layers } from 'lucide-react';
import type { BrainDoctrine } from '../types.js';

interface DoctrineGridProps {
  doctrines: BrainDoctrine[];
  searchQuery: string;
}

export const DoctrineGrid: React.FC<DoctrineGridProps> = ({ doctrines, searchQuery }) => {
  const filtered = doctrines.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        (d.scope && d.scope.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/50">
        <div>
          <h2 className="text-xs font-semibold text-ink-primary">Architectural Doctrine</h2>
          <p className="text-[11px] text-ink-tertiary">
            Consensus decisions, technical precedents, and immutable system invariants.
          </p>
        </div>
        <div className="text-xs text-ink-secondary font-mono">
          {filtered.length} active directives
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-surface border border-border hover:border-border-strong rounded-lg p-4 flex flex-col justify-between transition-all group"
            >
              <div className="space-y-2.5">
                {/* Meta Top Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    {doc.status}
                  </span>
                  <div className="flex items-center gap-1 text-ink-tertiary">
                    <Calendar className="w-3 h-3" />
                    <span>{doc.date}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-ink-primary leading-snug group-hover:text-white transition-colors">
                  {doc.title}
                </h3>

                {/* Scope */}
                {doc.scope && (
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary font-mono">
                    <Layers className="w-3 h-3 text-ink-tertiary shrink-0" />
                    <span className="truncate">Scope: {doc.scope}</span>
                  </div>
                )}

                {/* Body Text */}
                <p className="text-xs text-ink-secondary leading-relaxed line-clamp-4 pt-1 border-t border-border/40">
                  {doc.body}
                </p>
              </div>

              {/* Bottom Actions */}
              {doc.thread_ref && (
                <div className="pt-3 mt-3 border-t border-border/30 flex justify-end">
                  <a
                    href={doc.thread_ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-tertiary hover:text-ink-primary transition-colors"
                  >
                    <span>Thread / RFC</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-ink-tertiary text-xs">
            No doctrine matches your search query.
          </div>
        )}
      </div>
    </div>
  );
};
