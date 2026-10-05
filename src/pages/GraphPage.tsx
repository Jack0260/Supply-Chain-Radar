import { useState, useMemo, useCallback } from 'react';
import ReactFlow, { Controls, Background, type Node, type Edge, Position, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Server, Package as PackageIcon, Box, Globe, AlertTriangle, Layers } from 'lucide-react';
import { Card, Badge, Spinner, Button } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { calculateBlastRadius } from '@/lib/graph';
import { useRouter } from '@/lib/router';
import type { NodeType } from '@/types';

const NODE_STYLES: Record<NodeType, { bg: string; border: string; icon: typeof Server }> = {
  service: { bg: '#1e40af', border: '#3b82f6', icon: Server },
  package: { bg: '#155e75', border: '#06b6d4', icon: PackageIcon },
  container_image: { bg: '#92400e', border: '#f59e0b', icon: Box },
  environment: { bg: '#14532d', border: '#22c55e', icon: Globe },
  repository: { bg: '#334155', border: '#64748b', icon: Layers },
  application: { bg: '#334155', border: '#64748b', icon: Layers },
  package_version: { bg: '#155e75', border: '#06b6d4', icon: PackageIcon },
};

export function GraphPage() {
  const data = useAppData();
  const { navigate } = useRouter();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);

  const vulnerablePackageIds = useMemo(() => {
    const ids = new Set<string>();
    data.vulnerabilities.forEach((v) => { if (v.package_id) ids.add(v.package_id); });
    return ids;
  }, [data.vulnerabilities]);

  const blastResult = useMemo(() => {
    if (!selectedPackageId) return null;
    return calculateBlastRadius(selectedPackageId, data.edges);
  }, [selectedPackageId, data.edges]);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    const getServiceName = (id: string) => data.services.find((s) => s.id === id)?.name ?? 'Unknown';
    const getPkgName = (id: string) => data.packages.find((p) => p.id === id)?.name ?? 'Unknown';
    const getContainerName = (id: string) => data.containers.find((c) => c.id === id)?.name ?? 'Unknown';
    const getEnvName = (id: string) => data.environments.find((e) => e.id === id)?.name ?? 'Unknown';

    const getLabel = (type: string, id: string) => {
      switch (type) {
        case 'service': return getServiceName(id);
        case 'package': return getPkgName(id);
        case 'container_image': return getContainerName(id);
        case 'environment': return getEnvName(id);
        default: return id.slice(0, 8);
      }
    };

    const affectedIds = blastResult
      ? new Set([
          ...blastResult.affectedServiceIds,
          ...blastResult.affectedContainerIds,
        ])
      : null;

    for (const edge of data.edges) {
      const sourceKey = `${edge.source_type}:${edge.source_id}`;
      const targetKey = `${edge.target_type}:${edge.target_id}`;

      if (!nodeMap.has(sourceKey)) {
        const style = NODE_STYLES[edge.source_type as NodeType] ?? NODE_STYLES.package;
        const isVuln = edge.source_type === 'package' && vulnerablePackageIds.has(edge.source_id);
        const isAffected = affectedIds?.has(edge.source_id);
        nodeMap.set(sourceKey, {
          id: sourceKey,
          type: 'default',
          position: { x: 0, y: 0 },
          data: { label: getLabel(edge.source_type, edge.source_id), entityType: edge.source_type, entityId: edge.source_id },
          style: {
            background: isVuln ? '#7f1d1d' : isAffected ? '#78350f' : style.border + '20',
            border: `2px solid ${isVuln ? '#ef4444' : isAffected ? '#f59e0b' : style.border}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#f1f5f9',
            width: 140,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      if (!nodeMap.has(targetKey)) {
        const style = NODE_STYLES[edge.target_type as NodeType] ?? NODE_STYLES.package;
        const isVuln = edge.target_type === 'package' && vulnerablePackageIds.has(edge.target_id);
        const isAffected = affectedIds?.has(edge.target_id);
        nodeMap.set(targetKey, {
          id: targetKey,
          type: 'default',
          position: { x: 0, y: 0 },
          data: { label: getLabel(edge.target_type, edge.target_id), entityType: edge.target_type, entityId: edge.target_id },
          style: {
            background: isVuln ? '#7f1d1d' : isAffected ? '#78350f' : style.border + '20',
            border: `2px solid ${isVuln ? '#ef4444' : isAffected ? '#f59e0b' : style.border}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#f1f5f9',
            width: 140,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      const isHighlighted = highlightMode && affectedIds && (affectedIds.has(edge.source_id) || affectedIds.has(edge.target_id));
      edgeList.push({
        id: edge.id,
        source: sourceKey,
        target: targetKey,
        label: edge.edge_type.replace(/_/g, ' '),
        animated: isHighlighted ?? false,
        style: {
          stroke: isHighlighted ? '#f59e0b' : '#475569',
          strokeWidth: isHighlighted ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? '#f59e0b' : '#475569' },
        labelStyle: { fontSize: 9, fill: '#94a3b8' },
      });
    }

    // Simple layout: group by type in columns
    const typeOrder: NodeType[] = ['service', 'container_image', 'package', 'environment'];
    const typeCounts: Record<string, number> = {};
    const nodeList = Array.from(nodeMap.values());
    nodeList.forEach((node) => {
      const entityType = node.data.entityType as NodeType;
      const col = typeOrder.indexOf(entityType);
      const x = (col >= 0 ? col : 1) * 280 + 50;
      const count = typeCounts[entityType] ?? 0;
      const y = count * 80 + 50;
      typeCounts[entityType] = count + 1;
      node.position = { x, y };
    });

    return { nodes: nodeList, edges: edgeList };
  }, [data, vulnerablePackageIds, blastResult, highlightMode]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.data.entityType === 'package') {
      setSelectedPackageId(node.data.entityId as string);
      setHighlightMode(true);
    } else {
      setSelectedPackageId(null);
      setHighlightMode(false);
    }
  }, []);

  const vulnerablePackages = useMemo(() => {
    return data.packages.filter((p) => vulnerablePackageIds.has(p.id));
  }, [data.packages, vulnerablePackageIds]);

  if (data.loading) return <div className="p-8"><Spinner /></div>;
  if (data.error) return <div className="p-8 text-danger-500">{data.error}</div>;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Dependency Graph</h1>
          <p className="text-sm text-dark-400 mt-1">Click a package to trace its blast radius</p>
        </div>
        {selectedPackageId && (
          <Button variant="secondary" size="sm" onClick={() => { setSelectedPackageId(null); setHighlightMode(false); }}>
            Clear Selection
          </Button>
        )}
      </div>

      {/* Vulnerable package selector */}
      <div className="flex flex-wrap gap-2">
        {vulnerablePackages.map((pkg) => {
          const vuln = data.vulnerabilities.find((v) => v.package_id === pkg.id);
          const isActive = selectedPackageId === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => { setSelectedPackageId(pkg.id); setHighlightMode(true); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                isActive
                  ? 'bg-danger-500/20 border-danger-500 text-danger-500'
                  : 'bg-dark-100 dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300 hover:border-danger-500/50'
              }`}
            >
              <AlertTriangle size={14} />
              {pkg.name}
              {vuln && <Badge variant={vuln.severity}>{vuln.severity}</Badge>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph */}
        <Card className="lg:col-span-3 p-0 overflow-hidden" >
          <div style={{ height: '600px' }} className="rounded-xl">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1e293b" gap={20} />
              <Controls />
            </ReactFlow>
          </div>
        </Card>

        {/* Blast radius panel */}
        <Card className="h-fit">
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Blast Radius Analysis</h3>
          {blastResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-danger-500/10 p-3">
                  <p className="text-xs text-dark-400">Affected Services</p>
                  <p className="text-2xl font-bold text-danger-500">{blastResult.affectedServiceIds.length}</p>
                </div>
                <div className="rounded-lg bg-warning-500/10 p-3">
                  <p className="text-xs text-dark-400">Containers</p>
                  <p className="text-2xl font-bold text-warning-500">{blastResult.affectedContainerIds.length}</p>
                </div>
                <div className="rounded-lg bg-primary-500/10 p-3">
                  <p className="text-xs text-dark-400">Direct Deps</p>
                  <p className="text-2xl font-bold text-primary-500">{blastResult.directDependents.length}</p>
                </div>
                <div className="rounded-lg bg-accent-500/10 p-3">
                  <p className="text-xs text-dark-400">Transitive</p>
                  <p className="text-2xl font-bold text-accent-500">{blastResult.transitiveDependents.length}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-dark-400 mb-2">Affected Services</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {blastResult.affectedServiceIds.map((id) => {
                    const svc = data.services.find((s) => s.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => navigate({ name: 'finding', id: data.exposures.find((e) => e.service_id === id && e.vulnerability?.package_id === selectedPackageId)?.id ?? '' })}
                        className="flex w-full items-center gap-2 rounded-lg border border-dark-200 dark:border-dark-800 p-2 hover:bg-dark-50 dark:hover:bg-dark-800/50 text-left text-xs"
                      >
                        <Server size={14} className="text-primary-500" />
                        <span className="flex-1 text-dark-700 dark:text-dark-200">{svc?.name}</span>
                        {svc?.internet_facing && <Badge variant="high">internet</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-primary-500/20 bg-primary-500/5 p-3">
                <p className="text-xs text-primary-500 font-medium">Total Blast Radius</p>
                <p className="text-3xl font-bold text-primary-500">{blastResult.totalBlastRadius}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-dark-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click a vulnerable package in the graph to see its blast radius</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
