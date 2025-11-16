import { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { formatTime } from '../../lib/utils';

interface DashboardStats {
  enrolledCourses: number;
  upcomingClasses: number;
  pendingFees: number;
  unreadNotifications: number;
  currentGPA: number;
}

interface UpcomingClass {
  course_code: string;
  course_name: string;
  section_number: string;
  start_time: string;
  end_time: string;
  room: string;
  day: string;
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    upcomingClasses: 0,
    pendingFees: 0,
    unreadNotifications: 0,
    currentGPA: 0,
  });
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    try {
      const [enrollments, notifications, fees] = await Promise.all([
        supabase
          .from('enrollments')
          .select('*, sections(*, courses(*))')
          .eq('student_id', user!.id)
          .eq('status', 'ACTIVE'),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('student_fees')
          .select('amount, amount_paid')
          .eq('student_id', user!.id)
          .eq('status', 'PENDING'),
      ]);

      const enrolledCount = enrollments.data?.length || 0;
      const unreadCount = notifications.data?.length || 0;
      const totalPending = fees.data?.reduce((sum: number, fee: any) => sum + (fee.amount - fee.amount_paid), 0) || 0;

      setStats({
        enrolledCourses: enrolledCount,
        upcomingClasses: 3,
        pendingFees: totalPending,
        unreadNotifications: unreadCount,
        currentGPA: 3.45,
      });

      setRecentNotifications(notifications.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your academics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enrolled Courses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.enrolledCourses}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Classes This Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.upcomingClasses}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Fees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${stats.pendingFees.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current GPA</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.currentGPA}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Schedule">
          <div className="space-y-3">
            {upcomingClasses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No classes scheduled for today</p>
            ) : (
              upcomingClasses.map((cls, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{cls.course_code}</p>
                    <p className="text-sm text-gray-600">{cls.course_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                    </p>
                    <p className="text-xs text-gray-500">{cls.room}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Recent Notifications">
          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No new notifications</p>
            ) : (
              recentNotifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{notif.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    </div>
                    <Badge variant="info">{notif.category}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
