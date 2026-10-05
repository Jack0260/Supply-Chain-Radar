import type { DependencyEdge, NodeType } from '@/types';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  data: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  edge_type: string;
  is_direct: boolean;
}

export interface BlastRadiusResult {
  affectedServiceIds: string[];
  affectedEnvironmentIds: string[];
  affectedContainerIds: string[];
  directDependents: string[];
  transitiveDependents: string[];
  totalBlastRadius: number;
  exposurePaths: { serviceId: string; path: string[] }[];
}

export function buildAdjacencyList(edges: DependencyEdge[]): Map<string, { target: string; edge_type: string; is_direct: boolean }[]> {
  const adj = new Map<string, { target: string; edge_type: string; is_direct: boolean }[]>();
  for (const edge of edges) {
    const sourceKey = `${edge.source_type}:${edge.source_id}`;
    const entry = adj.get(sourceKey) ?? [];
    entry.push({ target: `${edge.target_type}:${edge.target_id}`, edge_type: edge.edge_type, is_direct: edge.is_direct });
    adj.set(sourceKey, entry);
  }
  return adj;
}

export function buildReverseAdjacencyList(edges: DependencyEdge[]): Map<string, { source: string; edge_type: string; is_direct: boolean }[]> {
  const adj = new Map<string, { source: string; edge_type: string; is_direct: boolean }[]>();
  for (const edge of edges) {
    const targetKey = `${edge.target_type}:${edge.target_id}`;
    const entry = adj.get(targetKey) ?? [];
    entry.push({ source: `${edge.source_type}:${edge.source_id}`, edge_type: edge.edge_type, is_direct: edge.is_direct });
    adj.set(targetKey, entry);
  }
  return adj;
}

export function calculateBlastRadius(
  packageId: string,
  edges: DependencyEdge[]
): BlastRadiusResult {
  const reverseAdj = buildReverseAdjacencyList(edges);
  const affectedServices = new Set<string>();
  const affectedEnvironments = new Set<string>();
  const affectedContainers = new Set<string>();
  const directDependents = new Set<string>();
  const transitiveDependents = new Set<string>();
  const exposurePaths: { serviceId: string; path: string[] }[] = [];

  const packageKey = `package:${packageId}`;

  function bfsUpstream(startKey: string, depth: number) {
    const visited = new Set<string>();
    const queue: { key: string; depth: number; path: string[] }[] = [{ key: startKey, depth: 0, path: [startKey] }];

    while (queue.length > 0) {
      const { key, depth: d, path } = queue.shift()!;
      if (visited.has(key)) continue;
      visited.add(key);

      const [type, id] = key.split(':');
      if (d > 0) {
        if (type === 'service') {
          affectedServices.add(id);
          if (d === 1) directDependents.add(id);
          else transitiveDependents.add(id);
          exposurePaths.push({ serviceId: id, path });
        }
        if (type === 'container_image') affectedContainers.add(id);
        if (type === 'environment') affectedEnvironments.add(id);
      }

      const upstream = reverseAdj.get(key);
      if (upstream) {
        for (const u of upstream) {
          if (!visited.has(u.source)) {
            queue.push({ key: u.source, depth: d + 1, path: [...path, u.source] });
          }
        }
      }
    }
  }

  bfsUpstream(packageKey, 0);

  return {
    affectedServiceIds: Array.from(affectedServices),
    affectedEnvironmentIds: Array.from(affectedEnvironments),
    affectedContainerIds: Array.from(affectedContainers),
    directDependents: Array.from(directDependents),
    transitiveDependents: Array.from(transitiveDependents),
    totalBlastRadius: affectedServices.size + affectedContainers.size,
    exposurePaths,
  };
}

export function isExceptionExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export function getActiveExceptions<T extends { expires_at: string; status: string }>(
  exceptions: T[]
): T[] {
  return exceptions.filter((e) => e.status === 'active' && !isExceptionExpired(e.expires_at));
}

export function getExpiredExceptions<T extends { expires_at: string; status: string }>(
  exceptions: T[]
): T[] {
  return exceptions.filter((e) => isExceptionExpired(e.expires_at) && e.status === 'active');
}
