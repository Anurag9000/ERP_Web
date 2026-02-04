
import { supabase } from '../lib/supabase';
import { AuditService } from './AuditService';

export interface GradebookSection {
  id: string;
  section_number: string;
  courses: {
    code: string;
    name: string;
  };
  terms: {
    name: string;
    code: string;
  } | null;
}

export interface GradebookAssessment {
  id: string;
  name: string;
  assessment_type: string;
  max_marks: number;
  weight: number;
  due_date: string | null;
  is_published: boolean;
}

export interface GradebookStudent {
  student_id: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string | null;
  } | null;
}

export interface GradebookRow {
  id?: string;
  assessment_id: string;
  student_id: string;
  marks_obtained: number | null;
  status: string;
}

export interface GradebookData {
  assessments: GradebookAssessment[];
  students: GradebookStudent[];
  rows: GradebookRow[];
}

export class GradebookService {
  constructor(private readonly audit: AuditService) { }
  async listSections(instructorId: string): Promise<GradebookSection[]> {
    const { data, error } = await (supabase
      .from('sections')
      .select(
        `
          id,
          section_number,
          courses(code, name),
          terms(name, code)
        `
      )
      .eq('instructor_id', instructorId)
      .eq('is_active', true)
      .order('courses(code)') as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error;
    return (data as GradebookSection[]) || [];
  }

  async fetchSectionData(sectionId: string): Promise<GradebookData> {
    const [{ data: assessmentsData, error: assessmentError }, { data: enrollmentsData, error: enrollmentError }] =
      await Promise.all([
        supabase
          .from('assessments')
          .select('id, name, assessment_type, max_marks, weight, due_date, is_published')
          .eq('section_id', sectionId)
          .order('due_date', { ascending: true }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        supabase
          .from('enrollments')
          .select('student_id, status')
          .eq('section_id', sectionId)
          .eq('status', 'ACTIVE')
          .order('created_at') as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ]);

    if (assessmentError) throw assessmentError;
    if (enrollmentError) throw enrollmentError;

    const assessmentList: GradebookAssessment[] =
      (assessmentsData as GradebookAssessment[] | null)?.map((assessment) => ({
        ...assessment,
        max_marks: Number(assessment.max_marks),
        weight: Number(assessment.weight),
      })) || [];

    const studentIds = (enrollmentsData as { student_id: string }[] | null)?.map((enrollment) => enrollment.student_id);

    let profiles: GradebookStudent['profile'][] = [];
    if (studentIds && studentIds.length > 0) {
      const { data: profileRows } = await (supabase
        .from('user_profiles')
        .select('id, first_name, last_name, student_id')
        .in('id', studentIds) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      profiles = profileRows || [];
    }
    const profileMap = new Map(profiles.map((profile) => [profile?.id, profile || null]));

    const students: GradebookStudent[] =
      (studentIds || []).map((studentId) => ({
        student_id: studentId,
        profile: profileMap.get(studentId) || null,
      })) || [];

    let gradeRows: GradebookRow[] = [];
    if (assessmentList.length > 0) {
      const assessmentIds = assessmentList.map((assessment) => assessment.id);
      const { data: gradesData, error } = await (supabase
        .from('grades')
        .select('id, assessment_id, student_id, marks_obtained, status')
        .in('assessment_id', assessmentIds) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw error;
      gradeRows =
        (gradesData as GradebookRow[])?.map((row) => ({
          ...row,
          marks_obtained: row.marks_obtained !== null ? Number(row.marks_obtained) : null,
        })) || [];
    }

    return { assessments: assessmentList, students, rows: gradeRows };
  }

  async saveGrade(payload: {
    gradeId?: string;
    assessmentId: string;
    studentId: string;
    marks: number;
    graderId: string;
  }) {
    const { gradeId, assessmentId, studentId, marks, graderId } = payload;
    const { data, error } = await (supabase
      .from('grades')
      .upsert(
        {
          id: gradeId,
          assessment_id: assessmentId,
          student_id: studentId,
          marks_obtained: marks,
          status: 'GRADED',
          graded_at: new Date().toISOString(),
          graded_by: graderId,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        { onConflict: 'assessment_id,student_id' }
      )
      .select()
      .single() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error) throw error;
    await this.audit.gradeEdit(graderId, assessmentId, studentId, marks);
    return data;
  }

  async importGrades(
    _sectionId: string,
    instructorId: string,
    rows: { studentId: string; assessmentId: string; marks: number }[]
  ) {
    if (rows.length === 0) {
      return;
    }

    const payload = rows.map((entry) => ({
      assessment_id: entry.assessmentId,
      student_id: entry.studentId,
      marks_obtained: entry.marks,
      status: 'GRADED',
      graded_by: instructorId,
      graded_at: new Date().toISOString(),
    }));

    const { error } = await (supabase.from('grades').upsert(payload as any, { onConflict: 'assessment_id,student_id' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error) throw error;
    await Promise.all(
      rows.map((entry) => this.audit.gradeEdit(instructorId, entry.assessmentId, entry.studentId, entry.marks))
    );
  }
}
