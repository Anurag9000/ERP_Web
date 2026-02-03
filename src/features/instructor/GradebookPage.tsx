import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Download, UploadCloud, Loader2, BarChart3, ClipboardCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { useMaintenance } from '../../contexts/MaintenanceContext';
import { services } from '../../services/serviceLocator';
import type { GradebookAssessment, GradebookSection, GradebookStudent } from '../../services/GradebookService';

interface GradeMapEntry {
  id?: string;
  marks: number | null;
  status: string;
}

const gradeKey = (studentId: string, assessmentId: string) => `${studentId}_${assessmentId}`;

export function GradebookPage() {
  const { user } = useAuth();
  const { canWrite } = useMaintenance();
  const [sections, setSections] = useState<GradebookSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<GradebookAssessment[]>([]);
  const [students, setStudents] = useState<GradebookStudent[]>([]);
  const [gradeMap, setGradeMap] = useState<Record<string, GradeMapEntry>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingSectionData, setLoadingSectionData] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const list = await services.gradebookService.listSections(user!.id);
      setSections(list);
      setSelectedSection(list[0]?.id || null);
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoadingSections(false);
    }
  }, [user]);

  const loadSectionData = useCallback(async (sectionId: string) => {
    setLoadingSectionData(true);
    setMessage(null);
    try {
      const data = await services.gradebookService.fetchSectionData(sectionId);
      setAssessments(data.assessments);
      setStudents(data.students);
      const nextGradeMap: Record<string, GradeMapEntry> = {};
      const nextInputs: Record<string, string> = {};
      data.rows.forEach((grade) => {
        const key = gradeKey(grade.student_id, grade.assessment_id);
        nextGradeMap[key] = {
          id: grade.id,
          marks: grade.marks_obtained !== null ? Number(grade.marks_obtained) : null,
          status: grade.status || 'GRADED',
        };
        nextInputs[key] = grade.marks_obtained !== null ? String(grade.marks_obtained) : '';
      });

      setGradeMap(nextGradeMap);
      setGradeInputs(nextInputs);
    } catch (error) {
      console.error('Error loading gradebook data:', error);
      setMessage('Unable to load gradebook data. Please try again.');
    } finally {
      setLoadingSectionData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSections();
    }
  }, [user, loadSections]);

  useEffect(() => {
    if (user && selectedSection) {
      loadSectionData(selectedSection);
    }
  }, [user, selectedSection, loadSectionData]);

  function handleGradeInputChange(studentId: string, assessmentId: string, value: string) {
    const key = gradeKey(studentId, assessmentId);
    setGradeInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveGrade(studentId: string, assessment: GradebookAssessment) {
    if (!user) return;
    if (!canWrite) {
      setMessage('Maintenance mode is active. Grade edits are temporarily disabled.');
      return;
    }
    const key = gradeKey(studentId, assessment.id);
    const rawValue = gradeInputs[key];
    if (!rawValue && rawValue !== '0') {
      setMessage('Please enter a score before saving.');
      return;
    }

    const marks = Number(rawValue);
    if (Number.isNaN(marks) || marks < 0 || marks > assessment.max_marks) {
      setMessage(`Score must be between 0 and ${assessment.max_marks}.`);
      return;
    }

    try {
      const data = await services.gradebookService.saveGrade({
        gradeId: gradeMap[key]?.id,
        assessmentId: assessment.id,
        studentId,
        marks,
        graderId: user.id,
      });
      setGradeMap((prev) => ({
        ...prev,
        [key]: {
          id: data.id,
          marks,
          status: data.status || 'GRADED',
        },
      }));
      setMessage('Grade saved.');
    } catch (error) {
      console.error('Error saving grade:', error);
      setMessage('Could not save grade. Please try again.');
    }
  }

  const calculateWeightedScore = useCallback((studentId: string) => {
    let earnedPoints = 0;
    let totalpossibleWeight = 0;

    assessments.forEach((assessment) => {
      const key = gradeKey(studentId, assessment.id);
      const grade = gradeMap[key];

      if (grade && grade.marks !== null && assessment.max_marks > 0) {
        earnedPoints += (grade.marks / assessment.max_marks) * assessment.weight;
        totalpossibleWeight += assessment.weight;
      }
    });

    if (totalpossibleWeight === 0) return 0;
    return Math.round((earnedPoints / totalpossibleWeight) * 100);
  }, [assessments, gradeMap]);

  const summaryStats = useMemo(() => {
    const totalGrades = Object.values(gradeMap).filter((grade) => grade.marks !== null).length;
    const totalPossible = students.length * assessments.length;
    const completionRate = totalPossible > 0 ? Math.round((totalGrades / totalPossible) * 100) : 0;
    const averageWeighted =
      students.length > 0
        ? Math.round(
          students.reduce((sum, student) => sum + calculateWeightedScore(student.student_id), 0) /
          students.length
        )
        : 0;
    return {
      completionRate,
      averageWeighted,
      assessments: assessments.length,
    };
  }, [assessments, students, gradeMap, calculateWeightedScore]);

  const assessmentStats = useMemo(() => {
    return assessments.map((assessment) => {
      let total = 0;
      let count = 0;
      students.forEach((student) => {
        const key = gradeKey(student.student_id, assessment.id);
        const grade = gradeMap[key];
        if (grade && grade.marks !== null) {
          total += grade.marks;
          count += 1;
        }
      });
      const avg = count > 0 ? total / count : 0;
      const completion = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
      return {
        assessment,
        average: avg,
        completion,
      };
    });
  }, [assessments, students, gradeMap]);

  function handleExportCsv() {
    if (!selectedSection || assessments.length === 0 || students.length === 0) {
      setMessage('Nothing to export for this section.');
      return;
    }
    const rows = [['student_id', 'assessment_id', 'score']];
    students.forEach((student) => {
      assessments.forEach((assessment) => {
        const key = gradeKey(student.student_id, assessment.id);
        const grade = gradeMap[key];
        rows.push([
          student.student_id,
          assessment.id,
          grade && grade.marks !== null ? String(grade.marks) : '',
        ]);
      });
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sectionInfo = sections.find((section) => section.id === selectedSection);
    link.href = url;
    link.download = `gradebook_${sectionInfo?.courses.code || 'section'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length || !selectedSection) return;
    if (!canWrite) {
      setMessage('Maintenance mode is active. Grade imports are temporarily disabled.');
      event.target.value = '';
      return;
    }
    const file = event.target.files[0];
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const validEntries: { assessmentId: string; studentId: string; marks: number }[] = [];
      const studentIds = new Set(students.map((student) => student.student_id));
      const assessmentIds = new Set(assessments.map((assessment) => assessment.id));

      lines.slice(1).forEach((line) => {
        if (!line) return;
        const [studentId, assessmentId, score] = line.split(',');
        if (!studentIds.has(studentId) || !assessmentIds.has(assessmentId)) {
          return;
        }
        const marks = Number(score);
        if (Number.isNaN(marks)) {
          return;
        }
        validEntries.push({
          studentId,
          assessmentId,
          marks,
        });
      });

      if (validEntries.length === 0) {
        setMessage('CSV did not contain any valid rows for this section.');
        return;
      }

      await services.gradebookService.importGrades(selectedSection, user!.id, validEntries);
      setMessage(`Imported ${validEntries.length} grade rows.`);
      await loadSectionData(selectedSection);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setMessage('Unable to import CSV. Please verify the format and try again.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  if (loadingSections) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No sections assigned to your account yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gradebook</h1>
          <p className="text-gray-600 mt-1">
            Manage assessments, capture grades, and view weighted progress for your sections.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedSection || ''}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.courses.code} · Section {section.section_number}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={loadingSectionData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <label className="inline-flex items-center space-x-2 text-sm font-medium text-blue-700 cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>{importing ? 'Importing...' : 'Import CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.assessments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.completionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Weighted Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.averageWeighted}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Assessments" subtitle="Weighting and completion">
        {assessmentStats.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No assessments defined yet.</p>
        ) : (
          <div className="space-y-4">
            {assessmentStats.map(({ assessment, average, completion }) => (
              <div
                key={assessment.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between border border-gray-100 rounded-xl p-4"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-900">{assessment.name}</p>
                  <p className="text-sm text-gray-600">
                    Type: {assessment.assessment_type} · Weight: {assessment.weight}% · Max:{' '}
                    {assessment.max_marks}
                  </p>
                  {assessment.due_date && (
                    <p className="text-xs text-gray-500">Due: {formatDate(assessment.due_date)}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-3 md:mt-0">
                  <div>
                    <p className="text-sm text-gray-500">Average</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {average.toFixed(1)} / {assessment.max_marks}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion</p>
                    <p className="text-xl font-semibold text-gray-900">{completion}%</p>
                  </div>
                  <Badge variant={assessment.is_published ? 'success' : 'warning'}>
                    {assessment.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Grade Grid" subtitle="Enter marks per student and assessment">
        {loadingSectionData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No students enrolled in this section.</p>
        ) : assessments.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            No assessments yet. Create assessments before entering grades.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                  {assessments.map((assessment) => (
                    <th key={assessment.id} className="px-4 py-3 text-left font-semibold text-gray-700">
                      {assessment.name}
                      <p className="text-xs text-gray-500">
                        Max {assessment.max_marks} · {assessment.weight}%
                      </p>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Weighted %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.student_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {student.profile
                          ? `${student.profile.first_name} ${student.profile.last_name}`
                          : student.student_id}
                      </p>
                      {student.profile?.student_id && (
                        <p className="text-xs text-gray-500">ID: {student.profile.student_id}</p>
                      )}
                    </td>
                    {assessments.map((assessment) => {
                      const key = gradeKey(student.student_id, assessment.id);
                      return (
                        <td key={assessment.id} className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min={0}
                              max={assessment.max_marks}
                              value={gradeInputs[key] ?? ''}
                              onChange={(e) =>
                                handleGradeInputChange(student.student_id, assessment.id, e.target.value)
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveGrade(student.student_id, assessment)}
                            >
                              Save
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {calculateWeightedScore(student.student_id)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
