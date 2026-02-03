// @ts-nocheck
import { supabase } from '../lib/supabase';

export interface AppointmentRequest {
    id: string;
    studentId: string;
    studentName: string;
    instructorId: string;
    requestedDate: Date;
    requestedTime: string;
    purpose: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: Date;
}

export interface InstructorProfile {
    id: string;
    name: string;
    email: string;
    department: string;
    officeHours: string;
    officeLocation: string;
    currentStatus: 'AVAILABLE' | 'IN_CLASS' | 'IN_MEETING' | 'UNAVAILABLE';
}

export class FacultyService {
    /**
     * Get all instructors
     */
    async fetchInstructors(): Promise<InstructorProfile[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select(`
        id,
        first_name,
        last_name,
        email,
        office_hours,
        office_location,
        departments (name)
      `)
            .eq('role', 'INSTRUCTOR')
            .eq('is_active', true)
            .order('last_name');

        if (error) throw error;

        return (data || []).map((prof: any) => ({
            id: prof.id,
            name: `${prof.first_name} ${prof.last_name}`,
            email: prof.email,
            department: prof.departments?.name || 'N/A',
            officeHours: prof.office_hours || 'Not set',
            officeLocation: prof.office_location || 'Not set',
            currentStatus: this.determineStatus(prof.office_hours)
        }));
    }

    /**
     * Request appointment with instructor
     */
    async requestAppointment(
        studentId: string,
        instructorId: string,
        requestedDate: Date,
        requestedTime: string,
        purpose: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('appointment_requests')
                .insert({
                    student_id: studentId,
                    instructor_id: instructorId,
                    requested_date: requestedDate.toISOString().split('T')[0],
                    requested_time: requestedTime,
                    purpose,
                    status: 'PENDING'
                });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get appointment requests for instructor
     */
    async getInstructorAppointments(instructorId: string): Promise<AppointmentRequest[]> {
        const { data, error } = await supabase
            .from('appointment_requests')
            .select(`
        id,
        requested_date,
        requested_time,
        purpose,
        status,
        created_at,
        user_profiles!appointment_requests_student_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
            .eq('instructor_id', instructorId)
            .order('requested_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((req: any) => ({
            id: req.id,
            studentId: req.user_profiles?.id || '',
            studentName: req.user_profiles
                ? `${req.user_profiles.first_name} ${req.user_profiles.last_name}`
                : 'Unknown',
            instructorId,
            requestedDate: new Date(req.requested_date),
            requestedTime: req.requested_time,
            purpose: req.purpose,
            status: req.status,
            createdAt: new Date(req.created_at)
        }));
    }

    /**
     * Approve/reject appointment
     */
    async updateAppointmentStatus(
        appointmentId: string,
        status: 'APPROVED' | 'REJECTED'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('appointment_requests')
                .update({ status })
                .eq('id', appointmentId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Determine current status and location based on teaching schedule
     */
    async getCurrentStatus(instructorId: string): Promise<{ status: string; location?: string }> {
        const now = new Date();
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const currentDay = days[now.getDay()];
        const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

        const { data: section, error } = await supabase
            .from('sections')
            .select(`
                id,
                rooms (code, name),
                courses (name)
            `)
            .eq('instructor_id', instructorId)
            .contains('schedule_days', [currentDay])
            .lte('start_time', currentTime)
            .gte('end_time', currentTime)
            .single();

        if (error || !section) {
            return { status: 'AVAILABLE' };
        }

        return {
            status: 'IN_CLASS',
            location: section.rooms ? `${section.rooms.code} (${section.courses?.name})` : 'Unknown Room'
        };
    }

    /**
     * Determine current status based on office hours (simplified for list view)
     */
    private determineStatus(officeHours: string): 'AVAILABLE' | 'IN_CLASS' | 'IN_MEETING' | 'UNAVAILABLE' {
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 9 && hour < 17) {
            return 'AVAILABLE';
        }
        return 'UNAVAILABLE';
    }
}
