import { supabase } from '../lib/supabase';

export interface EnrollmentTrend {
    term: string;
    department: string;
    enrolled: number;
    capacity: number;
    utilizationRate: number;
}

export interface WaitlistPressure {
    courseCode: string;
    courseName: string;
    sectionNumber: string;
    capacity: number;
    enrolled: number;
    waitlisted: number;
    pressureScore: number; // waitlisted / available spots
}

export interface FinancialArrear {
    studentId: string;
    studentName: string;
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    overdueCount: number;
}

export interface AttendanceCompliance {
    sectionId: string;
    courseCode: string;
    sectionNumber: string;
    totalStudents: number;
    averageAttendance: number;
    belowThreshold: number; // students below 75%
}

export class ReportingService {
    /**
     * Get enrollment trends by term and department
     */
    async getEnrollmentTrends(
        termId?: string,
        departmentId?: string
    ): Promise<EnrollmentTrend[]> {
        let query = supabase
            .from('sections')
            .select(`
        id,
        capacity,
        enrolled_count,
        terms (name),
        courses (
          code,
          departments (name)
        )
      `)
            .eq('is_active', true);

        if (termId) {
            query = query.eq('term_id', termId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by term and department
        const grouped = new Map<string, EnrollmentTrend>();

        (data || []).forEach((section: any) => {
            const term = section.terms?.name || 'Unknown';
            const dept = section.courses?.departments?.name || 'Unknown';
            const key = `${term}-${dept}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    term,
                    department: dept,
                    enrolled: 0,
                    capacity: 0,
                    utilizationRate: 0
                });
            }

            const trend = grouped.get(key)!;
            trend.enrolled += section.enrolled_count || 0;
            trend.capacity += section.capacity || 0;
        });

        // Calculate utilization rates
        const trends = Array.from(grouped.values());
        trends.forEach(trend => {
            trend.utilizationRate = trend.capacity > 0
                ? (trend.enrolled / trend.capacity) * 100
                : 0;
        });

        return trends.sort((a, b) => b.utilizationRate - a.utilizationRate);
    }

    /**
     * Get waitlist pressure for sections
     */
    async getWaitlistPressure(termId?: string): Promise<WaitlistPressure[]> {
        let query = supabase
            .from('sections')
            .select(`
        id,
        section_number,
        capacity,
        enrolled_count,
        waitlist_count,
        courses (code, name)
      `)
            .gt('waitlist_count', 0)
            .eq('is_active', true);

        if (termId) {
            query = query.eq('term_id', termId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((section: any) => {
            const available = (section.capacity || 0) - (section.enrolled_count || 0);
            const waitlisted = section.waitlist_count || 0;

            return {
                courseCode: section.courses?.code || '',
                courseName: section.courses?.name || '',
                sectionNumber: section.section_number,
                capacity: section.capacity || 0,
                enrolled: section.enrolled_count || 0,
                waitlisted,
                pressureScore: available > 0 ? waitlisted / available : waitlisted
            };
        }).sort((a, b) => b.pressureScore - a.pressureScore);
    }

    /**
     * Get financial arrears summary
     */
    async getFinancialArrears(): Promise<FinancialArrear[]> {
        const { data, error } = await supabase
            .from('student_fees')
            .select(`
        id,
        amount,
        amount_paid,
        due_date,
        status,
        user_profiles!student_fees_student_id_fkey (
          student_id,
          first_name,
          last_name
        )
      `)
            .in('status', ['PENDING', 'OVERDUE'])
            .order('due_date', { ascending: true });

        if (error) throw error;

        // Group by student
        const grouped = new Map<string, FinancialArrear>();

        (data || []).forEach((fee: any) => {
            const studentId = fee.user_profiles?.student_id || 'Unknown';
            const studentName = fee.user_profiles
                ? `${fee.user_profiles.first_name} ${fee.user_profiles.last_name}`
                : 'Unknown';

            if (!grouped.has(studentId)) {
                grouped.set(studentId, {
                    studentId,
                    studentName,
                    totalDue: 0,
                    totalPaid: 0,
                    outstanding: 0,
                    overdueCount: 0
                });
            }

            const arrear = grouped.get(studentId)!;
            arrear.totalDue += fee.amount || 0;
            arrear.totalPaid += fee.amount_paid || 0;

            if (fee.status === 'OVERDUE') {
                arrear.overdueCount++;
            }
        });

        // Calculate outstanding
        const arrears = Array.from(grouped.values());
        arrears.forEach(arrear => {
            arrear.outstanding = arrear.totalDue - arrear.totalPaid;
        });

        return arrears
            .filter(a => a.outstanding > 0)
            .sort((a, b) => b.outstanding - a.outstanding);
    }

    /**
     * Get attendance compliance for sections
     */
    async getAttendanceCompliance(sectionId?: string): Promise<AttendanceCompliance[]> {
        let query = supabase
            .from('sections')
            .select(`
        id,
        section_number,
        courses (code),
        enrollments!inner (
          student_id,
          attendance_records (status)
        )
      `)
            .eq('is_active', true);

        if (sectionId) {
            query = query.eq('id', sectionId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((section: any) => {
            const enrollments = section.enrollments || [];
            const totalStudents = enrollments.length;

            let totalAttendanceRate = 0;
            let belowThreshold = 0;

            enrollments.forEach((enrollment: any) => {
                const records = enrollment.attendance_records || [];
                const totalClasses = records.length;
                const presentCount = records.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length;

                const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
                totalAttendanceRate += attendanceRate;

                if (attendanceRate < 75) {
                    belowThreshold++;
                }
            });

            return {
                sectionId: section.id,
                courseCode: section.courses?.code || '',
                sectionNumber: section.section_number,
                totalStudents,
                averageAttendance: totalStudents > 0 ? totalAttendanceRate / totalStudents : 0,
                belowThreshold
            };
        }).sort((a, b) => a.averageAttendance - b.averageAttendance);
    }

    /**
     * Get enrollment statistics for dashboard
     */
    async getEnrollmentStats(termId: string) {
        const { data, error } = await supabase
            .from('sections')
            .select('capacity, enrolled_count, waitlist_count')
            .eq('term_id', termId)
            .eq('is_active', true);

        if (error) throw error;

        const stats = {
            totalCapacity: 0,
            totalEnrolled: 0,
            totalWaitlisted: 0,
            utilizationRate: 0,
            sectionsCount: data?.length || 0
        };

        (data || []).forEach((section: any) => {
            stats.totalCapacity += section.capacity || 0;
            stats.totalEnrolled += section.enrolled_count || 0;
            stats.totalWaitlisted += section.waitlist_count || 0;
        });

        stats.utilizationRate = stats.totalCapacity > 0
            ? (stats.totalEnrolled / stats.totalCapacity) * 100
            : 0;

        return stats;
    }
}
