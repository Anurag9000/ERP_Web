import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loader2, GraduationCap, Layers, ClipboardList } from 'lucide-react';

interface EnrollmentRow {
  id: string;
  status: string;
  grade: string | null;
  grade_points: number | null;
  sections: {
    id: string;
    section_number: string;
    courses: {
      code: string;
      name: string;
      credits: number;
    };
    terms: {
      name: string;
      code: string;
    } | null;
  };
}

interface AssessmentGrade {
  id: string;
  marks_obtained: number | null;
  status: string;
  assessments: {
    id: string;
    name: string;
    assessment_type: string;
    max_marks: number;
    weight: number;
    section_id: string;
  };
}

export function GradesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [assessmentGrades, setAssessmentGrades] = useState<Record<string, AssessmentGrade[]>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const { data: enrollmentData, error } = await supabase
        .from('enrollments')
        .select(
          `
            id,
            status,
            grade,
            grade_points,
            sections (
              id,
              section_number,
              courses(code, name, credits),
              terms(name, code)
            )
          `
        )
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const enrollmentRows = (enrollmentData as EnrollmentRow[]) || [];
      setEnrollments(enrollmentRows);
      setSelectedSection(enrollmentRows[0]?.sections?.id || null);

      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select(
          `
            id,
            marks_obtained,
            status,
            assessments (
              id,
              name,
              assessment_type,
              max_marks,
              weight,
              section_id
            )
          `
        )
        .eq('student_id', user!.id);

      if (gradeError) throw gradeError;

      const gradesBySection: Record<string, AssessmentGrade[]> = {};
      (gradeData as AssessmentGrade[] | null)?.forEach((grade) => {
        const sectionId = grade.assessments?.section_id;
        if (!sectionId) return;
        if (!gradesBySection[sectionId]) {
          gradesBySection[sectionId] = [];
        }
        gradesBySection[sectionId].push(grade);
      });

      setAssessmentGrades(gradesBySection);
    } catch (error) {
      console.error('Error loading grades:', error);
      setMessage('Unable to load your grades. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const completed = enrollments.filter((enrollment) => enrollment.status === 'COMPLETED');
    const completedCredits = completed.reduce(
      (sum, enrollment) => sum + (enrollment.sections?.courses?.credits || 0),
      0
    );
    const totalGradePoints = completed.reduce(
      (sum, enrollment) => sum + (enrollment.grade_points || 0),
      0
    );
    const gpa = completedCredits > 0 ? (totalGradePoints / completedCredits).toFixed(2) : '0.00';
    const activeCount = enrollments.filter((enrollment) => enrollment.status === 'ACTIVE').length;
    return {
      completedCredits,
      gpa,
      activeCount,
    };
  }, [enrollments]);

  const selectedGrades = selectedSection ? assessmentGrades[selectedSection] || [] : [];
  const selectedEnrollment = enrollments.find(
    (enrollment) => enrollment.sections?.id === selectedSection
  );

  function renderAssessmentDetails() {
    if (!selectedSection || !selectedEnrollment) {
      return <p className="text-gray-500">Select a course to view detailed scores.</p>;
    }

    if (selectedGrades.length === 0) {
      return <p className="text-gray-500">No assessments graded yet for this course.</p>;
    }

    return (
      <div className="space-y-3">
        {selectedGrades.map((grade) => (
          <div
            key={grade.id}
            className="flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200 rounded-xl p-4"
          >
            <div>
              <p className="text-lg font-semibold text-gray-900">{grade.assessments?.name}</p>
              <p className="text-sm text-gray-600">
                Type: {grade.assessments?.assessment_type} · Weight: {grade.assessments?.weight}% · Max:{' '}
                {grade.assessments?.max_marks}
              </p>
            </div>
            <div className="mt-3 md:mt-0 flex items-center space-x-4">
              <p className="text-xl font-semibold text-gray-900">
                {grade.marks_obtained ?? '--'} / {grade.assessments?.max_marks}
              </p>
              <Badge variant="info">{grade.status}</Badge>
            </div>
          </div>
        ))}
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

  if (!enrollments.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No enrollments found for your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Grades</h1>
          <p className="text-gray-600 mt-1">Track course grades, weighted progress, and GPA.</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData}>
          Refresh
        </Button>
      </div>

      {message && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cumulative GPA</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.gpa}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Credits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.completedCredits}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Courses In Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.activeCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Course Grades">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Course</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Section</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Credits</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Grade</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr
                  key={enrollment.id}
                  className={`cursor-pointer ${
                    selectedSection === enrollment.sections?.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSection(enrollment.sections?.id ?? null)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {enrollment.sections?.courses?.code} · {enrollment.sections?.courses?.name}
                  </td>
                  <td className="px-4 py-3">{enrollment.sections?.section_number}</td>
                  <td className="px-4 py-3">{enrollment.sections?.courses?.credits}</td>
                  <td className="px-4 py-3">{enrollment.grade ?? '--'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={enrollment.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {enrollment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Assessment Breakdown"
        subtitle={
          selectedEnrollment
            ? `${selectedEnrollment.sections?.courses?.code} · ${selectedEnrollment.sections?.courses?.name}`
            : 'Select a course from the table above to see assessment details.'
        }
      >
        {renderAssessmentDetails()}
      </Card>
    </div>
  );
}


