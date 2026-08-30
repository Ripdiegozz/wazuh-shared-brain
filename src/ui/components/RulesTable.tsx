import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, ChevronRight, ChevronDown } from 'lucide-react';
import type { BrainRule } from '../types.js';

interface RulesTableProps {
  rules: BrainRule[];
  searchQuery: string;
}

export const RulesTable: React.FC<RulesTableProps> = ({ rules, searchQuery }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const filteredRules = rules.filter((r) => {
    if (selectedSeverity !== 'ALL' && r.severity !== selectedSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        (r.origin && r.origin.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: 'HARD' | 'WARN' | 'TIP') => {
    switch (severity) {
      case 'HARD':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3" /> HARD
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
      case 'TIP':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Info className="w-3 h-3" /> TIP
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
      {/* Table Header & Severity Filters */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-primary">Filter severity:</span>
          {(['ALL', 'HARD', 'WARN', 'TIP'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`text-xs px-2.5 py-1 rounded font-medium border transition-all ${
                selectedSeverity === sev
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-transparent text-ink-secondary border-border hover:border-border-strong hover:text-ink-primary'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <div className="text-xs text-ink-secondary font-mono">
          Showing {filteredRules.length} of {rules.length} rules
        </div>
      </div>

      {/* Rules Data Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-surface text-ink-secondary border-b border-border font-mono text-[11px]">
            <tr>
              <th className="py-2.5 px-4 w-12"></th>
              <th className="py-2.5 px-3 w-28">ID</th>
              <th className="py-2.5 px-3 w-28">SEVERITY</th>
              <th className="py-2.5 px-3 w-40">CATEGORY</th>
              <th className="py-2.5 px-4">RULE TITLE & SPECIFICATION</th>
              <th className="py-2.5 px-4 w-44">ORIGIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-sans">
            {filteredRules.map((rule) => {
              const isExpanded = expandedRuleId === rule.id;
              return (
                <React.Fragment key={rule.id}>
                  <tr
                    onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-3 px-4 text-ink-tertiary">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-ink-primary">
                      {rule.id}
                    </td>
                    <td className="py-3 px-3">{getSeverityBadge(rule.severity)}</td>
                    <td className="py-3 px-3 text-ink-secondary font-mono text-[11px]">
                      {rule.category}
                    </td>
                    <td className="py-3 px-4 text-ink-primary font-medium">
                      {rule.title}
                    </td>
                    <td className="py-3 px-4 text-ink-tertiary font-mono text-[11px]">
                      {rule.origin ?? '—'}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="bg-surface/80 border-b border-border">
                      <td colSpan={6} className="p-4 pl-12">
                        <div className="bg-canvas border border-border rounded p-3.5 space-y-2 text-ink-secondary font-mono text-xs leading-relaxed">
                          <div className="text-ink-primary font-semibold text-xs border-b border-border pb-1 mb-2 font-sans">
                            Detailed Invariant Body
                          </div>
                          <p className="text-ink-primary whitespace-pre-wrap">{rule.body}</p>
                          {rule.overrides && (
                            <div className="text-[11px] text-amber-400 pt-2 border-t border-border/40">
                              ⚠️ Overrides predecessor: {rule.overrides}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {filteredRules.length === 0 && (
          <div className="py-16 text-center text-ink-tertiary text-xs">
            No rules match the selected filter or search query.
          </div>
        )}
      </div>
    </div>
  );
};
