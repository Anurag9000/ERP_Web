import { supabase } from '../lib/supabase';
import { AuditService } from './AuditService';

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
    id: string;
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

type SectionSchedule = Pick<RegistrationSection, 'schedule_days' | 'start_time' | 'end_time' | 'rooms'>;

interface CourseMeta {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  level: string | null;
  department_id: string | null;
  department_name?: string | null;
}

interface CourseRow {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  level: string | null;
  department_id: string | null;
  departments?: {
    name: string | null;
  } | null;
}

export class EnrollmentService {
  constructor(private readonly audit: AuditService) { }
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
                id,
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
              courses(id, code, name, credits, level, departments(code, name, color, id)),
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
              id,
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
    const scheduleSections = currentSections.map((current) => this.toSchedule(current));
    if (this.hasConflict(this.toSchedule(section), scheduleSections)) {
      throw new Error('Schedule or room conflict detected with an existing course.');
    }

    const completedCourseIds = await this.getCourseIdsByStatus(studentId, 'COMPLETED');
    const activeCourseIds = await this.getCourseIdsByStatus(studentId, 'ACTIVE');
    const currentCourseIds = new Set(currentSections.map((current) => current.courses.id).filter(Boolean));
    const activePlusCurrent = new Set([...activeCourseIds, ...currentCourseIds]);

    await this.ensureCourseRequirements(studentId, section.courses.id, activePlusCurrent, completedCourseIds);

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

