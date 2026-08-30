import React, { useState } from 'react';
import { Play, Terminal, CheckCircle2, Copy } from 'lucide-react';

interface TerminalInspectorProps {
  selectedVersion: string;
}

export const TerminalInspector: React.FC<TerminalInspectorProps> = ({ selectedVersion }) => {
  const [selectedTool, setSelectedTool] = useState<string>('brain_explore_graph');
  const [targetId, setTargetId] = useState<string>('analysisd');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const toolsList = [
    { id: 'brain_explore_graph', label: 'brain_explore_graph(node_id, version, depth=1)' },
    { id: 'brain_get_rules', label: 'brain_get_rules(version, severity?)' },
    { id: 'brain_get_doctrine', label: 'brain_get_doctrine(version, status=ACTIVE)' },
    { id: 'brain_resolve_context', label: 'brain_resolve_context(component_or_file)' },
  ];

  const handleRunQuery = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (selectedTool === 'brain_explore_graph') {
        endpoint = `/api/graph?version=${selectedVersion}`;
      } else if (selectedTool === 'brain_get_rules') {
        endpoint = `/api/rules?version=${selectedVersion}`;
      } else if (selectedTool === 'brain_get_doctrine') {
        endpoint = `/api/doctrine?version=${selectedVersion}`;
      } else {
        endpoint = `/api/search?q=${targetId}&version=${selectedVersion}`;
      }

      const res = await fetch(endpoint);
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setOutput(JSON.stringify({ error: String(err) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden">
      <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-ink-tertiary" />
          <span className="text-xs font-semibold text-ink-primary">
            Agent MCP Query Inspector (Zero-Context-Bloat Simulator)
          </span>
        </div>
        <span className="text-[11px] font-mono text-ink-tertiary">Stdio / REST Channel</span>
      </div>

      <div className="p-4 space-y-4 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tool Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
              Select Tool
            </label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full bg-surface text-xs text-ink-primary border border-border rounded px-3 py-2 outline-none hover:border-border-strong focus:border-white transition-colors font-mono"
            >
              {toolsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target input */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
              Target ID / Query
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-surface text-xs text-ink-primary border border-border rounded px-3 py-2 outline-none hover:border-border-strong focus:border-white transition-colors font-mono"
              placeholder="e.g. analysisd, WZ-01, Output"
            />
          </div>

          {/* Action button */}
          <div className="flex items-end">
            <button
              onClick={handleRunQuery}
              disabled={loading}
              className="w-full h-[38px] bg-white text-black font-semibold text-xs rounded flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{loading ? 'Executing...' : 'Execute Tool'}</span>
            </button>
          </div>
        </div>

        {/* Output Window */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-ink-tertiary font-semibold">
              Micro-Payload Response (~50-150 tokens)
            </span>
            {output && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-mono text-ink-tertiary hover:text-white transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            )}
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 font-mono text-xs text-ink-primary overflow-auto max-h-[500px]">
            {output ? (
              <pre className="text-ink-secondary">{output}</pre>
            ) : (
              <div className="text-ink-tertiary italic text-center py-12">
                Click &quot;Execute Tool&quot; to inspect micro-payload response for AI agent context.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
