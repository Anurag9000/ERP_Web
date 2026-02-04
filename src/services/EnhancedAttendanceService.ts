
import { supabase } from '../lib/supabase';

export interface AttendanceStats {
    totalClasses: number;
    totalPresent: number;
    totalAbsent: number;
    attendanceRate: number;
    lowAttendanceStudents: Array<{
        studentId: string;
        studentName: string;
        attendanceRate: number;
    }>;
}

export class EnhancedAttendanceService {
    /**
     * Mark all students present/absent quickly
     */
    async markAllAttendance(
        sectionId: string,
        date: Date,
        status: boolean
    ): Promise<{ success: boolean; marked: number; error?: string }> {
        try {
            // Get all enrollments
            const { data: enrollments, error: enrollError } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('enrollments')
                .select('id, student_id')
                .eq('section_id', sectionId)
                .eq('status', 'ACTIVE');

            if (enrollError) throw enrollError;

            let marked = 0;

            // Mark attendance for each student
            for (const enrollment of enrollments || []) {
                const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .from('attendance_records')
                    .upsert({
                        section_id: sectionId,
                        student_id: enrollment.student_id,
                        attendance_date: date.toISOString().split('T')[0],
                        status: status ? 'PRESENT' : 'ABSENT'
                    });

                if (!error) marked++;
            }

            return { success: true, marked };
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return { success: false, marked: 0, error: error.message };
        }
    }

    /**
     * Get attendance statistics for a section
     */
    async getAttendanceStats(
        sectionId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AttendanceStats> {
        let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('attendance_records')
            .select(`
        status,
        attendance_date,
        enrollments!inner (
          section_id,
          student_id,
          user_profiles (student_id, first_name, last_name)
        )
      `)
            .eq('enrollments.section_id', sectionId);

        if (startDate) {
            query = query.gte('attendance_date', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
            query = query.lte('attendance_date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;
        if (error) throw error;

        const totalClasses = new Set((data || []).map((r: any) => r.attendance_date)).size; // eslint-disable-line @typescript-eslint/no-explicit-any
        const totalPresent = (data || []).filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length; // eslint-disable-line @typescript-eslint/no-explicit-any
        const totalAbsent = (data || []).filter((r: any) => r.status === 'ABSENT').length; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Calculate per-student attendance
        const studentAttendance = new Map<string, { present: number; total: number; name: string }>();

        (data || []).forEach((record: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const studentId = record.enrollments?.user_profiles?.student_id;
            const studentName = record.enrollments?.user_profiles
                ? `${record.enrollments.user_profiles.first_name} ${record.enrollments.user_profiles.last_name}`
                : 'Unknown';

            if (!studentAttendance.has(studentId)) {
                studentAttendance.set(studentId, { present: 0, total: 0, name: studentName });
            }

            const stats = studentAttendance.get(studentId)!;
            stats.total++;
            if (record.status === 'PRESENT' || record.status === 'LATE') stats.present++;
        });

        // Find low attendance students (< 75%)
        const lowAttendanceStudents: any[] = [];
        studentAttendance.forEach((stats, studentId) => {
            const rate = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
            if (rate < 75) {
                lowAttendanceStudents.push({
                    studentId,
                    studentName: stats.name,
                    attendanceRate: rate
                });
            }
        });

        return {
            totalClasses,
            totalPresent,
            totalAbsent,
            attendanceRate: totalClasses > 0 ? (totalPresent / (totalPresent + totalAbsent)) * 100 : 0,
            lowAttendanceStudents: lowAttendanceStudents.sort((a, b) => a.attendanceRate - b.attendanceRate)
        };
    }

    /**
     * Export attendance to CSV
     */
    async exportAttendanceCSV(
        sectionId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<string> {
        let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('attendance_records')
            .select(`
        date,
        present,
        enrollments!inner (
          section_id,
          user_profiles (student_id, first_name, last_name)
        )
      `)
            .eq('enrollments.section_id', sectionId)
            .order('attendance_date', { ascending: true });

        if (startDate) {
            query = query.gte('attendance_date', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
            query = query.lte('attendance_date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Build CSV
        let csv = 'Date,Student ID,Name,Status\n';

        (data || []).forEach((record: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const profile = record.enrollments?.user_profiles;
            const isPresent = record.status === 'PRESENT' || record.status === 'LATE';
            csv += `${record.attendance_date},${profile?.student_id},"${profile?.first_name} ${profile?.last_name}",${isPresent ? 'Present' : 'Absent'}\n`;
        });

        return csv;
    }

    /**
     * Send low attendance alerts
     */
    async sendLowAttendanceAlerts(sectionId: string): Promise<{ success: boolean; alertsSent: number }> {
        try {
            const stats = await this.getAttendanceStats(sectionId);

            // In a real implementation, this would send emails/notifications
            // For now, we'll just return the count

            return {
                success: true,
                alertsSent: stats.lowAttendanceStudents.length
            };
        } catch (error) {
            return { success: false, alertsSent: 0 };
        }
    }
}
