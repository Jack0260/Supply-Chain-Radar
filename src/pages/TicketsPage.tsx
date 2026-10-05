import { useMemo } from 'react';
import { Ticket as TicketIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Spinner, EmptyState, Button } from '@/components/ui';
import { useAppData } from '@/lib/useAppData';
import { useRouter } from '@/lib/router';
import { formatDate, timeAgo } from '@/lib/format';
import { updateTicketStatus } from '@/lib/api';

export function TicketsPage() {
  const data = useAppData();
  const { navigate } = useRouter();

  const tickets = useMemo(() => {
    return data.tickets.map((t) => {
      const exposure = data.exposures.find((e) => e.id === t.exposure_id);
      return { ...t, exposure };
    }).sort((a, b) => {
      const order = { open: 0, in_progress: 1, resolved: 2, verified: 3 };
      return order[a.status] - order[b.status] || (a.due_date ?? '').localeCompare(b.due_date ?? '');
    });
  }, [data.tickets, data.exposures]);

  const stats = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved' || t.status === 'verified').length,
  }), [tickets]);

  if (data.loading) return <div className="p-8"><Spinner /></div>;

  const handleAdvance = async (ticketId: string, currentStatus: string, exposureId: string) => {
    const next: Record<string, string> = { open: 'in_progress', in_progress: 'resolved', resolved: 'verified' };
    if (next[currentStatus]) {
      await updateTicketStatus(ticketId, next[currentStatus], exposureId);
      data.refresh();
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Remediation Tickets</h1>
        <p className="text-sm text-dark-400 mt-1">{stats.open} open · {stats.inProgress} in progress · {stats.resolved} resolved</p>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No remediation tickets yet" description="Create tickets from individual finding pages" icon={<TicketIcon size={40} />} />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  t.status === 'verified' ? 'bg-success-500/10 text-success-500' :
                  t.status === 'resolved' ? 'bg-primary-500/10 text-primary-500' :
                  t.status === 'in_progress' ? 'bg-warning-500/10 text-warning-500' :
                  'bg-dark-400/10 text-dark-400'
                }`}>
                  {t.status === 'verified' ? <CheckCircle2 size={18} /> : <TicketIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  {t.exposure && (
                    <button onClick={() => navigate({ name: 'finding', id: t.exposure!.id })}
                      className="text-sm font-medium text-dark-900 dark:text-dark-50 hover:text-primary-500 truncate block">
                      {t.exposure.vulnerability?.title}
                    </button>
                  )}
                  <p className="text-xs text-dark-400 mt-0.5">
                    {t.assigned_team?.name ?? 'Unassigned'} · Due {formatDate(t.due_date)} · Created {timeAgo(t.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.priority}>{t.priority}</Badge>
                  <Badge>{t.status.replace(/_/g, ' ')}</Badge>
                  {t.status !== 'verified' && (
                    <Button size="sm" variant="ghost" onClick={() => handleAdvance(t.id, t.status, t.exposure_id)}>
                      {t.status === 'open' ? 'Start' : t.status === 'in_progress' ? 'Resolve' : 'Verify'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
