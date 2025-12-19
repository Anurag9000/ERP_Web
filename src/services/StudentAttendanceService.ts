import { supabase } from '../lib/supabase';

export interface StudentAttendanceRecord {
    courseCode: string;
    courseName: string;
    totalClasses: number;
    attended: number;
    attendancePercentage: number;
    status: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export class StudentAttendanceService {
    /**
     * Get attendance records for a student
     */
    async getStudentAttendance(studentId: string, termId?: string): Promise<StudentAttendanceRecord[]> {
        let query = supabase
            .from('attendance_records')
            .select(`
        status,
        enrollments!inner (
          id,
          sections!inner (
            id,
            courses (code, name),
            term_id
          )
        )
      `)
            .eq('enrollments.student_id', studentId);

        if (termId) {
            query = query.eq('enrollments.sections.term_id', termId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by course
        const courseMap = new Map<string, {
            code: string;
            name: string;
            total: number;
            attended: number;
        }>();

        (data || []).forEach((record: any) => {
            const course = record.enrollments?.sections?.courses;
            if (!course) return;

            const key = course.code;
            if (!courseMap.has(key)) {
                courseMap.set(key, {
                    code: course.code,
                    name: course.name,
                    total: 0,
                    attended: 0
                });
            }

            const stats = courseMap.get(key)!;
            stats.total++;
            if (record.status === 'PRESENT' || record.status === 'LATE') stats.attended++;
        });

        // Convert to array with status
        const records: StudentAttendanceRecord[] = [];
        courseMap.forEach(stats => {
            const percentage = stats.total > 0 ? (stats.attended / stats.total) * 100 : 0;

            let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
            if (percentage < 65) status = 'CRITICAL';
            else if (percentage < 75) status = 'WARNING';

            records.push({
                courseCode: stats.code,
                courseName: stats.name,
                totalClasses: stats.total,
                attended: stats.attended,
                attendancePercentage: percentage,
                status
            });
        });

        return records.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
    }

    /**
     * Get attendance impact on internal marks
     */
    async getAttendanceImpact(studentId: string, courseId: string): Promise<{
        attendancePercentage: number;
        attendanceMarks: number;
        maxAttendanceMarks: number;
        impact: string;
    }> {
        const records = await this.getStudentAttendance(studentId);
        const courseRecord = records.find(r => r.courseCode === courseId);

        if (!courseRecord) {
            return {
                attendancePercentage: 0,
                attendanceMarks: 0,
                maxAttendanceMarks: 10,
                impact: 'No attendance data available'
            };
        }

        // Calculate marks (typically 10% of total)
        const maxMarks = 10;
        const attendanceMarks = (courseRecord.attendancePercentage / 100) * maxMarks;

        let impact = 'Good attendance';
        if (courseRecord.attendancePercentage < 65) {
            impact = 'Critical - May affect eligibility';
        } else if (courseRecord.attendancePercentage < 75) {
            impact = 'Warning - Improve attendance';
        }

        return {
            attendancePercentage: courseRecord.attendancePercentage,
            attendanceMarks: Math.round(attendanceMarks * 10) / 10,
            maxAttendanceMarks: maxMarks,
            impact
        };
    }
}
