// @ts-nocheck
import { supabase } from '../lib/supabase';

export interface DegreeRequirement {
    category: string;
    required: number;
    completed: number;
    inProgress: number;
    remaining: number;
}

export interface DegreeProgress {
    totalCredits: number;
    completedCredits: number;
    inProgressCredits: number;
    cgpa: number;
    requirements: DegreeRequirement[];
    suggestedCourses: Array<{
        code: string;
        name: string;
        credits: number;
        reason: string;
    }>;
}

export class DegreeAuditService {
    /**
     * Calculate degree progress for a student
     */
    async calculateDegreeProgress(
        studentId: string,
        programId?: string
    ): Promise<DegreeProgress> {
        // Get completed courses
        const { data: completedEnrollments, error: completedError } = await supabase
            .from('enrollments')
            .select(`
        grade,
        sections (
          courses (code, name, credits, course_type)
        )
      `)
            .eq('student_id', studentId)
            .in('status', ['COMPLETED'])
            .not('grade', 'is', null);

        if (completedError) throw completedError;

        // Get in-progress courses
        const { data: activeEnrollments, error: activeError } = await supabase
            .from('enrollments')
            .select(`
        sections (
          courses (code, name, credits, course_type)
        )
      `)
            .eq('student_id', studentId)
            .eq('status', 'ACTIVE');

        if (activeError) throw activeError;

        // Calculate totals
        let completedCredits = 0;
        let inProgressCredits = 0;
        let totalGradePoints = 0;
        let gradedCourses = 0;

        const requirementsMap = new Map<string, DegreeRequirement>();

        (completedEnrollments || []).forEach((enrollment: any) => {
            const course = enrollment.sections?.courses;
            if (!course) return;

            const credits = course.credits || 0;
            completedCredits += credits;

            // Calculate GPA
            const gradePoint = this.gradeToPoints(enrollment.grade);
            if (gradePoint > 0) {
                totalGradePoints += gradePoint * credits;
                gradedCourses += credits;
            }

            // Track requirements
            const category = course.course_type || 'ELECTIVE';
            if (!requirementsMap.has(category)) {
                requirementsMap.set(category, {
                    category,
                    required: 0,
                    completed: 0,
                    inProgress: 0,
                    remaining: 0
                });
            }
            const req = requirementsMap.get(category)!;
            req.completed += credits;
        });

        (activeEnrollments || []).forEach((enrollment: any) => {
            const course = enrollment.sections?.courses;
            if (!course) return;

            const credits = course.credits || 0;
            inProgressCredits += credits;

            const category = course.course_type || 'ELECTIVE';
            if (!requirementsMap.has(category)) {
                requirementsMap.set(category, {
                    category,
                    required: 0,
                    completed: 0,
                    inProgress: 0,
                    remaining: 0
                });
            }
            const req = requirementsMap.get(category)!;
            req.inProgress += credits;
        });

        // Set typical requirements (would come from program definition in real system)
        const requirements: DegreeRequirement[] = [
            { category: 'CORE', required: 60, completed: 0, inProgress: 0, remaining: 0 },
            { category: 'MAJOR', required: 30, completed: 0, inProgress: 0, remaining: 0 },
            { category: 'ELECTIVE', required: 30, completed: 0, inProgress: 0, remaining: 0 }
        ];

        requirements.forEach(req => {
            const actual = requirementsMap.get(req.category);
            if (actual) {
                req.completed = actual.completed;
                req.inProgress = actual.inProgress;
            }
            req.remaining = Math.max(0, req.required - req.completed - req.inProgress);
        });

        const cgpa = gradedCourses > 0 ? totalGradePoints / gradedCourses : 0;

        return {
            totalCredits: 120, // Typical bachelor's degree
            completedCredits,
            inProgressCredits,
            cgpa,
            requirements,
            suggestedCourses: [] // Would be populated based on missing requirements
        };
    }

    /**
     * Convert letter grade to grade points
     */
    private gradeToPoints(grade: string): number {
        const gradeMap: { [key: string]: number } = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D': 1.0, 'F': 0.0
        };
        return gradeMap[grade] || 0;
    }

    /**
     * Identify students at risk (for advisors)
     */
    async identifyRiskStudents(advisorId: string) {
        // Get advisees
        const { data: students, error } = await supabase
            .from('user_profiles')
            .select('id, student_id, first_name, last_name')
            .eq('advisor_id', advisorId)
            .eq('role', 'STUDENT');

        if (error) throw error;

        const riskStudents = [];

        for (const student of students || []) {
            const progress = await this.calculateDegreeProgress(student.id);

            // Risk criteria: CGPA < 2.0 or behind on credits
            const expectedCredits = 30; // Per year assumption
            const isBehind = progress.completedCredits < expectedCredits;
            const lowGPA = progress.cgpa < 2.0;

            if (isBehind || lowGPA) {
                riskStudents.push({
                    studentId: student.student_id,
                    studentName: `${student.first_name} ${student.last_name}`,
                    cgpa: progress.cgpa,
                    completedCredits: progress.completedCredits,
                    riskFactors: [
                        ...(lowGPA ? ['Low GPA'] : []),
                        ...(isBehind ? ['Behind on Credits'] : [])
                    ]
                });
            }
        }

        return riskStudents;
    }
}
