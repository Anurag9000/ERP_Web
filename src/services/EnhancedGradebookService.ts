
import { supabase } from '../lib/supabase';

export interface GradeEntry {
    enrollmentId: string;
    studentId: string;
    studentName: string;
    assessmentId: string;
    marksObtained?: number;
    maxMarks: number;
    percentage?: number;
}

export interface GradeDistribution {
    grade: string;
    count: number;
    percentage: number;
}

export class EnhancedGradebookService {
    /**
     * Create new assessment for a section
     */
    async createAssessment(
        sectionId: string,
        name: string,
        assessmentType: 'ASSIGNMENT' | 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PROJECT',
        maxMarks: number,
        dueDate: Date
    ): Promise<{ success: boolean; assessmentId?: string; error?: string }> {
        try {
            // Validate maxMarks
            if (!maxMarks || maxMarks <= 0 || isNaN(maxMarks)) {
                return {
                    success: false,
                    error: 'Maximum marks must be a positive number greater than zero'
                };
            }

            const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('assessments')
                .insert({
                    section_id: sectionId,
                    name,
                    assessment_type: assessmentType,
                    max_marks: maxMarks,
                    due_date: dueDate.toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, assessmentId: data.id };
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk update grades for an assessment
     */
    async bulkUpdateGrades(
        grades: Array<{ enrollmentId: string; assessmentId: string; marksObtained: number }>
    ): Promise<{ success: boolean; updated: number; error?: string; errors?: string[] }> {
        try {
            let updated = 0;
            const errors: string[] = [];

            for (const grade of grades) {
                const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .from('grades')
                    .upsert({
                        enrollment_id: grade.enrollmentId,
                        assessment_id: grade.assessmentId,
                        marks_obtained: grade.marksObtained,
                        submitted_at: new Date().toISOString()
                    });

                if (error) {
                    errors.push(`Enrollment ${grade.enrollmentId}: ${error.message}`);
                } else {
                    updated++;
                }
            }

            // Return success only if all grades updated successfully
            if (errors.length === 0) {
                return { success: true, updated };
            } else {
                return {
                    success: false,
                    updated,
                    error: `${errors.length} grade(s) failed to update`,
                    errors
                };
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return { success: false, updated: 0, error: error.message };
        }
    }

    /**
     * Calculate final grades for a section
     */
    async calculateFinalGrades(sectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Get all enrollments for the section
            const { data: enrollments, error: enrollError } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('enrollments')
                .select(`
          id,
          student_id,
          grades (
            marks_obtained,
            assessments (max_marks, assessment_type)
          )
        `)
                .eq('section_id', sectionId)
                .eq('status', 'ACTIVE');

            if (enrollError) throw enrollError;

            // Calculate final grade for each student
            for (const enrollment of enrollments || []) {
                const grades = enrollment.grades || [];

                let totalMarks = 0;
                let totalMaxMarks = 0;

                // Only count grades where assessment has valid max_marks
                grades.forEach((g: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const maxMarks = g.assessments?.max_marks;
                    if (maxMarks && maxMarks > 0) {
                        totalMarks += g.marks_obtained || 0;
                        totalMaxMarks += maxMarks;
                    }
                });

                const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
                const letterGrade = this.percentageToGrade(percentage);

                // Update enrollment with final grade
                await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .from('enrollments')
                    .update({ grade: letterGrade })
                    .eq('id', enrollment.id);
            }

            return { success: true };
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return { success: false, error: error.message };
        }
    }

    /**
     * Get grade distribution for a section
     */
    async getGradeDistribution(sectionId: string): Promise<GradeDistribution[]> {
        const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('enrollments')
            .select('grade')
            .eq('section_id', sectionId)
            .eq('status', 'ACTIVE')
            .not('grade', 'is', null);

        if (error) throw error;

        // Count grades
        const gradeCounts = new Map<string, number>();
        const total = (data || []).length;

        (data || []).forEach((e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const grade = e.grade;
            gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
        });

        // Convert to array
        const distribution: GradeDistribution[] = [];
        const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

        gradeOrder.forEach(grade => {
            const count = gradeCounts.get(grade) || 0;
            if (count > 0 || gradeCounts.size === 0) {
                distribution.push({
                    grade,
                    count,
                    percentage: total > 0 ? (count / total) * 100 : 0
                });
            }
        });

        return distribution;
    }

    /**
     * Convert percentage to letter grade
     */
    private percentageToGrade(percentage: number): string {
        if (percentage >= 97) return 'A+';
        if (percentage >= 93) return 'A';
        if (percentage >= 90) return 'A-';
        if (percentage >= 87) return 'B+';
        if (percentage >= 83) return 'B';
        if (percentage >= 80) return 'B-';
        if (percentage >= 77) return 'C+';
        if (percentage >= 73) return 'C';
        if (percentage >= 70) return 'C-';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    /**
     * Export grades to CSV
     */
    async exportGradesToCSV(sectionId: string): Promise<string> {
        const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('enrollments')
            .select(`
        grade,
        user_profiles (student_id, first_name, last_name, email),
        grades (
          marks_obtained,
          assessments (name, max_marks)
        )
      `)
            .eq('section_id', sectionId)
            .eq('status', 'ACTIVE');

        if (error) throw error;

        // Build CSV
        let csv = 'Student ID,Name,Email,Final Grade\n';

        (data || []).forEach((enrollment: any) => {
            const profile = enrollment.user_profiles;
            csv += `${profile.student_id},"${profile.first_name} ${profile.last_name}",${profile.email},${enrollment.grade || 'N/A'}\n`;
        });

        return csv;
    }
}
