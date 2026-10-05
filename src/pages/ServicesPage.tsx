import { useState, useMemo } from 'react';
import { Search, Server, Globe, Shield } from 'lucide-react';
import { Card, Badge, Spinner, EmptyState } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';

export function ServicesPage() {
  const data = useAppData();
  const [search, setSearch] = useState('');

  const services = useMemo(() => {
    return data.services
      .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search))
      .map((s) => {
        const exposures = data.exposures.filter((e) => e.service_id === s.id && e.status === 'open');
        return { ...s, exposureCount: exposures.length };
      })
      .sort((a, b) => b.exposureCount - a.exposureCount || a.name.localeCompare(b.name));
  }, [data.services, data.exposures, search]);

  if (data.loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Services</h1>
        <p className="text-sm text-dark-400 mt-1">{data.services.length} services across {data.teams.length} teams</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input type="text" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
      </div>

      {services.length === 0 ? (
        <EmptyState title="No services found" icon={<Server size={40} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc) => (
            <Card key={svc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-primary-500" />
                  <div>
                    <p className="text-sm font-semibold text-dark-900 dark:text-dark-50">{svc.name}</p>
                    <p className="text-xs text-dark-400">{svc.team?.name ?? 'Unassigned'}</p>
                  </div>
                </div>
                {svc.exposureCount > 0 && <Badge variant="critical">{svc.exposureCount} open</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={svc.criticality === 'critical' ? 'critical' : svc.criticality === 'high' ? 'high' : 'low'}>{svc.criticality}</Badge>
                {svc.internet_facing && <Badge variant="high"><Globe size={10} /> internet</Badge>}
                <Badge>{svc.data_classification}</Badge>
              </div>
              {svc.repository && <p className="text-xs text-dark-400 mt-2">{svc.repository.full_name}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
