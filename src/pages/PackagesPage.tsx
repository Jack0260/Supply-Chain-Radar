import { useState, useMemo } from 'react';
import { Search, Package as PackageIcon, AlertTriangle, Shield } from 'lucide-react';
import { Card, Badge, Spinner, EmptyState } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { deduplicateVulnerabilities } from '@/lib/risk';

export function PackagesPage() {
  const data = useAppData();
  const [search, setSearch] = useState('');
  const [ecoFilter, setEcoFilter] = useState('all');

  const vulnPackageIds = useMemo(() => {
    const ids = new Set<string>();
    data.vulnerabilities.forEach((v) => { if (v.package_id) ids.add(v.package_id); });
    return ids;
  }, [data.vulnerabilities]);

  const packages = useMemo(() => {
    return data.packages
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (ecoFilter !== 'all' && p.ecosystem !== ecoFilter) return false;
        return true;
      })
      .map((p) => {
        const vulns = data.vulnerabilities.filter((v) => v.package_id === p.id);
        return { ...p, vulnerabilities: vulns, isVulnerable: vulns.length > 0 };
      })
      .sort((a, b) => Number(b.isVulnerable) - Number(a.isVulnerable) || a.name.localeCompare(b.name));
  }, [data.packages, data.vulnerabilities, search, ecoFilter]);

  if (data.loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Packages</h1>
        <p className="text-sm text-dark-400 mt-1">{data.packages.length} packages tracked · {vulnPackageIds.size} with known vulnerabilities</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input type="text" placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
        </div>
        <select value={ecoFilter} onChange={(e) => setEcoFilter(e.target.value)}
          className="rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm">
          <option value="all">All Ecosystems</option><option value="npm">npm</option><option value="pypi">pypi</option><option value="go">go</option>
        </select>
      </div>

      {packages.length === 0 ? (
        <EmptyState title="No packages found" icon={<PackageIcon size={40} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {pkg.isVulnerable ? <AlertTriangle size={16} className="text-danger-500" /> : <Shield size={16} className="text-success-500" />}
                  <div>
                    <p className="text-sm font-semibold text-dark-900 dark:text-dark-50">{pkg.name}</p>
                    <p className="text-xs text-dark-400">{pkg.ecosystem} · v{pkg.latest_version}</p>
                  </div>
                </div>
                <Badge>{pkg.license}</Badge>
              </div>
              {pkg.vulnerabilities.length > 0 && (
                <div className="mt-3 space-y-1">
                  {pkg.vulnerabilities.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-xs">
                      <Badge variant={v.severity}>{v.severity}</Badge>
                      <span className="text-dark-500 dark:text-dark-400">{v.cve_id}</span>
                      {v.exploit_available && <span className="text-danger-500">exploit</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
