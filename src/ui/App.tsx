import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar, type TabId } from './components/Sidebar.js';
import { ColumnMap2D } from './components/ColumnMap2D.js';
import { RulesTable } from './components/RulesTable.js';
import { DoctrineGrid } from './components/DoctrineGrid.js';
import { OrbitalMap3D } from './components/OrbitalMap3D.js';
import { TerminalInspector } from './components/TerminalInspector.js';
import { NodeDrawer } from './components/NodeDrawer.js';
import type {
  BrainNode,
  BrainEdge,
  BrainRule,
  BrainDoctrine,
  BrainVersion,
  BrainPlugin,
} from './types.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [versions, setVersions] = useState<BrainVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('v4.8');
  const [plugins, setPlugins] = useState<BrainPlugin[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>(['threat-intel']);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [nodes, setNodes] = useState<BrainNode[]>([]);
  const [edges, setEdges] = useState<BrainEdge[]>([]);
  const [rules, setRules] = useState<BrainRule[]>([]);
  const [doctrines, setDoctrines] = useState<BrainDoctrine[]>([]);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);

  // 1. Fetch versions and plugins
  useEffect(() => {
    fetch('/api/versions')
      .then((res) => res.json())
      .then((data: { versions: BrainVersion[]; plugins: BrainPlugin[] }) => {
        if (Array.isArray(data.versions) && data.versions.length > 0) {
          setVersions(data.versions);
          if (!data.versions.some((v) => v.id === selectedVersion)) {
            setSelectedVersion(data.versions[0]?.id ?? 'v4.8');
          }
        }
        if (Array.isArray(data.plugins)) {
          setPlugins(data.plugins);
        }
      })
      .catch((err) => console.error('Failed to fetch versions:', err));
  }, []);

  // 2. Fetch graph, rules, and doctrine when version or plugins change
  useEffect(() => {
    // Fetch graph
    fetch(`/api/graph?version=${selectedVersion}`)
      .then((res) => res.json())
      .then((data: { nodes: BrainNode[]; edges: BrainEdge[] }) => {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      })
      .catch((err) => console.error('Failed to fetch graph:', err));

    // Fetch rules
    fetch(`/api/rules?version=${selectedVersion}`)
      .then((res) => res.json())
      .then((data: { rules: BrainRule[] }) => {
        setRules(data.rules ?? []);
      })
      .catch((err) => console.error('Failed to fetch rules:', err));

    // Fetch doctrine
    fetch(`/api/doctrine?version=${selectedVersion}`)
      .then((res) => res.json())
      .then((data: { doctrines: BrainDoctrine[] }) => {
        setDoctrines(data.doctrines ?? []);
      })
      .catch((err) => console.error('Failed to fetch doctrine:', err));
  }, [selectedVersion, selectedPlugins]);

  const handleTogglePlugin = (pluginId: string) => {
    setSelectedPlugins((prev) =>
      prev.includes(pluginId) ? prev.filter((p) => p !== pluginId) : [...prev, pluginId]
    );
  };

  const handleSelectNodeById = (nodeId: string) => {
    const found = nodes.find((n) => n.id === nodeId);
    if (found) setSelectedNode(found);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-ink-primary select-none">
      {/* Top Header Navbar */}
      <Navbar
        versions={versions}
        selectedVersion={selectedVersion}
        onSelectVersion={setSelectedVersion}
        plugins={plugins}
        selectedPlugins={selectedPlugins}
        onTogglePlugin={handleTogglePlugin}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={{
          nodesCount: nodes.length,
          edgesCount: edges.length,
          rulesCount: rules.length,
          doctrineCount: doctrines.length,
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
          }}
          counts={{
            rules: rules.length,
            doctrine: doctrines.length,
            nodes: nodes.length,
          }}
        />

        {/* Center Canvas View */}
        <main className="flex-1 flex overflow-hidden relative">
          {activeTab === 'map' && (
            <ColumnMap2D
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {activeTab === 'rules' && (
            <RulesTable rules={rules} searchQuery={searchQuery} />
          )}

          {activeTab === 'doctrine' && (
            <DoctrineGrid doctrines={doctrines} searchQuery={searchQuery} />
          )}

          {activeTab === 'orbital' && (
            <OrbitalMap3D
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {activeTab === 'query' && (
            <TerminalInspector selectedVersion={selectedVersion} />
          )}
        </main>

        {/* Right Drawer Inspector */}
        <NodeDrawer
          node={selectedNode}
          edges={edges}
          rules={rules}
          onClose={() => setSelectedNode(null)}
          onSelectNodeById={handleSelectNodeById}
        />
      </div>
    </div>
  );
};
