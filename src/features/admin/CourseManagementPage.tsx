import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Loader2 } from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface CourseRow {
  id: string;
  code: string;
  name: string;
  credits: number;
  level: string;
  is_active: boolean;
  departments: Department;
}

export function CourseManagementPage() {
  const { profile } = useAuth();
  const { canWrite } = useMaintenance();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [form, setForm] = useState({
    code: '',
    name: '',
    credits: 3,
    level: '100',
    departmentId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const [deptResp, courseResp] = await Promise.all([
        supabase.from('departments').select('id, name, code').eq('is_active', true).order('name'),
        supabase
          .from('courses')
          .select('id, code, name, credits, level, is_active, departments(id, name, code)')
          .order('code'),
      ]);
      if (deptResp.error) throw deptResp.error;
      if (courseResp.error) throw courseResp.error;
      setDepartments(deptResp.data || []);
      setCourses((courseResp.data as CourseRow[]) || []);
      setForm((prev) => ({ ...prev, departmentId: deptResp.data?.[0]?.id || '' }));
    } catch (error) {
      console.error('Error loading courses:', error);
      setMessage('Unable to load course catalog.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCourse(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      setMessage('Maintenance mode is active. Write operations are limited to administrators.');
      return;
    }
    if (!form.departmentId) {
      setMessage('Please select a department.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        department_id: form.departmentId,
        credits: form.credits,
        level: form.level,
        is_active: true,
      };
      const { error } = await supabase.from('courses').insert(payload);
      if (error) throw error;
      setMessage('Course created.');
      setForm((prev) => ({ ...prev, code: '', name: '' }));
      await loadData();
    } catch (error) {
      console.error('Error creating course:', error);
      setMessage('Unable to create course. Ensure the code is unique.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCourse(courseId: string, active: boolean) {
    if (!canWrite) {
      setMessage('Maintenance mode is active. Write operations are limited to administrators.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('courses').update({ is_active: active }).eq('id', courseId);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating course:', error);
      setMessage('Unable to update course status.');
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
        <h1 className="text-3xl font-bold text-gray-900">Course Catalog Management</h1>
        <p className="text-gray-600 mt-1">Create new courses and manage catalog availability.</p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <Card title="Add Course">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddCourse}>
          <Input
            label="Course Code"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="e.g., CS301"
            required
          />
          <Input
            label="Course Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Advanced Algorithms"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Credits"
              type="number"
              min={1}
              value={form.credits}
              onChange={(e) => setForm((prev) => ({ ...prev, credits: Number(e.target.value) }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {['100', '200', '300', '400', 'GRAD'].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Course'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Existing Courses">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Course</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Dept</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Credits</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Level</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {course.code} · {course.name}
                  </td>
                  <td className="px-4 py-3">{course.departments?.code}</td>
                  <td className="px-4 py-3">{course.credits}</td>
                  <td className="px-4 py-3">{course.level}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        course.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving || !canWrite}
                      onClick={() => toggleCourse(course.id, !course.is_active)}
                    >
                      {course.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
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
