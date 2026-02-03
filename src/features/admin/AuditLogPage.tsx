import { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

const trackedEntities = ['MAINTENANCE', 'ENROLLMENT', 'GRADE'];

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filter]);

  async function loadLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(
          `
            id,
            user_id,
            action,
            entity_type,
            entity_id,
            created_at,
            user_profiles:user_id (first_name, last_name, email)
          `
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'ALL') {
        query = query.eq('entity_type', filter) as any;
      } else {
        query = query.in('entity_type', trackedEntities) as any;
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setMessage('Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!logs.length) return;
    const header = ['timestamp', 'user', 'action', 'entity_type', 'entity_id'];
    const rows = logs.map((log) => [
      log.created_at,
      log.user_profiles ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 'SYSTEM',
      log.action,
      log.entity_type,
      log.entity_id ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">Monitor critical actions (maintenance toggles, enrollments, grades).</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Tracked Events</option>
            {trackedEntities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCsv} disabled={!logs.length}>
            Export CSV
          </Button>
        </div>
      </div>

      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{message}</div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {log.user_profiles
                      ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}`
                      : 'SYSTEM'}
                    <p className="text-xs text-gray-500">{log.user_profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{log.entity_type}</td>
                  <td className="px-4 py-3">{log.entity_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
