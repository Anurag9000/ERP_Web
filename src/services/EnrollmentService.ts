import { supabase } from '../lib/supabase';

export interface RegistrationDepartment {
  id: string;
  code: string;
  name: string;
}

export interface RegistrationSection {
  id: string;
  section_number: string;
  capacity: number;
  enrolled_count: number;
  waitlist_count: number;
  schedule_days: string[];
  start_time: string;
  end_time: string;
  status: string;
  term_id: string;
  courses: {
    code: string;
    name: string;
    description?: string;
    credits: number;
    level: string;
    departments: RegistrationDepartment;
  };
  rooms: {
    code: string | null;
    name: string | null;
  } | null;
  terms: {
    id: string;
    name: string;
    code: string;
    drop_deadline: string | null;
  };
}

export interface RegistrationEnrollment {
  id: string;
  status: string;
  section_id: string;
  enrolled_at: string;
  sections: RegistrationSection;
}

export interface RegistrationWaitlist {
  id: string;
  status: string;
  position: number;
  section_id: string;
  sections: RegistrationSection;
}

export interface RegistrationData {
  enrollments: RegistrationEnrollment[];
  waitlists: RegistrationWaitlist[];
  sections: RegistrationSection[];
  departments: RegistrationDepartment[];
}

import { AuditService } from './AuditService';

export class EnrollmentService {
  constructor(private readonly audit: AuditService) {}
  async fetchRegistrationData(studentId: string): Promise<RegistrationData> {
    const [enrollmentResp, waitlistResp, sectionResp, departmentResp] = await Promise.all([
      supabase
        .from('enrollments')
        .select(
          `
            id,
            status,
            section_id,
            enrolled_at,
            sections (
              id,
              section_number,
              capacity,
              enrolled_count,
              waitlist_count,
              schedule_days,
              start_time,
              end_time,
              status,
              term_id,
              courses (
                code,
                name,
                description,
                credits,
                level,
                departments (code, name, color, id)
              ),
              rooms (code, name),
              terms (id, name, code, drop_deadline)
            )
          `
        )
        .eq('student_id', studentId)
        .neq('status', 'DROPPED')
        .order('enrolled_at', { ascending: false }),
      supabase
        .from('waitlists')
        .select(
          `
            id,
            status,
            position,
            section_id,
            sections(
              id,
              section_number,
              capacity,
              enrolled_count,
              waitlist_count,
              schedule_days,
              start_time,
              end_time,
              status,
              term_id,
              courses(code, name, credits, level, departments(code, name, color, id)),
              rooms(code, name),
              terms(id, name, code, drop_deadline)
            )
          `
        )
        .eq('student_id', studentId)
        .order('position', { ascending: true }),
      supabase
        .from('sections')
        .select(
          `
            *,
            courses(
              code,
              name,
              description,
              credits,
              level,
              departments(code, name, color, id)
            ),
            rooms(code, name),
            terms(id, name, code, drop_deadline)
          `
        )
        .eq('is_active', true)
        .order('courses(code)'),
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
    ]);

    if (enrollmentResp.error) throw enrollmentResp.error;
    if (waitlistResp.error) throw waitlistResp.error;
    if (sectionResp.error) throw sectionResp.error;
    if (departmentResp.error) throw departmentResp.error;

    return {
      enrollments: (enrollmentResp.data as RegistrationEnrollment[]) || [],
      waitlists: (waitlistResp.data as RegistrationWaitlist[]) || [],
      sections: (sectionResp.data as RegistrationSection[]) || [],
      departments: departmentResp.data || [],
    };
  }

  async enrollInSection(studentId: string, section: RegistrationSection, currentSections: RegistrationSection[]) {
    if (this.hasConflict(section, currentSections)) {
      throw new Error('Schedule or room conflict detected with an existing course.');
    }
    const hasSeat = section.status === 'OPEN' && section.enrolled_count < section.capacity;

    if (hasSeat) {
      const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        section_id: section.id,
        term_id: section.term_id,
        status: 'ACTIVE',
      });
      if (error) throw error;
      await supabase
        .from('sections')
        .update({ enrolled_count: section.enrolled_count + 1 })
        .eq('id', section.id);
      await this.audit.enrollment(studentId, section.id, 'ENROLLED');
      return { status: 'ENROLLED' as const };
    }

    const { count } = await supabase
      .from('waitlists')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', section.id)
      .eq('term_id', section.term_id);

    const { error } = await supabase.from('waitlists').insert({
      student_id: studentId,
      section_id: section.id,
      term_id: section.term_id,
      position: (count ?? 0) + 1,
      status: 'WAITING',
    });
    if (error) throw error;
    await supabase
      .from('sections')
      .update({ waitlist_count: section.waitlist_count + 1 })
      .eq('id', section.id);
    await this.audit.enrollment(studentId, section.id, 'WAITLISTED');
    return { status: 'WAITLISTED' as const };
  }

  async dropEnrollment(studentId: string, enrollment: RegistrationEnrollment) {
    const { error } = await supabase
      .from('enrollments')
      .update({
        status: 'DROPPED',
        dropped_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)
      .eq('student_id', studentId);
    if (error) throw error;
    if (enrollment.sections) {
      await supabase
        .from('sections')
        .update({ enrolled_count: Math.max(enrollment.sections.enrolled_count - 1, 0) })
        .eq('id', enrollment.section_id);
    }
    await this.audit.enrollment(studentId, enrollment.section_id, 'DROPPED');
  }

  async removeFromWaitlist(studentId: string, entry: RegistrationWaitlist) {
    const { error } = await supabase.from('waitlists').delete().eq('id', entry.id).eq('student_id', studentId);
    if (error) throw error;
    if (entry.sections) {
      await supabase
        .from('sections')
        .update({ waitlist_count: Math.max(entry.sections.waitlist_count - 1, 0) })
        .eq('id', entry.section_id);
    }
    await this.audit.record({
      userId: studentId,
      action: 'WAITLIST_REMOVED',
      entityType: 'ENROLLMENT',
      entityId: entry.section_id,
    });
  }

  private hasConflict(section: RegistrationSection, currentSections: RegistrationSection[]) {
    return currentSections.some((current) => {
      const overlappingDay = current.schedule_days.some((day) => section.schedule_days.includes(day));
      if (!overlappingDay) return false;
      const overlaps =
        this.timeToMinutes(section.start_time) < this.timeToMinutes(current.end_time) &&
        this.timeToMinutes(section.end_time) > this.timeToMinutes(current.start_time);
      const roomClash =
        section.rooms?.code &&
        current.rooms?.code &&
        section.rooms.code === current.rooms.code &&
        overlaps;
      return overlaps || roomClash;
    });
  }

  private timeToMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
