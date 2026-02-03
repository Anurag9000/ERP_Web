import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import type { AttendanceRecord, AttendanceStatus, RosterStudent, TeachingSection } from '../../services/InstructorAttendanceService';
import { Download, Upload, Users, CheckSquare, Clock3 } from 'lucide-react';

type DraftRecord = {
  status: AttendanceStatus;
  minutesLate: number;
  notes: string;
};

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export function AttendancePage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<TeachingSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [draftRecords, setDraftRecords] = useState<Record<string, DraftRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSections = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await services.instructorAttendanceService.fetchSections(user.id);
      setSections(data);
      if (!selectedSectionId && data.length) {
        setSelectedSectionId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading sections', error);
      setMessage('Unable to load sections.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedSectionId]);

  const loadRosterAndHistory = useCallback(async (sectionId: string) => {
    try {
      setLoading(true);
      const [rosterData, historyData] = await Promise.all([
        services.instructorAttendanceService.fetchRoster(sectionId),
        services.instructorAttendanceService.fetchAttendance(sectionId, historyStartDate(), today()),
      ]);
      setRoster(rosterData);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading attendance', error);
      setMessage('Unable to load attendance for this section.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSections();
    }
  }, [user, loadSections]);

  useEffect(() => {
    if (selectedSectionId) {
      loadRosterAndHistory(selectedSectionId);
    }
  }, [selectedSectionId, loadRosterAndHistory]);

  useEffect(() => {
    hydrateDraftRecords();
  }, [roster, history, selectedDate]);

  function hydrateDraftRecords() {
    if (!roster.length) {
      setDraftRecords({});
      return;
    }
    const next: Record<string, DraftRecord> = {};
    roster.forEach((student) => {
      const record = history.find(
        (entry) => entry.studentId === student.id && entry.attendanceDate === selectedDate
      );
      next[student.id] = {
        status: record?.status || 'PRESENT',
        minutesLate: record?.minutesLate || 0,
        notes: record?.notes || '',
      };
    });
    setDraftRecords(next);
  }

  function historyStartDate() {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return start.toISOString().split('T')[0];
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  const todaysStats = useMemo(() => {
    const stats = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    Object.values(draftRecords).forEach((record) => {
      stats[record.status] += 1;
    });
    return stats;
  }, [draftRecords]);

  const tardinessInsights = useMemo(() => {
    const lateCounts: Record<string, { count: number; minutes: number; student: RosterStudent }> = {};
    history
      .filter((record) => record.status === 'LATE')
      .forEach((record) => {
        const student = roster.find((s) => s.id === record.studentId);
        if (!student) return;
        if (!lateCounts[record.studentId]) {
          lateCounts[record.studentId] = { count: 0, minutes: 0, student };
        }
        lateCounts[record.studentId].count += 1;
        lateCounts[record.studentId].minutes += record.minutesLate;
      });
    return Object.values(lateCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [history, roster]);

  function updateDraft(studentId: string, updates: Partial<DraftRecord>) {
    setDraftRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...updates,
      },
    }));
  }

  function markAll(status: AttendanceStatus) {
    const updated: Record<string, DraftRecord> = {};
    Object.keys(draftRecords).forEach((studentId) => {
      updated[studentId] = {
        ...draftRecords[studentId],
        status,
        minutesLate: status === 'LATE' ? draftRecords[studentId].minutesLate : 0,
      };
    });
    setDraftRecords(updated);
  }

  async function handleSave() {
    if (!selectedSectionId) return;
    const entries = Object.entries(draftRecords).map(([studentId, record]) => ({
      studentId,
      status: record.status,
      minutesLate: record.status === 'LATE' ? record.minutesLate : 0,
      notes: record.notes || null,
    }));
    try {
      setSaving(true);
      await services.instructorAttendanceService.saveAttendance(selectedSectionId, selectedDate, entries);
      setMessage('Attendance saved.');
      // Merge saved entries back into history
      setHistory((prev) => {
        const filtered = prev.filter((record) => record.attendanceDate !== selectedDate);
        const merged: AttendanceRecord[] = entries.map((entry) => ({
          id: `${selectedSectionId}-${entry.studentId}-${selectedDate}`,
          sectionId: selectedSectionId,
          studentId: entry.studentId,
          attendanceDate: selectedDate,
          status: entry.status,
          minutesLate: entry.minutesLate,
          notes: entry.notes,
        }));
        return [...filtered, ...merged];
      });
    } catch (error) {
      console.error('Error saving attendance', error);
      setMessage('Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!roster.length) return;
    const rows = [['student_id', 'student_name', 'status', 'minutes_late', 'notes']];
    roster.forEach((student) => {
      const record = draftRecords[student.id];
      rows.push([
        student.id,
        `${student.lastName}, ${student.firstName}`,
        record?.status || 'PRESENT',
        String(record?.minutesLate || 0),
        record?.notes || '',
      ]);
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [, ...data] = lines; // skip header
    const updates: Record<string, DraftRecord> = { ...draftRecords };
    data.forEach((line) => {
      const [studentId, , status, minutesLate, notes] = line.split(',');
      if (!studentId || !updates[studentId]) return;
      if (STATUSES.includes(status as AttendanceStatus)) {
        updates[studentId] = {
          status: status as AttendanceStatus,
          minutesLate: Number(minutesLate || 0),
          notes: notes || '',
        };
      }
    });
    setDraftRecords(updates);
    event.target.value = '';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading attendance...</div>
      </div>
    );
  }

  if (!selectedSectionId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You are not assigned to any sections.</p>
      </div>
    );
  }

  const selectedSection = sections.find((section) => section.id === selectedSectionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Workspace</h1>
          <p className="text-gray-600 mt-1">
            CSV import/export, tardiness tracking, and section analytics in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {message && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">{message}</div>}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm text-gray-700">
            Section
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedSectionId || ''}
              onChange={(event) => setSelectedSectionId(event.target.value)}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.courseCode} - {section.termName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Attendance date
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1"
            />
          </label>
          <div className="flex items-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => markAll('PRESENT')}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Mark all present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll('ABSENT')}>
              <Users className="w-4 h-4 mr-2" />
              Mark all absent
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryTile
          title="Present"
          value={todaysStats.PRESENT.toString()}
          description="Marked present today"
          accent="text-green-600"
        />
        <SummaryTile
          title="Absent"
          value={todaysStats.ABSENT.toString()}
          description="Marked absent today"
          accent="text-red-600"
        />
        <SummaryTile
          title="Late"
          value={todaysStats.LATE.toString()}
          description="Late today"
          accent="text-amber-600"
        />
        <SummaryTile
          title="Excused"
          value={todaysStats.EXCUSED.toString()}
          description="Excused today"
          accent="text-indigo-600"
        />
      </div>

      <Card title="Attendance Roster" subtitle={selectedSection?.schedule}>
        {roster.length === 0 ? (
          <p className="text-sm text-gray-500">No students enrolled in this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 w-32">Minutes late</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roster.map((student) => {
                  const draft = draftRecords[student.id];
                  return (
                    <tr key={student.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <p>
                          {student.lastName}, {student.firstName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{student.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          value={draft?.status || 'PRESENT'}
                          onChange={(event) => updateDraft(student.id, { status: event.target.value as AttendanceStatus })}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          disabled={(draft?.status || 'PRESENT') !== 'LATE'}
                          min={0}
                          value={draft?.minutesLate ?? 0}
                          onChange={(event) =>
                            updateDraft(student.id, { minutesLate: Number(event.target.value || 0) })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          rows={2}
                          value={draft?.notes ?? ''}
                          onChange={(event) => updateDraft(student.id, { notes: event.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="30-day analytics" subtitle="Attendance distribution and tardiness">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Sessions tracked</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(history.map((record) => record.attendanceDate)).size}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Total tardy minutes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {history.reduce((sum, record) => sum + (record.minutesLate || 0), 0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 col-span-2">
              <p className="text-xs uppercase text-gray-500 mb-2">Top tardy students</p>
              {tardinessInsights.length === 0 ? (
                <p className="text-gray-500 text-sm">No late records in this window.</p>
              ) : (
                <ul className="space-y-2">
                  {tardinessInsights.map((entry) => (
                    <li key={entry.student.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {entry.student.lastName}, {entry.student.firstName}
                        </p>
                        <p className="text-xs text-gray-500">{entry.student.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.count} late · {entry.minutes} minutes
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card title="History stream" subtitle="Recent attendance submissions">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No attendance history recorded.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {history
                .sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime())
                .slice(0, 10)
                .map((record) => {
                  const student = roster.find((s) => s.id === record.studentId);
                  return (
                    <div key={`${record.studentId}-${record.attendanceDate}`} className="p-3 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {student ? `${student.lastName}, ${student.firstName}` : record.studentId}
                        </p>
                        <span className="text-xs text-gray-500">{record.attendanceDate}</span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center space-x-1">
                        <Clock3 className="w-4 h-4 text-gray-400" />
                        <span>
                          {record.status}
                          {record.status === 'LATE' && ` · ${record.minutesLate} minutes late`}
                        </span>
                      </p>
                      {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  accent?: string;
}) {
  return (
    <Card>
      <div className="space-y-1">
        <p className="text-xs uppercase text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${accent || 'text-gray-900'}`}>{value}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Card>
  );
}
