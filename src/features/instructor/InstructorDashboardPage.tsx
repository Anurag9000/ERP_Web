import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, ClipboardList, Bell } from 'lucide-react';
import { formatTime, getDayAbbreviation } from '../../lib/utils';

interface InstructorSection {
  id: string;
  section_number: string;
  capacity: number;
  enrolled_count: number;
  schedule_days: string[];
  start_time: string;
  end_time: string;
  rooms: { code: string | null } | null;
  courses: { code: string; name: string };
}

interface InstructorStats {
  activeSections: number;
  totalStudents: number;
  gradingDue: number;
  unreadNotifications: number;
}

export function InstructorDashboardPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<InstructorSection[]>([]);
  const [stats, setStats] = useState<InstructorStats>({
    activeSections: 0,
    totalStudents: 0,
    gradingDue: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data: sectionData } = await supabase
        .from('sections')
        .select(
          `
            id,
            section_number,
            capacity,
            enrolled_count,
            schedule_days,
            start_time,
            end_time,
            rooms(code),
            courses(code, name)
          `
        )
        .eq('instructor_id', user!.id)
        .eq('is_active', true)
        .order('courses(code)');

      const resolvedSections = (sectionData as InstructorSection[] | null) ?? [];
      const sectionIds = resolvedSections.map((section) => section.id);

      const [enrollmentCount, notificationsCount] = await Promise.all([
        sectionIds.length
          ? supabase
              .from('enrollments')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'ACTIVE')
              .in('section_id', sectionIds)
          : Promise.resolve({ count: 0 } as { count: number | null }),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('is_read', false),
      ]);

      setSections(resolvedSections);
      setStats({
        activeSections: resolvedSections.length,
        totalStudents: enrollmentCount?.count ?? 0,
        gradingDue: resolvedSections.reduce(
          (sum, section) => (section.enrolled_count < section.capacity ? sum + 1 : sum),
          0
        ),
        unreadNotifications: notificationsCount.count ?? 0,
      });
    } catch (error) {
      console.error('Error loading instructor dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const topSections = useMemo(() => sections.slice(0, 5), [sections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading your instructor dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Instructor Overview</h1>
        <p className="text-gray-600 mt-1">Monitor your sections, students, and grading tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sections</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeSections}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enrolled Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sections Needing Attention</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.gradingDue}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread Notifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.unreadNotifications}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="My Sections">
        {topSections.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No active sections assigned.</p>
        ) : (
          <div className="space-y-4">
            {topSections.map((section) => (
              <div
                key={section.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between border border-gray-100 rounded-xl p-4"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {section.courses.code} - Section {section.section_number}
                  </p>
                  <p className="text-gray-600">{section.courses.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="info">
                      {section.schedule_days.map(getDayAbbreviation).join(', ')} -{' '}
                      {formatTime(section.start_time)} - {formatTime(section.end_time)}
                    </Badge>
                    <Badge variant="default">
                      Room {section.rooms?.code || 'TBA'} - {section.enrolled_count}/{section.capacity}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 md:mt-0">
                  <p className="text-sm text-gray-500">Section ID</p>
                  <p className="text-sm font-mono">{section.id.slice(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


