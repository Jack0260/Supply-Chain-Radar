import { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import { Card, Badge, Spinner, EmptyState, RiskScoreBadge } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { useRouter } from '@/lib/router';
import type { Severity } from '@/types';

export function FindingsPage() {
  const data = useAppData();
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const findings = useMemo(() => {
    return data.exposures
      .map((exp) => {
        const risk = data.riskAssessments.find((r) => r.exposure_id === exp.id);
        return { ...exp, risk_assessment: risk };
      })
      .filter((exp) => {
        if (search) {
          const q = search.toLowerCase();
          if (!exp.vulnerability?.title?.toLowerCase().includes(q) &&
              !exp.vulnerability?.cve_id?.toLowerCase().includes(q) &&
              !exp.service?.name?.toLowerCase().includes(q)) return false;
        }
        if (severityFilter !== 'all' && exp.vulnerability?.severity !== severityFilter) return false;
        if (statusFilter !== 'all' && exp.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (b.risk_assessment?.risk_score ?? 0) - (a.risk_assessment?.risk_score ?? 0));
  }, [data, search, severityFilter, statusFilter]);

  if (data.loading) return <div className="p-8"><Spinner /></div>;
  if (data.error) return <div className="p-8 text-danger-500">{data.error}</div>;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Vulnerability Findings</h1>
        <p className="text-sm text-dark-400 mt-1">{findings.length} findings · sorted by risk score</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Search by CVE, title, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 pl-9 pr-3 py-2 text-sm text-dark-900 dark:text-dark-50 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="remediated">Remediated</option>
          <option value="exception">Exception</option>
        </select>
      </div>

      {/* Findings list */}
      {findings.length === 0 ? (
        <EmptyState title="No findings match your filters" description="Try adjusting your search or filter criteria" icon={<Filter size={40} />} />
      ) : (
        <div className="space-y-2">
          {findings.map((exp) => (
            <button
              key={exp.id}
              onClick={() => navigate({ name: 'finding', id: exp.id })}
              className="flex w-full items-center gap-4 rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 hover:border-primary-500/50 transition-colors text-left"
            >
              {exp.risk_assessment && <RiskScoreBadge score={exp.risk_assessment.risk_score} level={exp.risk_assessment.risk_level} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-dark-900 dark:text-dark-50 truncate">{exp.vulnerability?.title}</p>
                  {exp.vulnerability?.exploit_available && <AlertTriangle size={14} className="text-danger-500" />}
                </div>
                <p className="text-xs text-dark-400 mt-0.5">
                  {exp.vulnerability?.cve_id} · {exp.service?.name} · CVSS {exp.vulnerability?.cvss_score}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {exp.risk_assessment?.production_impact && <Badge variant="critical">prod</Badge>}
                {exp.risk_assessment?.internet_exposure && <Badge variant="high">internet</Badge>}
                <Badge variant={exp.vulnerability?.severity as Severity}>{exp.vulnerability?.severity}</Badge>
                <Badge>{exp.status}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
