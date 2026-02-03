// @ts-nocheck
import { supabase } from '../lib/supabase';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface TeachingSection {
  id: string;
  courseCode: string;
  courseName: string;
  termName: string;
  schedule: string;
  enrollmentCount: number;
}

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AttendanceRecord {
  id: string;
  sectionId: string;
  studentId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  minutesLate: number;
  notes: string | null;
}

export class InstructorAttendanceService {
  async fetchSections(instructorId: string): Promise<TeachingSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select(
        `
        id,
        section_number,
        schedule_days,
        start_time,
        end_time,
        enrolled_count,
        courses(code, name),
        terms(name)
      `
      )
      .eq('instructor_id', instructorId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((section: any) => ({
      id: section.id,
      courseCode: section.courses?.code || '',
      courseName: section.courses?.name || '',
      termName: section.terms?.name || '',
      schedule: `${(section.schedule_days || []).join('/')} ${section.start_time || ''}-${section.end_time || ''}`,
      enrollmentCount: section.enrolled_count || 0,
    }));
  }

  async fetchRoster(sectionId: string): Promise<RosterStudent[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        student_id,
        user_profiles!enrollments_student_id_fkey (
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('section_id', sectionId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true });
    if (error) throw error;

    return (data || []).map((enrollment: any) => ({
      id: enrollment.student_id,
      firstName: enrollment.user_profiles?.first_name || '',
      lastName: enrollment.user_profiles?.last_name || '',
      email: enrollment.user_profiles?.email || '',
    }));
  }

  async fetchAttendance(sectionId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('section_id', sectionId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((record: any) => ({
      id: record.id,
      sectionId: record.section_id,
      studentId: record.student_id,
      attendanceDate: record.attendance_date,
      status: record.status as AttendanceStatus,
      minutesLate: record.minutes_late || 0,
      notes: record.notes || null,
    }));
  }

  async saveAttendance(
    sectionId: string,
    date: string,
    payload: { studentId: string; status: AttendanceStatus; minutesLate: number; notes: string | null }[]
  ) {
    if (!payload.length) {
      return;
    }
    const upsertPayload = payload.map((entry) => ({
      section_id: sectionId,
      student_id: entry.studentId,
      attendance_date: date,
      status: entry.status,
      minutes_late: entry.minutesLate,
      notes: entry.notes,
    }));

    const { error } = await (supabase
      .from('attendance_records')
      .upsert(upsertPayload, { onConflict: 'section_id,student_id,attendance_date' }) as any);
    if (error) throw error;
  }
}
