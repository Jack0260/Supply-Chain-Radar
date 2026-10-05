import { useState, useEffect } from 'react';
import { ScrollText, User, Clock } from 'lucide-react';
import { Card, Spinner, Badge, EmptyState } from '@/components/ui';
import { fetchAuditLogs } from '@/lib/api';
import { timeAgo, formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Audit Log</h1>
        <p className="text-sm text-dark-400 mt-1">{logs.length} entries · full action history</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="No audit entries yet" description="Actions like creating tickets, filing exceptions, and uploading SBOMs will appear here" icon={<ScrollText size={40} />} />
      ) : (
        <Card>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 border-l-2 border-primary-500/30 pl-4 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-400">
                  <User size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-800 dark:text-dark-100 capitalize">{log.action.replace(/_/g, ' ')}</span>
                    <Badge>{log.entity_type}</Badge>
                  </div>
                  <p className="text-xs text-dark-400 mt-0.5">
                    by {log.actor} · {timeAgo(log.created_at)} · {formatDateTime(log.created_at)}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="text-xs text-dark-400 mt-1 font-mono bg-dark-50 dark:bg-dark-800/50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
