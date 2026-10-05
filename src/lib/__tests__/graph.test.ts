import { describe, it, expect } from 'vitest';
import { buildReverseAdjacencyList, calculateBlastRadius, isExceptionExpired, getActiveExceptions, getExpiredExceptions } from '@/lib/graph';
import type { DependencyEdge } from '@/types';

describe('graph traversal', () => {
  const mockEdges: DependencyEdge[] = [
    { id: '1', source_type: 'service', source_id: 'svc-1', target_type: 'package', target_id: 'pkg-1', edge_type: 'depends_on', is_direct: true, created_at: '' },
    { id: '2', source_type: 'service', source_id: 'svc-2', target_type: 'package', target_id: 'pkg-1', edge_type: 'depends_on', is_direct: true, created_at: '' },
    { id: '3', source_type: 'service', source_id: 'svc-3', target_type: 'package', target_id: 'pkg-2', edge_type: 'depends_on', is_direct: true, created_at: '' },
    { id: '4', source_type: 'package', source_id: 'pkg-2', target_type: 'package', target_id: 'pkg-1', edge_type: 'depends_on', is_direct: false, created_at: '' },
    { id: '5', source_type: 'container_image', source_id: 'ctr-1', target_type: 'package', target_id: 'pkg-1', edge_type: 'contains', is_direct: true, created_at: '' },
  ];

  it('builds reverse adjacency list', () => {
    const adj = buildReverseAdjacencyList(mockEdges);
    const upstream = adj.get('package:pkg-1');
    expect(upstream).toHaveLength(4);
  });

  it('calculates blast radius for a package with multiple dependents', () => {
    const result = calculateBlastRadius('pkg-1', mockEdges);
    expect(result.affectedServiceIds).toContain('svc-1');
    expect(result.affectedServiceIds).toContain('svc-2');
    expect(result.affectedContainerIds).toContain('ctr-1');
    expect(result.totalBlastRadius).toBe(4);
  });

  it('identifies direct vs transitive dependents', () => {
    const result = calculateBlastRadius('pkg-1', mockEdges);
    expect(result.directDependents).toContain('svc-1');
    expect(result.directDependents).toContain('svc-2');
    expect(result.transitiveDependents).toContain('svc-3');
  });
});

describe('exception expiry', () => {
  it('detects expired exceptions', () => {
    expect(isExceptionExpired('2020-01-01T00:00:00Z')).toBe(true);
    expect(isExceptionExpired('2099-12-31T00:00:00Z')).toBe(false);
  });

  it('filters active exceptions', () => {
    const exceptions = [
      { expires_at: '2099-12-31T00:00:00Z', status: 'active' },
      { expires_at: '2020-01-01T00:00:00Z', status: 'active' },
      { expires_at: '2099-12-31T00:00:00Z', status: 'revoked' },
    ];
    const active = getActiveExceptions(exceptions);
    expect(active).toHaveLength(1);
  });

  it('identifies expired-but-still-active exceptions', () => {
    const exceptions = [
      { expires_at: '2020-01-01T00:00:00Z', status: 'active' },
      { expires_at: '2099-12-31T00:00:00Z', status: 'active' },
    ];
    const expired = getExpiredExceptions(exceptions);
    expect(expired).toHaveLength(1);
  });
});
