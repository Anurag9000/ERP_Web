import { supabase } from '../lib/supabase';

export interface Assignment {
    id: string;
    name: string;
    description: string | null;
    dueDate: Date;
    maxMarks: number;
    courseCode: string;
    courseName: string;
    sectionNumber: string;
    submitted: boolean;
    submissionDate?: Date;
    marksObtained?: number;
    feedback?: string;
}

export class AssignmentService {
    /**
     * Fetch assignments for a student
     */
    async fetchStudentAssignments(studentId: string): Promise<Assignment[]> {
        const { data, error } = await supabase
            .from('assessments')
            .select(`
        id,
        name,
        description,
        due_date,
        max_marks,
        sections!inner (
          section_number,
          courses (code, name),
          enrollments!inner (
            student_id,
            grades (
              marks_obtained,
              feedback,
              submitted_at
            )
          )
        )
      `)
            .eq('sections.enrollments.student_id', studentId)
            .eq('sections.enrollments.status', 'ACTIVE')
            .order('due_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((assessment: any) => {
            const enrollment = assessment.sections?.enrollments?.[0];
            const grade = enrollment?.grades?.[0];

            return {
                id: assessment.id,
                name: assessment.name,
                description: assessment.description,
                dueDate: new Date(assessment.due_date),
                maxMarks: assessment.max_marks || 100,
                courseCode: assessment.sections?.courses?.code || '',
                courseName: assessment.sections?.courses?.name || '',
                sectionNumber: assessment.sections?.section_number || '',
                submitted: !!grade?.submitted_at,
                submissionDate: grade?.submitted_at ? new Date(grade.submitted_at) : undefined,
                marksObtained: grade?.marks_obtained,
                feedback: grade?.feedback
            };
        });
    }

    /**
     * Submit assignment (mock file upload)
     */
    async submitAssignment(
        assessmentId: string,
        studentId: string,
        file: File
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // In a real implementation, you would upload the file to storage
            // For now, we'll just record the submission

            // Get assessment to find its section
            const { data: assessment, error: assessmentError } = await supabase
                .from('assessments')
                .select('section_id')
                .eq('id', assessmentId)
                .single();

            if (assessmentError) throw assessmentError;

            // Get the specific enrollment for this section and student
            const { data: enrollment, error: enrollError } = await supabase
                .from('enrollments')
                .select('id')
                .eq('student_id', studentId)
                .eq('section_id', (assessment as any).section_id)
                .single();

            if (enrollError) throw enrollError;

            // Create or update grade record
            const { error: gradeError } = await supabase
                .from('grades')
                .upsert({
                    enrollment_id: (enrollment as any).id,
                    assessment_id: assessmentId,
                    submitted_at: new Date().toISOString(),
                    // Store file name as reference
                    feedback: `Submitted: ${file.name}`
                } as any);

            if (gradeError) throw gradeError;

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get assignment marks for a student
     */
    async getAssignmentMarks(
        assessmentId: string,
        studentId: string
    ): Promise<{ marksObtained?: number; feedback?: string }> {
        const { data, error } = await supabase
            .from('grades')
            .select(`
        marks_obtained,
        feedback,
        enrollments!inner (student_id)
      `)
            .eq('assessment_id', assessmentId)
            .eq('enrollments.student_id', studentId)
            .single();

        if (error) {
            console.error('Error fetching marks:', error);
            return {};
        }

        return {
            marksObtained: (data as any)?.marks_obtained,
            feedback: (data as any)?.feedback
        };
    }

    /**
     * Get upcoming assignments (due within next 7 days)
     */
    async getUpcomingAssignments(studentId: string): Promise<Assignment[]> {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const assignments = await this.fetchStudentAssignments(studentId);

        return assignments.filter(a =>
            a.dueDate >= now &&
            a.dueDate <= nextWeek &&
            !a.submitted
        );
    }
}
