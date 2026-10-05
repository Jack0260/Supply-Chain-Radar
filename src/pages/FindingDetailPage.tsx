import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Server, Bug, Ticket, Shield, Clock, User, TrendingDown, FileText, Target } from 'lucide-react';
import { Card, Badge, Spinner, Button, Modal, RiskScoreBadge, ProgressBar } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { useRouter } from '@/lib/router';
import { calculateBlastRadius, getActiveExceptions, isExceptionExpired } from '@/lib/graph';
import { fetchAuditLogs, createRemediationTicket, createException, updateTicketStatus } from '@/lib/api';
import { formatDate, timeAgo, daysSince } from '@/lib/format';
import type { AuditLog } from '@/types';

export function FindingDetailPage({ id }: { id: string }) {
  const data = useAppData();
  const { navigate } = useRouter();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [ticketForm, setTicketForm] = useState({ teamId: '', priority: 'high', dueDate: '', notes: '' });
  const [exceptionForm, setExceptionForm] = useState({ reason: '', control: '', expiresAt: '', approvedBy: 'Security Team' });

  const exposure = useMemo(() => data.exposures.find((e) => e.id === id), [data.exposures, id]);
  const risk = useMemo(() => data.riskAssessments.find((r) => r.exposure_id === id), [data.riskAssessments, id]);
  const tickets = useMemo(() => data.tickets.filter((t) => t.exposure_id === id), [data.tickets, id]);
  const exceptions = useMemo(() => data.exceptions.filter((e) => e.exposure_id === id), [data.exceptions, id]);

  const blastRadius = useMemo(() => {
    if (!exposure?.vulnerability?.package_id) return null;
    return calculateBlastRadius(exposure.vulnerability.package_id, data.edges);
  }, [exposure, data.edges]);

  const affectedServices = useMemo(() => {
    if (!blastRadius) return [];
    return blastRadius.affectedServiceIds
      .map((sid) => data.services.find((s) => s.id === sid))
      .filter(Boolean);
  }, [blastRadius, data.services]);

  const activeExceptions = getActiveExceptions(exceptions);
  const expiredExceptions = exceptions.filter((e) => isExceptionExpired(e.expires_at) && e.status === 'active');

  useEffect(() => {
    fetchAuditLogs('exposure', id).then(setAuditLogs).catch(() => {});
  }, [id, data.refresh]);

  const handleCreateTicket = async () => {
    if (!exposure || !ticketForm.teamId) return;
    await createRemediationTicket(exposure.id, ticketForm.teamId, ticketForm.priority, ticketForm.dueDate, ticketForm.notes);
    setShowTicketModal(false);
    data.refresh();
  };

  const handleCreateException = async () => {
    if (!exposure) return;
    await createException(exposure.id, exceptionForm.reason, exceptionForm.control, exceptionForm.expiresAt, exceptionForm.approvedBy);
    setShowExceptionModal(false);
    data.refresh();
  };

  const handleVerifyRemediation = async () => {
    const ticket = tickets.find((t) => t.status === 'resolved');
    if (!ticket) return;
    await updateTicketStatus(ticket.id, 'verified', exposure!.id);
    data.refresh();
  };

  if (data.loading) return <div className="p-8"><Spinner /></div>;
  if (!exposure) return <div className="p-8"><Card><p className="text-dark-400">Finding not found</p><Button onClick={() => navigate({ name: 'findings' })} className="mt-4">Back to Findings</Button></Card></div>;

  const vuln = exposure.vulnerability;
  const svc = exposure.service;
  const hasCompensatingControl = activeExceptions.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <button onClick={() => navigate({ name: 'findings' })} className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-600 dark:hover:text-dark-200">
        <ArrowLeft size={16} /> Back to Findings
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        {risk && <RiskScoreBadge score={risk.risk_score} level={risk.risk_level} />}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-dark-900 dark:text-dark-50">{vuln?.title}</h1>
            {vuln?.exploit_available && <Badge variant="critical"><AlertTriangle size={12} /> Exploit Available</Badge>}
          </div>
          <p className="text-sm text-dark-400 mt-1">{vuln?.cve_id} · {vuln?.package?.name} ({vuln?.package?.ecosystem})</p>
        </div>
        <Badge variant={vuln?.severity}>{vuln?.severity}</Badge>
      </div>

      {/* Blast Radius Brief */}
      <Card className="border-primary-500/20 bg-primary-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-primary-500" />
          <h2 className="text-sm font-semibold text-primary-600 dark:text-primary-400">Blast Radius Brief</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-dark-400">Vulnerable Component</p>
              <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{vuln?.package?.name} v{vuln?.fixed_in_version ? `< ${vuln.fixed_in_version}` : 'affected'}</p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Business Criticality</p>
              <p className="text-sm font-medium text-dark-800 dark:text-dark-100 capitalize">{svc?.criticality}</p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Production Services at Risk</p>
              <div className="space-y-1 mt-1">
                {affectedServices.filter(s => s?.criticality === 'critical' || s?.criticality === 'high').map((s) => (
                  <div key={s!.id} className="flex items-center gap-2 text-xs text-dark-700 dark:text-dark-200">
                    <Server size={12} className="text-primary-500" />
                    {s!.name}
                    {s!.internet_facing && <Badge variant="high">internet</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-dark-400">Owners to Notify</p>
              <p className="text-sm font-medium text-dark-800 dark:text-dark-100">{svc?.team?.name ?? 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Suggested Remediation Order</p>
              <p className="text-sm text-dark-700 dark:text-dark-200">
                {vuln?.fix_available
                  ? `Update ${vuln?.package?.name} to ${vuln?.fixed_in_version}. Prioritize ${affectedServices.filter(s => s?.criticality === 'critical').length} critical services first.`
                  : 'No fix available yet. Apply compensating controls and monitor for patches.'}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Temporary Mitigations</p>
              <p className="text-sm text-dark-700 dark:text-dark-200">
                {vuln?.exploit_available
                  ? 'WAF rules to block exploit patterns, restrict network access to affected services, enable additional logging.'
                  : 'Monitor for exploit publication, restrict access where possible, ensure logging is enabled.'}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Estimated Risk Reduction if Fixed</p>
              <div className="flex items-center gap-2 mt-1">
                <ProgressBar value={risk?.risk_score ?? 0} max={100} color="success" />
                <span className="text-xs font-medium text-success-500">{Math.round((risk?.risk_score ?? 0) * 0.85)}pts → 0</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3"><Bug size={16} className="text-danger-500" /><h3 className="text-sm font-semibold">Vulnerability</h3></div>
          <dl className="space-y-2 text-xs">
            <div><dt className="text-dark-400">CVE</dt><dd className="font-mono text-dark-800 dark:text-dark-100">{vuln?.cve_id}</dd></div>
            <div><dt className="text-dark-400">CVSS Score</dt><dd className="text-dark-800 dark:text-dark-100">{vuln?.cvss_score} / 10</dd></div>
            <div><dt className="text-dark-400">Published</dt><dd className="text-dark-800 dark:text-dark-100">{timeAgo(vuln?.published_at)}</dd></div>
            <div><dt className="text-dark-400">Detected</dt><dd className="text-dark-800 dark:text-dark-100">{timeAgo(exposure.detected_at)}</dd></div>
            <div><dt className="text-dark-400">Fix Available</dt><dd className={vuln?.fix_available ? 'text-success-500' : 'text-danger-500'}>{vuln?.fix_available ? `Yes → ${vuln?.fixed_in_version}` : 'No'}</dd></div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3"><Server size={16} className="text-primary-500" /><h3 className="text-sm font-semibold">Affected Service</h3></div>
          <dl className="space-y-2 text-xs">
            <div><dt className="text-dark-400">Service</dt><dd className="text-dark-800 dark:text-dark-100">{svc?.name}</dd></div>
            <div><dt className="text-dark-400">Criticality</dt><dd className="capitalize text-dark-800 dark:text-dark-100">{svc?.criticality}</dd></div>
            <div><dt className="text-dark-400">Internet Facing</dt><dd className={svc?.internet_facing ? 'text-danger-500' : 'text-dark-800 dark:text-dark-100'}>{svc?.internet_facing ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-dark-400">Data Class</dt><dd className="capitalize text-dark-800 dark:text-dark-100">{svc?.data_classification}</dd></div>
            <div><dt className="text-dark-400">Team</dt><dd className="text-dark-800 dark:text-dark-100">{svc?.team?.name ?? '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3"><TrendingDown size={16} className="text-warning-500" /><h3 className="text-sm font-semibold">Risk Assessment</h3></div>
          {risk && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-dark-400">Score</span>
                <span className="text-lg font-bold text-dark-900 dark:text-dark-50">{risk.risk_score}/100</span>
              </div>
              {risk.factors && (
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-dark-400">Severity</span><span className="capitalize">{risk.factors.severity}</span></div>
                  <div className="flex justify-between"><span className="text-dark-400">Blast Radius</span><span>{risk.factors.blast_radius} services</span></div>
                  <div className="flex justify-between"><span className="text-dark-400">Age</span><span>{risk.factors.days_since_detection} days</span></div>
                  <div className="flex justify-between"><span className="text-dark-400">Production</span><span>{risk.factors.production ? 'Yes' : 'No'}</span></div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setShowTicketModal(true)} disabled={tickets.length > 0}>
          <Ticket size={16} /> Create Remediation Ticket
        </Button>
        <Button variant="secondary" onClick={() => setShowExceptionModal(true)} disabled={hasCompensatingControl}>
          <Shield size={16} /> File Exception
        </Button>
        {tickets.some((t) => t.status === 'resolved') && (
          <Button variant="ghost" onClick={handleVerifyRemediation}>
            <FileText size={16} /> Verify Remediation
          </Button>
        )}
      </div>

      {/* Remediation tickets */}
      {tickets.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Remediation Tickets</h3>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-lg border border-dark-200 dark:border-dark-800 p-3 text-xs">
                <Badge variant={t.priority}>{t.priority}</Badge>
                <span className="flex-1 text-dark-700 dark:text-dark-200">{t.notes || 'No notes'}</span>
                <span className="text-dark-400">Due: {formatDate(t.due_date)}</span>
                <Badge>{t.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Exceptions */}
      {(activeExceptions.length > 0 || expiredExceptions.length > 0) && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Exceptions</h3>
          <div className="space-y-2">
            {[...activeExceptions, ...expiredExceptions].map((exc) => {
              const expired = isExceptionExpired(exc.expires_at);
              return (
                <div key={exc.id} className={`rounded-lg border p-3 text-xs ${expired ? 'border-danger-500/30 bg-danger-500/5' : 'border-success-500/30 bg-success-500/5'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-dark-800 dark:text-dark-100">{exc.reason}</span>
                    <Badge variant={expired ? 'critical' : 'low'}>{expired ? 'expired' : exc.status}</Badge>
                  </div>
                  <p className="text-dark-400 mt-1">Control: {exc.compensating_control}</p>
                  <p className="text-dark-400">Expires: {formatDate(exc.expires_at)} ({daysSince(exc.expires_at) > 0 ? `${daysSince(exc.expires_at)}d ago` : 'active'})</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Audit log */}
      <Card>
        <div className="flex items-center gap-2 mb-3"><Clock size={16} className="text-dark-400" /><h3 className="text-sm font-semibold">Audit History</h3></div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-dark-400">No audit entries yet</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs border-l-2 border-primary-500/30 pl-3">
                <User size={12} className="text-dark-400" />
                <span className="font-medium text-dark-700 dark:text-dark-200">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-dark-400">by {log.actor}</span>
                <span className="text-dark-400 ml-auto">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Description */}
      <Card>
        <h3 className="text-sm font-semibold mb-2">Description</h3>
        <p className="text-sm text-dark-600 dark:text-dark-300 leading-relaxed">{vuln?.description}</p>
      </Card>

      {/* Ticket Modal */}
      <Modal open={showTicketModal} onClose={() => setShowTicketModal(false)} title="Create Remediation Ticket">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Assign to Team</label>
            <select value={ticketForm.teamId} onChange={(e) => setTicketForm({ ...ticketForm, teamId: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm">
              <option value="">Select team...</option>
              {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Priority</label>
            <select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm">
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Due Date</label>
            <input type="date" value={ticketForm.dueDate} onChange={(e) => setTicketForm({ ...ticketForm, dueDate: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Notes</label>
            <textarea value={ticketForm.notes} onChange={(e) => setTicketForm({ ...ticketForm, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm" rows={3} />
          </div>
          <Button onClick={handleCreateTicket} disabled={!ticketForm.teamId}>Create Ticket</Button>
        </div>
      </Modal>

      {/* Exception Modal */}
      <Modal open={showExceptionModal} onClose={() => setShowExceptionModal(false)} title="File Exception">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Reason</label>
            <input value={exceptionForm.reason} onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm" placeholder="e.g., Risk accepted due to business deadline" />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Compensating Control</label>
            <input value={exceptionForm.control} onChange={(e) => setExceptionForm({ ...exceptionForm, control: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm" placeholder="e.g., WAF rule blocks exploit pattern" />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">Expires At</label>
            <input type="date" value={exceptionForm.expiresAt} onChange={(e) => setExceptionForm({ ...exceptionForm, expiresAt: e.target.value })} className="mt-1 w-full rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 px-3 py-2 text-sm" />
          </div>
          <Button onClick={handleCreateException} disabled={!exceptionForm.reason || !exceptionForm.expiresAt}>File Exception</Button>
        </div>
      </Modal>
    </div>
  );
}