  async forceEnroll(studentId: string, section: RegistrationSection, adminId: string, reason: string) {
    // 1. Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('section_id', section.id)
      .maybeSingle();

    if (existing && existing.status === 'ACTIVE') {
      throw new Error('Student is already enrolled in this section.');
    }

    // 2. Insert or Update Enrollment
    if (existing) {
      // Re-activate if dropped or waitlisted
      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'ACTIVE',
          enrolled_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        section_id: section.id,
        term_id: section.term_id,
        status: 'ACTIVE',
      });
      if (error) throw error;
    }

    // 3. Remove from Waitlist if exists
    await supabase.from('waitlists').delete().eq('section_id', section.id).eq('student_id', studentId);

    // 4. Update Section Counts
    // We intentionally do NOT check capacity here.
    const { error: countError } = await supabase
      .from('sections')
      .update({ enrolled_count: section.enrolled_count + 1 })
      .eq('id', section.id);

    if (countError) console.error('Failed to update enrolled_count', countError);

    // 5. Audit Log (Special Override Type)
    await this.audit.record({
      userId: adminId,
      action: 'OVERRIDE_ENROLL',
      entityType: 'ENROLLMENT',
      entityId: section.id,
      details: { studentId, reason },
    });

    return { status: 'ENROLLED', override: true };
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

    // Attempt to promote from waitlist
    await this.promoteFromWaitlist(enrollment.section_id);
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

  private async ensureCourseRequirements(
    studentId: string,
    courseId: string,
    activePlusCurrent: Set<string>,
    completedCourseIds: Set<string>
  ) {
    const [prereqResp, coreqResp, antireqResp, courseResp, profileResp] = await Promise.all([
      supabase.from('course_prerequisites').select('prerequisite_id').eq('course_id', courseId),
      supabase.from('course_corequisites').select('corequisite_id').eq('course_id', courseId),
      supabase.from('course_antirequisites').select('antirequisite_id').eq('course_id', courseId),
      supabase
        .from('courses')
        .select(
          `
            id,
            code,
            name,
            level,
            credits,
            department_id,
            departments(name)
          `
        )
        .eq('id', courseId)
        .maybeSingle(),
      supabase.from('user_profiles').select('id, department_id').eq('id', studentId).maybeSingle(),
    ]);

    if (prereqResp.error) throw prereqResp.error;
    if (coreqResp.error) throw coreqResp.error;
    if (antireqResp.error) throw antireqResp.error;
    if (courseResp.error) throw courseResp.error;
    if (profileResp.error) throw profileResp.error;

    const prereqIds =
      prereqResp.data
        ?.map((row: { prerequisite_id: string | null }) => row.prerequisite_id)
        .filter((id): id is string => Boolean(id)) || [];

    const coreqIds =
      coreqResp.data
        ?.map((row: { corequisite_id: string | null }) => row.corequisite_id)
        .filter((id): id is string => Boolean(id)) || [];

    const antireqIds =
      antireqResp.data
        ?.map((row: { antirequisite_id: string | null }) => row.antirequisite_id)
        .filter((id): id is string => Boolean(id)) || [];

    const lookupIds = Array.from(new Set([...prereqIds, ...coreqIds, ...antireqIds]));
    const courseLookup = await this.fetchCourseCatalog(lookupIds);

    const missingPrereqs = prereqIds.filter((id) => !completedCourseIds.has(id));
    if (missingPrereqs.length) {
      throw new Error(
        `Missing prerequisites: ${this.formatCourseList(missingPrereqs, courseLookup)}. Complete these before enrolling.`
      );
    }

    const missingCoreqs = coreqIds.filter((id) => !completedCourseIds.has(id) && !activePlusCurrent.has(id));
    if (missingCoreqs.length) {
      throw new Error(
        `Co-requisites required: ${this.formatCourseList(
          missingCoreqs,
          courseLookup
        )}. Add them to your schedule or request an override.`
      );
    }

    const blockedAntireqs = antireqIds.filter((id) => completedCourseIds.has(id) || activePlusCurrent.has(id));
    if (blockedAntireqs.length) {
      throw new Error(
        `You cannot enroll because of anti-requisites: ${this.formatCourseList(
          blockedAntireqs,
          courseLookup
        )}. Choose a different course.`
      );
    }

    const courseInfo = courseResp.data;
    const studentProfile = profileResp.data;
    if (courseInfo && studentProfile?.department_id && courseInfo.department_id) {
      const parsedLevel = this.parseCourseLevel(courseInfo.level);
      const departmentMismatch = studentProfile.department_id !== courseInfo.department_id;
      if (departmentMismatch && parsedLevel >= 200) {
        const departmentName = courseInfo.departments?.name ?? 'department';
        throw new Error(
          `Department approval required for ${courseInfo.code}. Contact the ${departmentName} office before registering.`
        );
      }
      if (parsedLevel >= 400) {
        const completedCredits = await this.sumCourseCredits(completedCourseIds);
        if (completedCredits < 24) {
          throw new Error(
            `Advisor approval required for ${courseInfo.code}. You currently have ${completedCredits} completed credits.`
          );
        }
      }
    }
  }

  private async promoteFromWaitlist(sectionId: string) {
    const { data: section } = await supabase
      .from('sections')
      .select(
        `
          id,
          course_id,
          term_id,
          enrolled_count,
          waitlist_count,
          schedule_days,
          start_time,
          end_time,
          rooms(code, name)
        `
      )
      .eq('id', sectionId)
      .maybeSingle();

    if (!section) return;

    const { data: candidates } = await supabase
      .from('waitlists')
      .select('id, student_id')
      .eq('section_id', sectionId)
      .eq('status', 'WAITING')
      .order('position')
      .limit(5);

    if (!candidates?.length) {
      return;
    }

    for (const candidate of candidates) {
      const current = await this.fetchStudentSchedules(candidate.student_id);
      if (this.hasConflict(section, current)) {
        continue;
      }

      try {
        const [activeCourseIds, completedCourseIds] = await Promise.all([
          this.getCourseIdsByStatus(candidate.student_id, 'ACTIVE'),
          this.getCourseIdsByStatus(candidate.student_id, 'COMPLETED'),
        ]);
        await this.ensureCourseRequirements(
          candidate.student_id,
          section.course_id,
          activeCourseIds,
          completedCourseIds
        );
      } catch (validationError) {
        console.warn('Skipping waitlist promotion due to unmet requirements', validationError);
        continue;
      }

      const { error } = await supabase.from('enrollments').insert({
        student_id: candidate.student_id,
        section_id: sectionId,
        term_id: section.term_id,
        status: 'ACTIVE',
      });
      if (error) {
        console.error('Failed to promote waitlist candidate', error);
        continue;
      }

      await supabase
        .from('waitlists')
        .update({ status: 'PROMOTED', promoted_at: new Date().toISOString() })
        .eq('id', candidate.id);

      await supabase
        .from('sections')
        .update({
          enrolled_count: section.enrolled_count + 1,
          waitlist_count: Math.max(section.waitlist_count - 1, 0),
        })
        .eq('id', sectionId);

      await this.audit.enrollment(candidate.student_id, sectionId, 'PROMOTED');
      break;
    }
  }

  private async fetchStudentSchedules(studentId: string): Promise<SectionSchedule[]> {
    const { data } = await supabase
      .from('enrollments')
      .select(
        `
          sections(
            schedule_days,
            start_time,
            end_time,
            rooms(code, name)
          )
        `
      )
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE');

    return (
      data
        ?.map((row: { sections: SectionSchedule | null }) => row.sections)
        .filter((section): section is SectionSchedule => Boolean(section)) || []
    );
  }

  private hasConflict(section: SectionSchedule, currentSections: SectionSchedule[]) {
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

  private async getCourseIdsByStatus(studentId: string, status: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
          sections(
            course_id
          )
        `
      )
      .eq('student_id', studentId)
      .eq('status', status);
    if (error) throw error;
    const ids = new Set<string>();
    data?.forEach((row: { sections: { course_id: string | null } | null }) => {
      const id = row.sections?.course_id;
      if (id) {
        ids.add(id);
      }
    });
    return ids;
  }

  private async fetchCourseCatalog(courseIds: string[]): Promise<Record<string, CourseMeta>> {
    if (!courseIds.length) {
      return {} as Record<string, CourseMeta>;
    }
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
          id,
          code,
          name,
          credits,
          level,
          department_id,
          departments(name)
        `
      )
      .in('id', courseIds);
    if (error) throw error;
    const map: Record<string, CourseMeta> = {};
    (data as CourseRow[] | null)?.forEach((course) => {
      map[course.id] = {
        id: course.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        level: course.level,
        department_id: course.department_id,
        department_name: course.departments?.name ?? null,
      };
    });
    return map;
  }

  private formatCourseList(ids: string[], lookup: Record<string, CourseMeta>): string {
    return ids
      .map((id) => {
        const course = lookup[id];
        if (!course) return 'Unknown course';
        return course.name ? `${course.code} (${course.name})` : course.code;
      })
      .join(', ');
  }

  private parseCourseLevel(level?: string | null): number {
    if (!level) return 0;
    if (level.toUpperCase() === 'GRAD') {
      return 500;
    }
    const parsed = parseInt(level, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async sumCourseCredits(courseIds: Set<string>): Promise<number> {
    if (!courseIds.size) {
      return 0;
    }
    const { data, error } = await supabase
      .from('courses')
      .select('id, credits')
      .in('id', Array.from(courseIds));
    if (error) throw error;
    const rows = (data as { credits: number | null }[] | null) ?? [];
    return rows.reduce((total, course) => total + (course.credits ?? 0), 0);
  }
}
