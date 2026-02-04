import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import { services } from '../../services/serviceLocator';

interface MaintenanceWindow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function SystemSettingsPage() {
  const { profile } = useAuth();
  const { canWrite } = useMaintenance();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    start: '',
    end: '',
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [{ data: setting }, { data: windowRows }] = await Promise.all([
        (supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle() as any), // eslint-disable-line @typescript-eslint/no-explicit-any
        (supabase
          .from('maintenance_windows')
          .select('id, title, start_time, end_time, is_active')
          .order('start_time', { ascending: false })
          .limit(5) as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);

      setMaintenanceEnabled(setting?.value === 'true');
      setWindows((windowRows as MaintenanceWindow[]) || []);
    } catch (error) {
      console.error('Error loading maintenance settings:', error);
      setMessage('Unable to load maintenance settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin, loadSettings]);

  async function toggleMaintenance() {
    if (!canWrite) {
      setMessage('Maintenance toggles are restricted to administrators during system maintenance.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const next = !maintenanceEnabled;
      const { error } = await (supabase
        .from('system_settings')
        .upsert({ key: 'maintenance_mode', value: next ? 'true' : 'false' } as any) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw error;
      setMaintenanceEnabled(next);
      if (profile?.id) {
        await services.auditService.maintenanceToggle(profile.id, next);
      }
      setMessage(`Maintenance mode ${next ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error('Error updating maintenance:', error);
      setMessage('Unable to update maintenance mode.');
    } finally {
      setSaving(false);
    }
  }

  async function scheduleWindow(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title || !form.start || !form.end) {
      setMessage('Provide title, start, and end time.');
      return;
    }
    if (!canWrite) {
      setMessage('Maintenance toggles are restricted to administrators during system maintenance.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: form.title,
        start_time: form.start,
        end_time: form.end,
        is_active: true,
        created_by: profile?.id || '',
      };
      const { data, error } = await (supabase.from('maintenance_windows').insert(payload as any).select('id').single() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw error;
      if (profile?.id && data?.id) {
        await services.auditService.maintenanceWindow(profile.id, data.id);
      }
      setForm({ title: '', start: '', end: '' });
      await loadSettings();
      setMessage('Maintenance window scheduled.');
    } catch (error) {
      console.error('Error scheduling window:', error);
      setMessage('Unable to schedule window.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return <p className="text-gray-600">You do not have access to this page.</p>;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings & Maintenance</h1>
        <p className="text-gray-600 mt-1">Toggle maintenance mode and set system-wide windows.</p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <Card title="Maintenance Mode">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-gray-700">
              Maintenance mode temporarily blocks student/instructor write actions.
            </p>
            <p className="text-sm text-gray-500">
              Current status:{' '}
              <span className={maintenanceEnabled ? 'text-red-600' : 'text-green-600'}>
                {maintenanceEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </p>
          </div>
          <Button onClick={toggleMaintenance} disabled={saving}>
            {maintenanceEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
          </Button>
        </div>
      </Card>

      <Card title="Schedule Maintenance Window" subtitle="Inform users about upcoming downtime.">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={scheduleWindow}>
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Quarterly DB Upgrade"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.start}
              onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.end}
              onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>
              Schedule Window
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Recent Maintenance Windows">
        {windows.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No maintenance windows recorded.</p>
        ) : (
          <div className="space-y-3">
            {windows.map((window) => (
              <div key={window.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                <div>
                  <p className="font-semibold text-gray-900">{window.title}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(window.start_time).toLocaleString()} – {new Date(window.end_time).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${window.is_active ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                    }`}
                >
                  {window.is_active ? 'Active' : 'Completed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-xs text-gray-500 flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4" />
        <span>Remember to notify stakeholders before enabling maintenance mode.</span>
      </div>
    </div>
  );
}
