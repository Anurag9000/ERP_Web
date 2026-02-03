import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Loader2, Users } from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface TermOption {
  id: string;
  name: string;
  code: string;
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
}

interface SectionRow {
  id: string;
  section_number: string;
  capacity: number;
  enrolled_count: number;
  status: string;
  start_time: string;
  end_time: string;
  schedule_days: string[];
  courses: CourseOption;
  terms: TermOption | null;
  instructor_id: string | null;
  user_profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function SectionManagementPage() {
  const { profile } = useAuth();
  const { canWrite } = useMaintenance();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    courseId: '',
    termId: '',
    sectionNumber: '',
    capacity: 30,
    startTime: '09:00',
    endTime: '10:00',
    days: 'MONDAY,WEDNESDAY',
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const [sectionResp, courseResp, termResp, instructorResp] = await Promise.all([
        supabase
          .from('sections')
          .select(
            `
              id,
              section_number,
              capacity,
              enrolled_count,
              status,
              start_time,
              end_time,
              schedule_days,
              instructor_id,
              courses(id, code, name),
              terms(id, name, code),
              user_profiles!sections_instructor_id_fkey(first_name, last_name)
            `
          )
          .order('courses(code)'),
        supabase.from('courses').select('id, code, name').order('code'),
        supabase.from('terms').select('id, name, code').order('start_date', { ascending: false }),
        supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .eq('role', 'INSTRUCTOR')
          .eq('is_active', true)
          .order('last_name'),
      ]);

      if (sectionResp.error) throw sectionResp.error;
      if (courseResp.error) throw courseResp.error;
      if (termResp.error) throw termResp.error;
      if (instructorResp.error) throw instructorResp.error;

      setSections((sectionResp.data as SectionRow[]) || []);
      setCourses(courseResp.data || []);
      setTerms(termResp.data || []);
      setInstructors(instructorResp.data || []);
      setForm((prev) => ({
        ...prev,
        courseId: (courseResp.data?.[0] as any)?.id || '',
        termId: (termResp.data?.[0] as any)?.id || '',
      }));
    } catch (error) {
      console.error('Error loading sections:', error);
      setMessage('Unable to load sections.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(sectionId: string, instructorId: string) {
    if (!canWrite) {
      setMessage('Maintenance mode is active. Write operations are limited to administrators.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await (supabase.from('sections') as any).update({ instructor_id: instructorId }).eq('id', sectionId);
      if (error) throw error;
      await loadData();
      setMessage('Instructor assigned.');
    } catch (error) {
      console.error('Error assigning instructor:', error);
      setMessage('Unable to assign instructor.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSection(event: FormEvent) {
    event.preventDefault();
    if (!form.courseId || !form.termId) {
      setMessage('Select a course and term to create a section.');
      return;
    }
    if (!canWrite) {
      setMessage('Maintenance mode is active. Write operations are limited to administrators.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        course_id: form.courseId,
        term_id: form.termId,
        section_number: form.sectionNumber || '01',
        capacity: form.capacity,
        enrolled_count: 0,
        waitlist_count: 0,
        schedule_days: form.days.split(',').map((day) => day.trim().toUpperCase()).filter(Boolean),
        start_time: form.startTime,
        end_time: form.endTime,
        status: 'OPEN',
        is_active: true,
      };

      const { error } = await (supabase.from('sections').insert(payload as any) as any);
      if (error) throw error;
      setMessage('Section created.');
      setForm((prev) => ({ ...prev, sectionNumber: '', capacity: 30 }));
      await loadData();
    } catch (error) {
      console.error('Error creating section:', error);
      setMessage('Unable to create section.');
    } finally {
      setSaving(false);
    }
  }

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sections;
    return sections.filter((section) => {
      const text = `${section.courses?.code} ${section.courses?.name}`.toLowerCase();
      return text.includes(term);
    });
  }, [sections, search]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sections & Instructor Assignment</h1>
          <p className="text-gray-600 mt-1">Create sections and manage instructor assignments.</p>
        </div>
        <Input placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <Card title="Create Section">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateSection}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={form.courseId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={form.termId}
              onChange={(e) => setForm((prev) => ({ ...prev, termId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Section Number"
            value={form.sectionNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, sectionNumber: e.target.value }))}
            placeholder="e.g., 01"
          />
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
          />
          <Input
            label="Schedule Days (comma separated)"
            value={form.days}
            onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))}
            placeholder="MONDAY,WEDNESDAY"
            className="md:col-span-2"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <Input
              label="End Time"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Sections">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Course</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Term</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Capacity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Instructor</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSections.map((section) => (
                <tr key={section.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {section.courses?.code} · {section.courses?.name}
                    </p>
                    <p className="text-xs text-gray-500">Section {section.section_number}</p>
                  </td>
                  <td className="px-4 py-3">{section.terms?.name || 'TBA'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>
                        {section.enrolled_count}/{section.capacity}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {section.user_profiles ? (
                      <span className="text-sm text-gray-900">
                        {section.user_profiles.first_name} {section.user_profiles.last_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={section.instructor_id || ''}
                      onChange={(e) => handleAssign(section.id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      disabled={saving}
                    >
                      <option value="">Select instructor</option>
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.first_name} {instructor.last_name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
