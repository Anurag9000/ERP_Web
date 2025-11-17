import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, ClipboardList, Bell, PieChart, Activity, BarChart2 } from 'lucide-react';
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

interface InstructorAnalytics {
  gradeDistribution: Record<'A' | 'B' | 'C' | 'D' | 'F', number>;
  totalGrades: number;
  passRate: number;
  failRate: number;
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

const defaultAnalytics: InstructorAnalytics = {
  gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
  totalGrades: 0,
  passRate: 0,
  failRate: 0,
  attendance: {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  },
};

export function InstructorDashboardPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<InstructorSection[]>([]);
  const [stats, setStats] = useState<InstructorStats>({
    activeSections: 0,
    totalStudents: 0,
    gradingDue: 0,
    unreadNotifications: 0,
  });
  const [analytics, setAnalytics] = useState<InstructorAnalytics>(defaultAnalytics);
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
      await loadAnalytics(resolvedSections.map((section) => section.id));
    } catch (error) {
      console.error('Error loading instructor dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(sectionIds: string[]) {
    if (!sectionIds.length) {
      setAnalytics(defaultAnalytics);
      return;
    }
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().split('T')[0];

      const [gradeResp, attendanceResp] = await Promise.all([
        supabase
          .from('grades')
          .select(
            `
              marks_obtained,
              assessments (
                section_id,
                max_marks
              )
            `
          )
          .in('assessments.section_id', sectionIds),
        supabase
          .from('attendance_records')
          .select('status')
          .in('section_id', sectionIds)
          .gte('attendance_date', sinceStr),
      ]);

      if (gradeResp.error) throw gradeResp.error;
      if (attendanceResp.error) throw attendanceResp.error;

      const distribution: InstructorAnalytics['gradeDistribution'] = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      let pass = 0;
      let fail = 0;

      (gradeResp.data || []).forEach((record: any) => {
        const marks = record.marks_obtained;
        const max = record.assessments?.max_marks || 0;
        if (marks === null || marks === undefined || !max) {
          return;
        }
        const percent = (marks / max) * 100;
        if (percent >= 90) distribution.A += 1;
        else if (percent >= 80) distribution.B += 1;
        else if (percent >= 70) distribution.C += 1;
        else if (percent >= 60) distribution.D += 1;
        else distribution.F += 1;

        if (percent >= 60) pass += 1;
        else fail += 1;
      });

      const attendanceCounts = { present: 0, absent: 0, late: 0, excused: 0 };
      (attendanceResp.data || []).forEach((entry: any) => {
        if (entry.status === 'PRESENT') attendanceCounts.present += 1;
        else if (entry.status === 'ABSENT') attendanceCounts.absent += 1;
        else if (entry.status === 'LATE') attendanceCounts.late += 1;
        else if (entry.status === 'EXCUSED') attendanceCounts.excused += 1;
      });

      setAnalytics({
        gradeDistribution: distribution,
        totalGrades: Object.values(distribution).reduce((sum, value) => sum + value, 0),
        passRate: pass,
        failRate: fail,
        attendance: attendanceCounts,
      });
    } catch (error) {
      console.error('Error loading analytics', error);
      setAnalytics(defaultAnalytics);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Grade Distribution (last 30 days)">
          {analytics.totalGrades === 0 ? (
            <p className="text-sm text-gray-500">No graded submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.gradeDistribution).map(([bucket, value]) => {
                const percent = Math.round((value / analytics.totalGrades) * 100);
                return (
                  <div key={bucket}>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{bucket}</span>
                      <span>
                        {value} · {percent}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Pass vs Fail" subtitle="Threshold ≥ 60%">
          {analytics.totalGrades === 0 ? (
            <p className="text-sm text-gray-500">No graded submissions yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-500">Pass</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.passRate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fail</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.failRate}</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width:
                      analytics.passRate + analytics.failRate > 0
                        ? `${(analytics.passRate / (analytics.passRate + analytics.failRate)) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        <Card title="Attendance Mix" subtitle="Rolling 30-day snapshot">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <AnalyticsTile icon={PieChart} label="Present" value={analytics.attendance.present} accent="text-green-600" />
            <AnalyticsTile icon={Activity} label="Late" value={analytics.attendance.late} accent="text-amber-600" />
            <AnalyticsTile icon={BarChart2} label="Absent" value={analytics.attendance.absent} accent="text-red-600" />
            <AnalyticsTile icon={ClipboardList} label="Excused" value={analytics.attendance.excused} accent="text-indigo-600" />
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

function AnalyticsTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 flex items-center space-x-3">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
        <Icon className={`w-5 h-5 ${accent || 'text-gray-600'}`} />
      </div>
      <div>
        <p className="text-xs uppercase text-gray-500">{label}</p>
        <p className={`text-lg font-semibold ${accent || 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}


