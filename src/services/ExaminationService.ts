import { supabase } from '../lib/supabase';

export interface ExamForm {
    id: string;
    termId: string;
    studentId: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
    submittedAt?: Date;
}

export interface AdmitCard {
    examId: string;
    studentId: string;
    studentName: string;
    rollNumber: string;
    examCenter: string;
    examDate: Date;
    courses: Array<{
        code: string;
        name: string;
        date: Date;
        time: string;
    }>;
}

export class ExaminationService {
    /**
     * Submit exam form for a term
     */
    async submitExamForm(studentId: string, termId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error: formError } = await (supabase
                .from('exam_forms') as any)
                .insert({
                    student_id: studentId,
                    term_id: termId,
                    status: 'SUBMITTED',
                    submitted_at: new Date().toISOString()
                });

            if (formError) throw formError;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate admit card
     */
    async generateAdmitCard(studentId: string, termId: string): Promise<AdmitCard | null> {
        try {
            // Get student info
            const { data: student, error: studentError } = await (supabase
                .from('user_profiles') as any)
                .select('student_id, first_name, last_name')
                .eq('id', studentId)
                .single();

            if (studentError) throw studentError;

            // Get enrolled courses with exam schedules
            const { data: enrollments, error: enrollError } = await (supabase
                .from('enrollments') as any)
                .select(`
          sections (
            courses (code, name),
            assessments (
              name,
              due_date,
              assessment_type
            )
          )
        `)
                .eq('student_id', studentId)
                .eq('status', 'ACTIVE');

            if (enrollError) throw enrollError;

            // Extract exam dates
            const courses: any[] = [];
            (enrollments || []).forEach((enrollment: any) => {
                const section = enrollment.sections;
                const exams = section?.assessments?.filter((a: any) => a.assessment_type === 'EXAM') || [];

                exams.forEach((exam: any) => {
                    courses.push({
                        code: section.courses?.code || '',
                        name: section.courses?.name || '',
                        date: new Date(exam.due_date),
                        time: new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                });
            });

            return {
                examId: termId,
                studentId: student.student_id,
                studentName: `${student.first_name} ${student.last_name}`,
                rollNumber: student.student_id,
                examCenter: 'Main Campus - Hall A',
                examDate: courses[0]?.date || new Date(),
                courses: courses.sort((a, b) => a.date.getTime() - b.date.getTime())
            };
        } catch (error) {
            console.error('Error generating admit card:', error);
            return null;
        }
    }

    /**
     * Get exam datesheet for a term
     */
    async getDatesheet(termId: string) {
        const { data, error } = await (supabase
            .from('assessments') as any)
            .select(`
        id,
        name,
        due_date,
        sections!inner (
          term_id,
          courses (code, name)
        )
      `)
            .eq('sections.term_id', termId)
            .eq('assessment_type', 'EXAM')
            .order('due_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((exam: any) => ({
            id: exam.id,
            name: exam.name,
            courseCode: exam.sections?.courses?.code || '',
            courseName: exam.sections?.courses?.name || '',
            date: new Date(exam.due_date),
            time: new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
    }

    /**
     * Get marksheet for student
     */
    async getMarksheet(studentId: string, termId: string) {
        const { data, error } = await (supabase
            .from('enrollments') as any)
            .select(`
        grade,
        sections!inner (
          term_id,
          courses (code, name, credits)
        ),
        grades (
          marks_obtained,
          assessments (max_marks, name)
        )
      `)
            .eq('student_id', studentId)
            .eq('sections.term_id', termId)
            .eq('status', 'ACTIVE');

        if (error) throw error;

        return (data as any[] || []).map((enrollment) => ({
            courseCode: enrollment.sections?.courses?.code || '',
            courseName: enrollment.sections?.courses?.name || '',
            credits: enrollment.sections?.courses?.credits || 0,
            grade: enrollment.grade || 'N/A',
            marks: (enrollment.grades as any[])?.reduce((sum: number, g: any) => sum + (g.marks_obtained || 0), 0) || 0,
            maxMarks: (enrollment.grades as any[])?.reduce((sum: number, g: any) => sum + (g.assessments?.max_marks || 0), 0) || 100
        }));
    }

    /**
     * Get syllabus for registered courses in a term
     */
    async getSyllabus(studentId: string, termId: string) {
        const { data, error } = await (supabase
            .from('enrollments') as any)
            .select(`
                sections!inner (
                    term_id,
                    courses (code, name, description)
                )
            `)
            .eq('student_id', studentId)
            .eq('sections.term_id', termId)
            .eq('status', 'ACTIVE');

        if (error) throw error;

        return (data || []).map((enrollment: any) => ({
            courseCode: enrollment.sections?.courses?.code || '',
            courseName: enrollment.sections?.courses?.name || '',
            syllabus: enrollment.sections?.courses?.description || 'No syllabus available.'
        }));
    }
}
