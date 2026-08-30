import React, { useState } from 'react';
import { X, FolderSearch, Globe, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_WAZUH_REPOS } from '../../ingest/github.js';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface IngestSummary {
  pluginsDiscovered: number;
  versionsDetected: string[];
  nodesGenerated: number;
  connectionsGenerated: number;
}

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [localDir, setLocalDir] = useState<string>('../');
  const [githubOrg, setGithubOrg] = useState<string>('wazuh');
  const [selectedRepos, setSelectedRepos] = useState<string[]>(DEFAULT_WAZUH_REPOS);
  const [githubToken, setGithubToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleRepo = (repo: string) => {
    setSelectedRepos((prev) =>
      prev.includes(repo) ? prev.filter((r) => r !== repo) : [...prev, repo]
    );
  };

  const handleRunIngest = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const payload =
        mode === 'local'
          ? { localDir }
          : {
              remote: true,
              githubOrg,
              repositories: selectedRepos,
              githubToken: githubToken || undefined,
            };

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok: boolean; summary?: IngestSummary; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Ingestion failed on server');
      }

      setSummary(data.summary ?? null);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Ingest & Scrape Wazuh Plugins
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-tertiary hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border text-xs bg-canvas">
          <button
            onClick={() => setMode('local')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-medium border-b-2 transition-all ${
              mode === 'local'
                ? 'border-white text-white bg-white/[0.04]'
                : 'border-transparent text-ink-tertiary hover:text-ink-primary'
            }`}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>Local Directory Discovery</span>
          </button>
          <button
            onClick={() => setMode('remote')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-medium border-b-2 transition-all ${
              mode === 'remote'
                ? 'border-white text-white bg-white/[0.04]'
                : 'border-transparent text-ink-tertiary hover:text-ink-primary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Remote GitHub Harvester</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {mode === 'local' ? (
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-ink-tertiary font-semibold">
                Local directory to scan
              </label>
              <input
                type="text"
                value={localDir}
                onChange={(e) => setLocalDir(e.target.value)}
                placeholder="../ or C:/Users/.../Wazuh"
                className="w-full bg-canvas text-xs text-ink-primary p-2.5 rounded border border-border focus:border-white outline-none font-mono"
              />
              <p className="text-[11px] text-ink-tertiary leading-relaxed">
                Recursively scans all subfolders for <code>opensearch_dashboards.json</code> and <code>package.json</code> to build the plugin DAG.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-ink-tertiary font-semibold">
                  GitHub Organization / Owner
                </label>
                <input
                  type="text"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                  className="w-full bg-canvas text-xs text-ink-primary p-2 rounded border border-border focus:border-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-ink-tertiary font-semibold">
                  Target Repositories
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {DEFAULT_WAZUH_REPOS.map((repo) => {
                    const active = selectedRepos.includes(repo);
                    return (
                      <button
                        key={repo}
                        type="button"
                        onClick={() => handleToggleRepo(repo)}
                        className={`text-[11px] font-mono px-2 py-1 rounded border transition-all ${
                          active
                            ? 'bg-white/10 text-white border-white/40'
                            : 'bg-canvas text-ink-tertiary border-border hover:border-border-strong'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {repo}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-mono uppercase text-ink-tertiary font-semibold">
                  GitHub Token (Optional, for higher rate limits)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-canvas text-xs text-ink-primary p-2 rounded border border-border focus:border-white outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Feedback & Summary */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded flex items-center gap-2 text-rose-400 font-mono text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded space-y-1 font-mono text-[11px] text-emerald-400">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ingestion & Auto-Compile Successful</span>
              </div>
              <div>• Discovered: {summary.pluginsDiscovered} plugins</div>
              <div>• Nodes generated: {summary.nodesGenerated}</div>
              <div>• Connections generated: {summary.connectionsGenerated}</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-ink-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleRunIngest}
            disabled={loading}
            className="px-4 py-1.5 bg-white text-black font-semibold text-xs rounded hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{loading ? 'Ingesting...' : 'Start Ingestion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
