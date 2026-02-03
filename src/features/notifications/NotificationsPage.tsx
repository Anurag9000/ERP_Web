import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, BellOff, Check, CheckCheck, Trash2, RefreshCw, Radio } from 'lucide-react';
import { getNotificationColor, getPriorityColor } from '../../lib/theme';
import { formatDateTime } from '../../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
}

interface NotificationPreference {
  category: string;
  enabled: boolean;
  delivery_method: string | null;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [maintenanceOnly, setMaintenanceOnly] = useState(false);

  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [savingPreference, setSavingPreference] = useState(false);

  const categories = [
    'ALL',
    'ACADEMIC',
    'FINANCE',
    'EVENTS',
    'SYSTEM',
    'MAINTENANCE',
    'CLUBS',
    'GRADES',
    'ATTENDANCE',
    'ENROLLMENT',
  ];



  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const subscribeToNotifications = useCallback(() => {
    if (!user) return;
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user!.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase
        .from('notification_preferences') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('category', ['SYSTEM', 'MAINTENANCE', 'DIGEST']);
      if (error) throw error;
      const next: Record<string, NotificationPreference> = {};
      (data as any[])?.forEach((pref) => {
        next[pref.category] = {
          category: pref.category,
          enabled: pref.enabled,
          delivery_method: pref.delivery_method,
        };
      });
      setPreferences(next);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }, [user]);

  async function updatePreference(category: string, updates: Partial<NotificationPreference>) {
    if (!user) return;
    try {
      setSavingPreference(true);
      const previous = preferences[category];
      const payload = {
        enabled: updates.enabled ?? previous?.enabled ?? true,
        delivery_method: updates.delivery_method ?? previous?.delivery_method ?? 'IN_APP',
      };
      const { data, error } = await (supabase
        .from('notification_preferences') as any)
        .upsert(
          {
            user_id: user.id,
            category,
            enabled: payload.enabled,
            delivery_method: payload.delivery_method,
          },
          { onConflict: 'user_id,category' }
        )
        .select('*')
        .single();
      if (error) throw error;
      setPreferences((prev) => ({
        ...prev,
        [category]: {
          category,
          enabled: (data as any).enabled,
          delivery_method: (data as any).delivery_method,
        },
      }));
    } catch (error) {
      console.error('Error updating notification preference:', error);
    } finally {
      setSavingPreference(false);
    }
  }

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter((notif) => notif.category === selectedCategory);
    }

    if (maintenanceOnly) {
      filtered = filtered.filter((notif) => ['SYSTEM', 'MAINTENANCE'].includes(notif.category));
    }

    if (showUnreadOnly) {
      filtered = filtered.filter((notif) => !notif.is_read);
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter((notif) => notif.priority === priorityFilter);
    }

    return filtered;
  }, [notifications, selectedCategory, maintenanceOnly, showUnreadOnly, priorityFilter]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    loadPreferences();
    const unsubscribe = subscribeToNotifications();
    return () => {
      unsubscribe?.();
    };
  }, [user, loadNotifications, loadPreferences, subscribeToNotifications]);

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif): Notification =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await (supabase
        .from('notifications') as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif): Notification =>
          !notif.is_read
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const systemHistory = useMemo(
    () => notifications.filter((notif) => ['SYSTEM', 'MAINTENANCE'].includes(notif.category)).slice(0, 6),
    [notifications]
  );
  const digestPreference = preferences['DIGEST'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadNotifications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="primary" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Unread only</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={maintenanceOnly}
                onChange={(e) => setMaintenanceOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Maintenance & system</span>
            </label>
            <label className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Priority</span>
              <select
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="ALL">All</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Maintenance & Broadcast Filters" className="lg:col-span-2">
          <div className="space-y-4">
            {['SYSTEM', 'MAINTENANCE'].map((category) => {
              const pref = preferences[category];
              return (
                <div
                  key={category}
                  className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {category === 'SYSTEM' ? 'System Broadcasts' : 'Maintenance Alerts'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {category === 'SYSTEM'
                        ? 'Receive campus-wide notices and admin broadcasts.'
                        : 'Receive maintenance mode toggles, countdowns, and overrides.'}
                    </p>
                  </div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={pref?.enabled ?? true}
                      onChange={(event) => updatePreference(category, { enabled: event.target.checked })}
                      disabled={savingPreference}
                    />
                    <span className="text-sm text-gray-700">{pref?.enabled === false ? 'Disabled' : 'Enabled'}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Digest & Delivery" subtitle="Consolidate alerts into email or SMS summaries">
          {digestPreference ? (
            <div className="space-y-4 text-sm text-gray-700">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={digestPreference.enabled}
                  onChange={(event) => updatePreference('DIGEST', { enabled: event.target.checked })}
                  disabled={savingPreference}
                />
                <span>Enable digest mode</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={digestPreference.delivery_method || 'WEEKLY'}
                onChange={(event) => updatePreference('DIGEST', { delivery_method: event.target.value })}
                disabled={savingPreference}
              >
                <option value="DAILY">Daily summary (email)</option>
                <option value="WEEKLY">Weekly digest (email)</option>
                <option value="SMS">SMS alert (prototype)</option>
              </select>
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-800 flex space-x-2">
                <Radio className="w-4 h-4" />
                <span>
                  {digestPreference.enabled
                    ? `Digest queued for ${digestPreference.delivery_method?.toLowerCase() || 'weekly'} delivery.`
                    : 'Digest disabled. Enable to consolidate notifications.'}
                </span>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => updatePreference('DIGEST', { enabled: true, delivery_method: 'WEEKLY' })}>
              Enable digest
            </Button>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="SMS & Email Stubs" subtitle="Prototype view of cross-channel delivery">
          <div className="space-y-4 text-sm text-gray-700">
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-xs uppercase text-gray-500">SMS preview</p>
              <p className="font-mono mt-1 text-gray-900">
                [ERP] Maintenance tonight 11 PM - 1 AM. Registration locked. Check portal for countdown.
              </p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-xs uppercase text-gray-500">Email preview</p>
              <p className="font-semibold text-gray-900">Weekly Digest - {new Date().toLocaleDateString()}</p>
              <p className="text-gray-600">
                {unreadCount} unread items · includes maintenance toggles, grade updates, and finance reminders.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              SMS/email delivery is stubbed in this build. Integrate providers (Twilio, SES, etc.) before enabling in production.
            </p>
          </div>
        </Card>

        <Card title="System Broadcast History" subtitle="Recent maintenance/system notices">
          {systemHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No system broadcasts yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {systemHistory.map((notif) => (
                <div key={notif.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{notif.title}</p>
                    <span className="text-xs text-gray-500">{formatDateTime(notif.created_at)}</span>
                  </div>
                  <p className="text-gray-600">{notif.message}</p>
                  <div className="mt-1 text-xs text-gray-500 uppercase">
                    {notif.priority} · {notif.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              {showUnreadOnly ? (
                <>
                  <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No unread notifications</p>
                </>
              ) : (
                <>
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No notifications found</p>
                </>
              )}
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${notification.is_read ? 'bg-white' : 'bg-blue-50'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge color={getNotificationColor(notification.category)} dot>
                      {notification.category}
                    </Badge>
                    <Badge color={getPriorityColor(notification.priority)}>
                      {notification.priority}
                    </Badge>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {notification.title}
                  </h3>
                  <p className="text-gray-700 mt-1">{notification.message}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {notification.action_url && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
