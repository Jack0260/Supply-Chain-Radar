import { useMemo } from 'react';
import { Bug, AlertTriangle, Clock, Shield, Server, Package as PackageIcon, TrendingDown, FileCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Card, StatCard, Badge, Spinner, ProgressBar } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { deduplicateVulnerabilities } from '@/lib/risk';
import { daysSince, timeAgo } from '@/lib/format';
import { useRouter } from '@/lib/router';
import type { Severity } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#64748b',
};

export function DashboardPage() {
  const data = useAppData();
  const { navigate } = useRouter();

  const stats = useMemo(() => {
    const openExposures = data.exposures.filter((e) => e.status === 'open');
    const uniqueVulns = deduplicateVulnerabilities(data.vulnerabilities);
    const prodExposures = openExposures.filter((e) => {
      const risk = data.riskAssessments.find((r) => r.exposure_id === e.id);
      return risk?.production_impact;
    });
    const criticalInProd = prodExposures.filter((e) => {
      const risk = data.riskAssessments.find((r) => r.exposure_id === e.id);
      return risk?.risk_level === 'critical';
    });

    const resolvedTickets = data.tickets.filter((t) => t.status === 'verified' || t.status === 'resolved');
    const mttr = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          if (t.resolved_at && t.exposure) {
            return sum + daysSince(t.resolved_at) - daysSince(t.exposure.detected_at);
          }
          return sum;
        }, 0) / resolvedTickets.length
      : 0;

    const reposWithSbom = data.repositories.filter((r) => r.sbom_coverage).length;
    const sbomCoverage = data.repositories.length > 0 ? Math.round((reposWithSbom / data.repositories.length) * 100) : 0;

    const fixable = openExposures.filter((e) => e.vulnerability?.fix_available).length;
    const notFixable = openExposures.length - fixable;

    const licenseRisks = data.packages.filter((p) => {
      const lic = p.license?.toLowerCase() || '';
      return lic.includes('gpl') || lic.includes('lgpl') || lic.includes('agpl');
    }).length;

    const riskByTeam = data.teams.map((team) => {
      const teamServiceIds = data.services.filter((s) => s.team_id === team.id).map((s) => s.id);
      const teamExposures = openExposures.filter((e) => teamServiceIds.includes(e.service_id));
      const teamRisk = teamExposures.reduce((sum, e) => {
        const r = data.riskAssessments.find((ra) => ra.exposure_id === e.id);
        return sum + (r?.risk_score || 0);
      }, 0);
      return { name: team.name.split(' ')[0], risk: teamRisk, count: teamExposures.length };
    }).filter((t) => t.count > 0).sort((a, b) => b.risk - a.risk);

    const riskByEnv = data.environments.map((env) => {
      const envExposures = openExposures.filter((e) => e.environment_id === env.id);
      const envRisk = envExposures.reduce((sum, e) => {
        const r = data.riskAssessments.find((ra) => ra.exposure_id === e.id);
        return sum + (r?.risk_score || 0);
      }, 0);
      return { name: env.name, risk: envRisk, count: envExposures.length };
    }).filter((e) => e.count > 0);

    const topPackagesByBlast = uniqueVulns
      .map((v) => {
        const blast = data.riskAssessments.find((r) => r.exposure_id === openExposures.find((e) => e.vulnerability_id === v.id)?.id)?.blast_radius || 0;
        return { name: v.package?.name || v.cve_id, cve: v.cve_id, blast, severity: v.severity };
      })
      .sort((a, b) => b.blast - a.blast)
      .slice(0, 8);

    const vulnAgeBuckets = { '0-7d': 0, '8-30d': 0, '31-90d': 0, '90d+': 0 };
    openExposures.forEach((e) => {
      const age = daysSince(e.detected_at);
      if (age <= 7) vulnAgeBuckets['0-7d']++;
      else if (age <= 30) vulnAgeBuckets['8-30d']++;
      else if (age <= 90) vulnAgeBuckets['31-90d']++;
      else vulnAgeBuckets['90d+']++;
    });

    return {
      totalVuln: uniqueVulns.length, openExposures: openExposures.length,
      criticalInProd: criticalInProd.length, mttr: Math.abs(Math.round(mttr)),
      sbomCoverage, fixable, notFixable, licenseRisks,
      riskByTeam, riskByEnv, topPackagesByBlast,
      vulnAgeBuckets, prodExposures: prodExposures.length,
    };
  }, [data]);

  const ageData = Object.entries(stats.vulnAgeBuckets).map(([k, v]) => ({ name: k, count: v }));
  const fixData = [
    { name: 'Fixable', value: stats.fixable, color: '#22c55e' },
    { name: 'Not Fixable', value: stats.notFixable, color: '#ef4444' },
  ];

  if (data.loading) return <div className="p-8"><Spinner /></div>;
  if (data.error) return <div className="p-8 text-danger-500">{data.error}</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Security Dashboard</h1>
        <p className="text-sm text-dark-400 mt-1">Real-time view of your supply chain risk posture</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Vulnerabilities" value={stats.totalVuln} icon={<Bug size={24} />} color="danger" trend={`${stats.openExposures} open exposures`} />
        <StatCard label="Critical in Production" value={stats.criticalInProd} icon={<AlertTriangle size={24} />} color="warning" trend={`${stats.prodExposures} total in prod`} />
        <StatCard label="Mean Time to Remediate" value={`${stats.mttr}d`} icon={<Clock size={24} />} color="accent" trend={stats.mttr > 0 ? `${stats.mttr} days average` : 'No resolved tickets yet'} />
        <StatCard label="SBOM Coverage" value={`${stats.sbomCoverage}%`} icon={<FileCheck size={24} />} color="success" trend={`${data.repositories.filter(r => r.sbom_coverage).length}/${data.repositories.length} repositories`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Risk by Team</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.riskByTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Bar dataKey="risk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Risk by Environment</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.riskByEnv}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Bar dataKey="risk" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Top Packages by Blast Radius</h3>
          <div className="space-y-2.5">
            {stats.topPackagesByBlast.map((pkg, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-32 text-sm text-dark-600 dark:text-dark-300 truncate">{pkg.name}</span>
                <div className="flex-1">
                  <ProgressBar value={pkg.blast} max={Math.max(...stats.topPackagesByBlast.map(p => p.blast), 1)} color={pkg.severity === 'critical' ? 'danger' : pkg.severity === 'high' ? 'warning' : 'primary'} />
                </div>
                <Badge variant={pkg.severity as Severity}>{pkg.severity}</Badge>
                <span className="text-sm font-mono text-dark-500 w-8 text-right">{pkg.blast}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Fixable vs Not Fixable</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {fixData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-success-500">{stats.fixable}</p>
              <p className="text-xs text-dark-400">Fixable</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-danger-500">{stats.notFixable}</p>
              <p className="text-xs text-dark-400">Not Fixable</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">Vulnerability Age Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ageData}>
              <defs>
                <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#ageGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200 mb-4">License Risk Summary</h3>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500"><PackageIcon size={20} /></div>
                <div>
                  <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Copyleft Licenses</p>
                  <p className="text-xs text-dark-400">GPL, LGPL, AGPL</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-danger-500">{stats.licenseRisks}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/10 text-success-500"><Shield size={20} /></div>
                <div>
                  <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Permissive Licenses</p>
                  <p className="text-xs text-dark-400">MIT, Apache, BSD</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-success-500">{data.packages.length - stats.licenseRisks}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500"><Server size={20} /></div>
                <div>
                  <p className="text-sm font-medium text-dark-700 dark:text-dark-200">Total Packages Tracked</p>
                  <p className="text-xs text-dark-400">Across all ecosystems</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary-500">{data.packages.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent findings */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-200">Recent Findings</h3>
          <button onClick={() => navigate({ name: 'findings' })} className="text-xs text-primary-500 hover:text-primary-600">View all →</button>
        </div>
        <div className="space-y-2">
          {data.exposures.slice(0, 5).map((exp) => {
            const risk = data.riskAssessments.find((r) => r.exposure_id === exp.id);
            return (
              <button
                key={exp.id}
                onClick={() => navigate({ name: 'finding', id: exp.id })}
                className="flex w-full items-center gap-4 rounded-lg border border-dark-200 dark:border-dark-800 p-3 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors text-left"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                  risk?.risk_level === 'critical' ? 'bg-danger-500 text-white' :
                  risk?.risk_level === 'high' ? 'bg-warning-500 text-white' :
                  risk?.risk_level === 'medium' ? 'bg-primary-500 text-white' : 'bg-dark-400 text-white'
                }`}>
                  {risk?.risk_score ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-800 dark:text-dark-100 truncate">{exp.vulnerability?.title}</p>
                  <p className="text-xs text-dark-400">{exp.service?.name} · {exp.vulnerability?.cve_id}</p>
                </div>
                <Badge variant={exp.vulnerability?.severity as Severity}>{exp.vulnerability?.severity}</Badge>
                <span className="text-xs text-dark-400 hidden sm:inline">{timeAgo(exp.detected_at)}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
