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

interface StudentImportRow {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    password?: string;
    [key: string]: string | undefined;
}

interface CourseImportRow {
    code: string;
    name: string;
    credits: string | number;
    description?: string;
    department_code?: string;
    [key: string]: string | number | undefined;
}

interface EnrollmentImportRow {
    student_id: string;
    course_code: string;
    section_number: string;
    status?: string;
    grade?: string;
    enrolled_at?: string;
    [key: string]: string | undefined;
}

export class ImportExportService {
    /**
     * Parse CSV file
     */
    async parseCSV<T = any>(file: File): Promise<{ data: T[]; errors: ValidationError[] }> {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve({
                        data: results.data as T[],
                        errors: results.errors.map((err, idx) => ({
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
    validateStudentData(data: StudentImportRow[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const requiredFields = ['student_id', 'first_name', 'last_name', 'email'];

        data.forEach((row, idx) => {
            requiredFields.forEach(field => {
                if (!row[field] || String(row[field]).trim() === '') {
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
    validateCourseData(data: CourseImportRow[]): ValidationError[] {
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
    validateEnrollmentData(data: EnrollmentImportRow[]): ValidationError[] {
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
    async importStudents(data: StudentImportRow[]): Promise<ImportResult> {
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

                if (!authUser.user) {
                    errors.push(`Row ${data.indexOf(row) + 2}: User creation failed without error message`);
                    continue;
                }

                // Then create profile
                const { error: profileError } = await (supabase
                    .from('user_profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .insert({
                        id: authUser.user.id,
                        role: 'STUDENT',
                        first_name: row.first_name,
                        last_name: row.last_name,
                        email: row.email,
                        student_id: row.student_id,
                        phone: row.phone || null,
                        is_active: true,
                        // Fix: must_change_password is required in DB types but validation might fail if omitted?
                        // Assuming default false in DB but type requires it?
                        must_change_password: true
                    });

                if (profileError) {
                    errors.push(`Row ${data.indexOf(row) + 2}: ${profileError.message}`);
                    // Cleanup: delete auth user
                    await supabase.auth.admin.deleteUser(authUser.user.id);
                    continue;
                }

                imported++;
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
    async importCourses(data: CourseImportRow[]): Promise<ImportResult> {
        let imported = 0;
        const errors: string[] = [];

        for (const row of data) {
            try {
                // Get department ID if provided
                let departmentId: string | null = null;
                if (row.department_code) {
                    const { data: dept } = await (supabase
                        .from('departments') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                        .select('id')
                        .eq('code', row.department_code)
                        .single();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    departmentId = (dept as any)?.id || null;
                }

                // Ensure department_id is string if expected, but if null then fine?
                // Database type says department_id is string (not null)? No, checked DB type: department_id: string. 
                // Wait, in courses table definition: department_id: string. NOT NULL.
                // So if departmentId is null, insert will fail.
                // We should validate department exists.
                if (row.department_code && !departmentId) {
                    errors.push(`Row ${data.indexOf(row) + 2}: Department ${row.department_code} not found`);
                    continue;
                }
                // If no department code, is it allowed? DB says required.
                if (!departmentId) {
                    // Try to find a default or error out?
                    // For now, let's error if required.
                    errors.push(`Row ${data.indexOf(row) + 2}: Department is required`);
                    continue;
                }

                const { error } = await (supabase
                    .from('courses') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .insert({
                        code: row.code,
                        name: row.name,
                        description: row.description || null,
                        credits: Number(row.credits),
                        department_id: departmentId,
                        is_active: true,
                        level: '100' // Default
                    });

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
    async importEnrollments(data: EnrollmentImportRow[]): Promise<ImportResult> {
        let imported = 0;
        const errors: string[] = [];

        for (const row of data) {
            try {
                // Find student record
                const { data: student } = await (supabase
                    .from('user_profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .select('id')
                    .eq('student_id', row.student_id)
                    .single();

                if (!student) {
                    errors.push(`Row ${data.indexOf(row) + 2}: Student ${row.student_id} not found`);
                    continue;
                }

                // Find section
                const { data: section } = await (supabase
                    .from('sections') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .select('id, term_id, enrolled_count, capacity, courses!inner(code)')
                    .eq('courses.code', row.course_code)
                    .eq('section_number', row.section_number)
                    .single();

                if (!section) {
                    errors.push(`Row ${data.indexOf(row) + 2}: Section ${row.course_code}-${row.section_number} not found`);
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const studentIdVal = (student as any).id;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sectionIdVal = (section as any).id;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const termIdVal = (section as any).term_id;

                const { error } = await (supabase
                    .from('enrollments') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .insert({
                        student_id: studentIdVal,
                        section_id: sectionIdVal,
                        term_id: termIdVal,
                        status: row.status || 'ACTIVE',
                        grade: row.grade || null,
                        enrolled_at: row.enrolled_at || new Date().toISOString()
                    });

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
        const { data, error } = await (supabase
            .from('user_profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        const { data, error } = await (supabase
            .from('courses') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
            department_code: course.departments && !Array.isArray(course.departments) ? (course.departments as any).code : ''
        }));

        return Papa.unparse(formatted);
    }

    /**
     * Export enrollments to CSV
     */
    async exportEnrollments(termId?: string): Promise<string> {
        let query = (supabase
            .from('enrollments') as any)
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
            // Note: filtering by joined table in Supabase involves specific syntax or inner join.
            // .eq('sections.term_id', termId) might work if reference is correct.
            // Using the alias 'section' defined in select.
            query = query.eq('section.term_id', termId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
