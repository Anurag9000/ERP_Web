// @ts-nocheck
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';

export interface ImportResult {
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
}

export interface ValidationError {
    row: number;
    field: string;
    message: string;
}

export class ImportExportService {
    /**
     * Parse CSV file
     */
    async parseCSV(file: File): Promise<{ data: any[]; errors: ValidationError[] }> {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve({
                        data: results.data,
                        errors: results.errors.map((err: any, idx: number) => ({
                            row: idx + 1,
                            field: 'unknown',
                            message: err.message
                        }))
                    });
                },
                error: (error) => {
                    resolve({
                        data: [],
                        errors: [{ row: 0, field: 'file', message: error.message }]
                    });
                }
            });
        });
    }

    /**
     * Validate student import data
     */
    validateStudentData(data: any[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const requiredFields = ['student_id', 'first_name', 'last_name', 'email'];

        data.forEach((row, idx) => {
            requiredFields.forEach(field => {
                if (!row[field] || row[field].trim() === '') {
                    errors.push({
                        row: idx + 2, // +2 because of header and 0-index
                        field,
                        message: `${field} is required`
                    });
                }
            });

            // Validate email format
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push({
                    row: idx + 2,
                    field: 'email',
                    message: 'Invalid email format'
                });
            }
        });

        return errors;
    }

    /**
     * Validate course import data
     */
    validateCourseData(data: any[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const requiredFields = ['code', 'name', 'credits'];

        data.forEach((row, idx) => {
            requiredFields.forEach(field => {
                if (!row[field] || String(row[field]).trim() === '') {
                    errors.push({
                        row: idx + 2,
                        field,
                        message: `${field} is required`
                    });
                }
            });

            // Validate credits is a number
            if (row.credits && isNaN(Number(row.credits))) {
                errors.push({
                    row: idx + 2,
                    field: 'credits',
                    message: 'Credits must be a number'
                });
            }
        });

        return errors;
    }

    /**
     * Validate enrollment import data
     */
    validateEnrollmentData(data: any[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const requiredFields = ['student_id', 'course_code', 'section_number', 'status'];

        data.forEach((row, idx) => {
            requiredFields.forEach(field => {
                if (!row[field] || String(row[field]).trim() === '') {
                    errors.push({
                        row: idx + 2,
                        field,
                        message: `${field} is required`
                    });
                }
            });
        });

        return errors;
    }

    /**
     * Import students with transaction support
     */
    async importStudents(data: any[]): Promise<ImportResult> {
        let imported = 0;
        const errors: string[] = [];

        for (const row of data) {
            try {
                // First create auth user
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: row.email,
                    password: row.password || 'ChangeMe123!',
                    email_confirm: true
                });

                if (authError) {
                    errors.push(`Row ${data.indexOf(row) + 2}: ${authError.message}`);
                    continue;
                }

                // Then create profile
                const { error: profileError } = await (supabase
                    .from('user_profiles')
                    .insert({
                        id: authUser.user.id,
                        role: 'STUDENT',
                        first_name: row.first_name,
                        last_name: row.last_name,
                        email: row.email,
                        student_id: row.student_id,
                        phone: row.phone || null,
                        is_active: true
                    } as any) as any);

                if (profileError) {
                    errors.push(`Row ${data.indexOf(row) + 2}: ${profileError.message}`);
                    // Cleanup: delete auth user
                    await supabase.auth.admin.deleteUser(authUser.user.id);
                    continue;
                }

                imported++;
            } catch (error: any) {
                errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            imported,
            failed: data.length - imported,
            errors
        };
    }

    /**
     * Import courses
     */
    async importCourses(data: any[]): Promise<ImportResult> {
        let imported = 0;
        const errors: string[] = [];

        for (const row of data) {
            try {
                // Get department ID if provided
                let departmentId = null;
                if (row.department_code) {
                    const { data: dept } = await supabase
                        .from('departments')
                        .select('id')
                        .eq('code', row.department_code)
                        .single();
                    departmentId = dept?.id || null;
                }

                const { error } = await (supabase
                    .from('courses')
                    .insert({
                        code: row.code,
                        name: row.name,
                        description: row.description || null,
                        credits: Number(row.credits),
                        department_id: departmentId,
                        is_active: true
                    } as any) as any);

                if (error) {
                    errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
                    continue;
                }

                imported++;
            } catch (error: any) {
                errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            imported,
            failed: data.length - imported,
            errors
        };
    }

    /**
     * Import enrollments
     */
    async importEnrollments(data: any[]): Promise<ImportResult> {
        let imported = 0;
        const errors: string[] = [];

        for (const row of data) {
            try {
                // Find student record
                const { data: student } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('student_id', row.student_id)
                    .single();

                if (!student) {
                    errors.push(`Row ${data.indexOf(row) + 2}: Student ${row.student_id} not found`);
                    continue;
                }

                // Find section
                const { data: section } = await supabase
                    .from('sections')
                    .select('id, enrolled_count, capacity, courses!inner(code)')
                    .eq('courses.code', row.course_code)
                    .eq('section_number', row.section_number)
                    .single() as any;

                if (!section) {
                    errors.push(`Row ${data.indexOf(row) + 2}: Section ${row.course_code}-${row.section_number} not found`);
                    continue;
                }

                const { error } = await (supabase
                    .from('enrollments')
                    .insert({
                        student_id: (student as any).id,
                        section_id: (section as any).id,
                        status: row.status || 'ACTIVE',
                        grade: row.grade || null,
                        enrolled_at: row.enrolled_at || new Date().toISOString()
                    } as any) as any);

                if (error) {
                    errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
                    continue;
                }

                imported++;
            } catch (error: any) {
                errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            imported,
            failed: data.length - imported,
            errors
        };
    }

    /**
     * Export students to CSV
     */
    async exportStudents(): Promise<string> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('student_id, first_name, last_name, email, phone')
            .eq('role', 'STUDENT')
            .eq('is_active', true)
            .order('student_id');

        if (error) throw error;

        return Papa.unparse(data || []);
    }

    /**
     * Export courses to CSV
     */
    async exportCourses(): Promise<string> {
        const { data, error } = await supabase
            .from('courses')
            .select(`
        code,
        name,
        description,
        credits,
        departments (code)
      `)
            .eq('is_active', true)
            .order('code');

        if (error) throw error;

        const formatted = (data || []).map((course: any) => ({
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            department_code: course.departments?.code || ''
        }));

        return Papa.unparse(formatted);
    }

    /**
     * Export enrollments to CSV
     */
    async exportEnrollments(termId?: string): Promise<string> {
        let query = supabase
            .from('enrollments')
            .select(`
        student_id:user_profiles!enrollments_student_id_fkey (student_id),
        section:sections (
          section_number,
          course:courses (code)
        ),
        status,
        grade,
        enrolled_at
      `)
            .order('enrolled_at', { ascending: false });

        if (termId) {
            query = query.eq('sections.term_id', termId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const formatted = (data || []).map((enrollment: any) => ({
            student_id: enrollment.student_id?.student_id || '',
            course_code: enrollment.section?.course?.code || '',
            section_number: enrollment.section?.section_number || '',
            status: enrollment.status,
            grade: enrollment.grade || '',
            enrolled_at: enrollment.enrolled_at
        }));

        return Papa.unparse(formatted);
    }
}
