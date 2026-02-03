import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatTime, getDayAbbreviation } from '../../lib/utils';
import {
  Calendar,
  Users,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import { services } from '../../services/serviceLocator';
import type {
  RegistrationDepartment,
  RegistrationEnrollment,
  RegistrationSection,
  RegistrationWaitlist,
} from '../../services/EnrollmentService';

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

export function RegistrationPage() {
  const { user } = useAuth();
  const { canWrite } = useMaintenance();
  const [enrollments, setEnrollments] = useState<RegistrationEnrollment[]>([]);
  const [waitlists, setWaitlists] = useState<RegistrationWaitlist[]>([]);
  const [sections, setSections] = useState<RegistrationSection[]>([]);
  const [departments, setDepartments] = useState<RegistrationDepartment[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionSection, setActionSection] = useState<string | null>(null);
  const [actionEnrollment, setActionEnrollment] = useState<string | null>(null);
  const [actionWaitlist, setActionWaitlist] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await services.enrollmentService.fetchRegistrationData(user!.id);
      setEnrollments(result.enrollments);
      setWaitlists(result.waitlists);
      setSections(result.sections || []);
      setDepartments(result.departments || []);
    } catch (err: any) {
      console.error('Error loading registration data:', err);
      setMessage({ type: 'error', text: 'Could not load registration data.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const matchesSearch =
        section.courses.code.toLowerCase().includes(search.toLowerCase()) ||
        section.courses.name.toLowerCase().includes(search.toLowerCase());

      const matchesDept = departmentFilter
        ? section.courses.departments.code === departmentFilter
        : true;

      const matchesOpen = showOpenOnly ? section.status === 'OPEN' : true;

      return matchesSearch && matchesDept && matchesOpen;
    });
  }, [sections, search, departmentFilter, showOpenOnly]);

  const summary = useMemo(() => {
    const totalCredits = enrollments.reduce(
      (sum, enrollment) => sum + (enrollment.sections?.courses?.credits || 0),
      0
    );
    return {
      courses: enrollments.length,
      waitlisted: waitlists.length,
      credits: totalCredits,
    };
  }, [enrollments, waitlists]);

  async function handleRegister(section: RegistrationSection) {
    if (!user) return;
    if (!canWrite) {
      setMessage({
        type: 'error',
        text: 'Maintenance mode is active. Changes to registrations are temporarily disabled.',
      });
      return;
    }
    if (enrollments.some((enrollment) => enrollment.section_id === section.id)) {
      setMessage({ type: 'error', text: 'You are already enrolled in this section.' });
      return;
    }
    if (waitlists.some((entry) => entry.section_id === section.id && entry.status === 'WAITING')) {
      setMessage({ type: 'error', text: 'You are already on the waitlist for this section.' });
      return;
    }

    setActionSection(section.id);
    setMessage(null);

    try {
      const currentSections = enrollments.map((enrollment) => enrollment.sections).filter(Boolean) as RegistrationSection[];
      const result = await services.enrollmentService.enrollInSection(user!.id, section, currentSections);
      setMessage({
        type: 'success',
        text: result.status === 'ENROLLED' ? 'Enrolled successfully.' : 'Section is full. You have been added to the waitlist.',
      });
      await loadData();
    } catch (error) {
      console.error('Error registering for section:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error && error.message
            ? error.message
            : 'Unable to process registration. Please try again.',
      });
    } finally {
      setActionSection(null);
    }
  }

  async function handleDrop(enrollment: RegistrationEnrollment) {
    if (!user) return;
    if (!canWrite) {
      setMessage({
        type: 'error',
        text: 'Maintenance mode is active. Drop actions are temporarily disabled.',
      });
      return;
    }
    const deadline = enrollment.sections.terms?.drop_deadline
      ? new Date(enrollment.sections.terms.drop_deadline)
      : null;
    if (deadline && deadline < new Date()) {
      setMessage({
        type: 'error',
        text: `Drop deadline for this course passed on ${deadline.toLocaleDateString()}. Contact your advisor.`,
      });
      return;
    }
    const confirmed = window.confirm('Drop this course? You may need approval to re-enroll.');
    if (!confirmed) return;

    setActionEnrollment(enrollment.id);
    setMessage(null);

    try {
      await services.enrollmentService.dropEnrollment(user.id, enrollment);
      setMessage({ type: 'success', text: 'Course dropped successfully.' });
      await loadData();
    } catch (error) {
      console.error('Error dropping enrollment:', error);
      setMessage({ type: 'error', text: 'Unable to drop this course right now.' });
    } finally {
      setActionEnrollment(null);
    }
  }

  async function handleWaitlistRemove(entry: RegistrationWaitlist) {
    if (!user) return;
    if (!canWrite) {
      setMessage({
        type: 'error',
        text: 'Maintenance mode is active. Waitlist changes are temporarily disabled.',
      });
      return;
    }
    const confirmed = window.confirm('Remove this waitlist entry?');
    if (!confirmed) return;

    setActionWaitlist(entry.id);
    setMessage(null);
    try {
      await services.enrollmentService.removeFromWaitlist(user.id, entry);
      setMessage({ type: 'success', text: 'Removed from waitlist.' });
      await loadData();
    } catch (error) {
      console.error('Error removing waitlist entry:', error);
      setMessage({ type: 'error', text: 'Unable to update waitlist entry.' });
    } finally {
      setActionWaitlist(null);
    }
  }

  function renderSectionMeta(section: RegistrationSection) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <p className="font-medium text-gray-700">
              {section.schedule_days.map(getDayAbbreviation).join(', ')}
            </p>
            <p>
              {formatTime(section.start_time)} - {formatTime(section.end_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-500" />
          <div>
            <p className="font-medium text-gray-700">
              {section.enrolled_count} / {section.capacity}
            </p>
            <p>Enrolled</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ClipboardList className="w-4 h-4 text-gray-500" />
          <div>
            <p className="font-medium text-gray-700">
              Waitlist: {section.waitlist_count}
            </p>
            <p>Status: {section.status}</p>
          </div>
        </div>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-gray-900">Registration & Waitlist</h1>
        <p className="text-gray-600 mt-1">Manage your enrollments, waitlists, and browse sections.</p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 ${message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.courses}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Waitlisted</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.waitlisted}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Registered Credits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.credits}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="My Enrollments">
        {enrollments.length === 0 ? (
          <p className="text-gray-500 text-center py-6">You are not enrolled in any sections.</p>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const section = enrollment.sections;
              const dropDeadline =
                section.terms?.drop_deadline ? new Date(section.terms.drop_deadline) : null;
              const dropClosed = dropDeadline ? dropDeadline < new Date() : false;
              return (
                <div
                  key={enrollment.id}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {section.courses.code} - Section {section.section_number}
                        </h3>
                        <Badge variant="info">{section.courses.departments.code}</Badge>
                      </div>
                      <p className="text-gray-600 mt-1">{section.courses.name}</p>
                      <p className="text-sm text-gray-500">
                        Credits: {section.courses.credits} · Room {section.rooms?.code || 'TBA'}
                      </p>
                      {section.terms?.drop_deadline && (
                        <p className="text-xs text-gray-500 mt-1">
                          Drop deadline: {new Date(section.terms.drop_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center space-x-2">
                      <Badge variant="default">{enrollment.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionEnrollment === enrollment.id || dropClosed}
                        onClick={() => handleDrop(enrollment)}
                      >
                        {dropClosed
                          ? 'Deadline Passed'
                          : actionEnrollment === enrollment.id
                            ? 'Dropping...'
                            : 'Drop'}
                      </Button>
                    </div>
                  </div>
                  {renderSectionMeta(section)}
                  {dropDeadline && (
                    <p className="text-xs text-gray-500">
                      Drop deadline: {dropDeadline.toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="My Waitlist">
        {waitlists.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No active waitlist entries.</p>
        ) : (
          <div className="space-y-4">
            {waitlists.map((entry) => (
              <div
                key={entry.id}
                className="border border-dashed border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {entry.sections?.courses.code || 'N/A'} - Section {entry.sections?.section_number || 'N/A'}
                    </h3>
                    <Badge variant="warning">Position {entry.position}</Badge>
                  </div>
                  <p className="text-gray-600">{entry.sections?.courses.name || 'Unknown Course'}</p>
                </div>
                <div className="mt-3 md:mt-0 flex items-center space-x-2">
                  <Badge variant="default">{entry.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionWaitlist === entry.id}
                    onClick={() => handleWaitlistRemove(entry)}
                  >
                    {actionWaitlist === entry.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Browse Sections" subtitle="Filter by department or search for a specific course">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Search"
            placeholder="Course code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.code}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={showOpenOnly}
                onChange={(e) => setShowOpenOnly(e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">Open sections only</span>
            </label>
          </div>
        </div>

        {filteredSections.length === 0 ? (
          <div className="text-center text-gray-500 py-6">No sections match your filters.</div>
        ) : (
          <div className="space-y-4">
            {filteredSections.map((section) => {
              const seatsAvailable = section.capacity - section.enrolled_count;
              const alreadyEnrolled = enrollments.some(
                (enrollment) => enrollment.section_id === section.id && enrollment.status === 'ACTIVE'
              );
              const alreadyWaitlisted = waitlists.some((entry) => entry.section_id === section.id);
              return (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {section.courses.code} - Section {section.section_number}
                        </h3>
                        <Badge variant={section.status === 'OPEN' ? 'success' : 'warning'}>
                          {section.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{section.courses.name}</p>
                      <p className="text-sm text-gray-500">
                        Credits: {section.courses.credits} · Room {section.rooms?.code || 'TBA'}
                      </p>
                    </div>
                    <Button
                      className="mt-3 md:mt-0"
                      size="sm"
                      disabled={alreadyEnrolled || alreadyWaitlisted || actionSection === section.id || !canWrite}
                      onClick={() => handleRegister(section)}
                    >
                      {actionSection === section.id
                        ? 'Processing...'
                        : alreadyEnrolled
                          ? 'Enrolled'
                          : alreadyWaitlisted
                            ? 'Waitlisted'
                            : !canWrite
                              ? 'Maintenance'
                              : seatsAvailable > 0 && section.status === 'OPEN'
                                ? 'Register'
                                : 'Join Waitlist'}
                    </Button>
                  </div>
                  {renderSectionMeta(section)}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

