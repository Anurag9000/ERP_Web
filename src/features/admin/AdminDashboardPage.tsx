import { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { supabase } from '../../lib/supabase';
import { Users, BookOpen, Layers, Activity, AlertTriangle, CalendarClock } from 'lucide-react';

interface AdminStats {
  users: number;
  courses: number;
  sections: number;
  enrollments: number;
}

interface MaintenanceWindow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    courses: 0,
    sections: 0,
    enrollments: 0,
  });
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [userCount, courseCount, sectionCount, enrollmentCount, maintenanceWindows] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase
          .from('maintenance_windows')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(3),
      ]);

      setStats({
        users: userCount.count ?? 0,
        courses: courseCount.count ?? 0,
        sections: sectionCount.count ?? 0,
        enrollments: enrollmentCount.count ?? 0,
      });
      setMaintenance(maintenanceWindows.data ?? []);
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
        <p className="text-gray-600 mt-1">System-wide snapshot of people, catalog, and operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.users}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Courses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.courses}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sections</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.sections}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Enrollments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.enrollments}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Maintenance Windows">
          {maintenance.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No scheduled maintenance.</p>
          ) : (
            <div className="space-y-4">
              {maintenance.map((window) => (
                <div key={window.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{window.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(window.start_time).toLocaleString()} –{' '}
                        {new Date(window.end_time).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        window.is_active ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {window.is_active ? 'Active' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Next Steps">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Review pending overrides</p>
                <p className="text-sm text-gray-600">
                  Ensure enrollment overrides and waitlist promotions are approved promptly.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CalendarClock className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">Schedule maintenance</p>
                <p className="text-sm text-gray-600">
                  Keep maintenance windows up to date so stakeholders receive early notice.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
