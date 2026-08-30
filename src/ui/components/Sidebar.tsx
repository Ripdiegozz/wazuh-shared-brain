import React from 'react';
import { GitFork, Shield, FileText, Globe, Terminal } from 'lucide-react';

export type TabId = 'map' | 'rules' | 'doctrine' | 'orbital' | 'query';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  counts: {
    rules: number;
    doctrine: number;
    nodes: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, counts }) => {
  const items: Array<{ id: TabId; label: string; icon: React.ReactNode; count?: number }> = [
    {
      id: 'map',
      label: 'The map',
      icon: <GitFork className="w-4 h-4" />,
      count: counts.nodes,
    },
    {
      id: 'rules',
      label: 'The rules',
      icon: <Shield className="w-4 h-4" />,
      count: counts.rules,
    },
    {
      id: 'doctrine',
      label: 'The doctrine',
      icon: <FileText className="w-4 h-4" />,
      count: counts.doctrine,
    },
    {
      id: 'orbital',
      label: 'Orbital 3D',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'query',
      label: 'Terminal inspector',
      icon: <Terminal className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col justify-between py-3 select-none shrink-0 z-20">
      <nav className="space-y-0.5 px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-semibold shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-ink-tertiary'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {typeof item.count === 'number' && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-ink-tertiary'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-4 py-2 text-[10px] text-ink-tertiary font-mono border-t border-border/50">
        <div>wazuh-shared-brain v1.0.0</div>
        <div>SQLite WAL • Stdio MCP</div>
      </div>
    </aside>
  );
};
