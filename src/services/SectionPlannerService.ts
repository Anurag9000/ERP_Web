
import { supabase } from '../lib/supabase';

export interface PlannerSection {
  id: string;
  courseCode: string;
  courseName: string;
  termId: string;
  termName: string;
  sectionNumber: string;
  capacity: number;
  enrolledCount: number;
  waitlistCount: number;
  scheduleDays: string[];
  startTime: string;
  endTime: string;
  roomCode: string | null;
  roomName: string | null;
  roomCapacity: number | null;
}

export interface PlannerTerm {
  id: string;
  name: string;
  code: string;
}

export class SectionPlannerService {
  async fetchTerms(): Promise<PlannerTerm[]> {
    const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('terms')
      .select('id, name, code')
      .eq('is_active', true)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async fetchCourses(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('courses')
      .select('id, code, name')
      .eq('is_active', true)
      .order('code');
    if (error) throw error;
    return data || [];
  }

  async fetchRooms(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('rooms')
      .select('id, code, name, capacity')
      .eq('is_active', true)
      .order('code');
    if (error) throw error;
    return data || [];
  }

  async fetchInstructors(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'INSTRUCTOR')
      .eq('is_active', true)
      .order('last_name');
    if (error) throw error;
    return data || [];
  }

  async createSection(sectionData: any): Promise<{ data: any; error: any }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await ((supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('sections')
      .insert([sectionData])
      .select()
      .single() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return { data, error };
  }


  /**
   * Detects room conflicts for a given time slot and days
   */
  async detectRoomConflicts(
    roomId: string,
    startTime: string,
    endTime: string,
    scheduleDays: string[],
    termId: string,
    excludeSectionId?: string
  ): Promise<{ conflicts: any[]; hasConflict: boolean }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Find all sections using this room in the same term
      let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('sections')
        .select(`
          id,
          section_number,
          start_time,
          end_time,
          schedule_days,
          courses (code, name)
        `)
        .eq('room_id', roomId)
        .eq('term_id', termId);

      if (excludeSectionId) {
        query = query.neq('id', excludeSectionId);
      }

      const { data: sections, error } = await query;
      if (error) throw error;

      const conflicts = (sections || []).filter((section: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Check if days overlap
        const daysOverlap = section.schedule_days.some((day: string) =>
          scheduleDays.includes(day)
        );
        if (!daysOverlap) return false;

        // Check if times overlap
        return this.timeRangesOverlap(
          startTime,
          endTime,
          section.start_time,
          section.end_time
        );
      });

      return { conflicts, hasConflict: conflicts.length > 0 };
    } catch (error) {
      console.error('Error detecting room conflicts:', error);
      return { conflicts: [], hasConflict: false };
    }
  }

  /**
   * Detects instructor conflicts for a given time slot and days
   */
  async detectInstructorConflicts(
    instructorId: string,
    startTime: string,
    endTime: string,
    scheduleDays: string[],
    termId: string,
    excludeSectionId?: string
  ): Promise<{ conflicts: any[]; hasConflict: boolean }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('sections')
        .select(`
          id,
          section_number,
          start_time,
          end_time,
          schedule_days,
          courses (code, name),
          rooms (code)
        `)
        .eq('instructor_id', instructorId)
        .eq('term_id', termId);

      if (excludeSectionId) {
        query = query.neq('id', excludeSectionId);
      }

      const { data: sections, error } = await query;
      if (error) throw error;

      const conflicts = (sections || []).filter((section: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const daysOverlap = section.schedule_days.some((day: string) =>
          scheduleDays.includes(day)
        );
        if (!daysOverlap) return false;

        return this.timeRangesOverlap(
          startTime,
          endTime,
          section.start_time,
          section.end_time
        );
      });

      return { conflicts, hasConflict: conflicts.length > 0 };
    } catch (error) {
      console.error('Error detecting instructor conflicts:', error);
      return { conflicts: [], hasConflict: false };
    }
  }

  /**
   * Validates that section capacity doesn't exceed room capacity
   */
  async validateCapacity(
    roomId: string,
    enrollmentCap: number
  ): Promise<{ valid: boolean; roomCapacity?: number; message?: string }> {
    try {
      const { data: room, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('rooms')
        .select('capacity')
        .eq('id', roomId)
        .single();

      if (error) throw error;

      if (!room || !room.capacity) {
        return { valid: true, message: 'Room capacity not set' };
      }

      const valid = enrollmentCap <= room.capacity;
      return {
        valid,
        roomCapacity: room.capacity,
        message: valid
          ? 'Capacity is within room limits'
          : `Enrollment cap (${enrollmentCap}) exceeds room capacity (${room.capacity})`
      };
    } catch (error) {
      console.error('Error validating capacity:', error);
      return { valid: true, message: 'Could not validate capacity' };
    }
  }

  /**
   * Helper: Check if two time ranges overlap
   */
  private timeRangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);

    return s1 < e2 && s2 < e1;
  }

  /**
   * Helper: Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async fetchSections(termId?: string): Promise<PlannerSection[]> {
    let query = (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('sections')
      .select(`
        id,
        section_number,
        capacity,
        enrolled_count,
        waitlist_count,
        schedule_days,
        start_time,
        end_time,
        term_id,
        courses(code, name),
        terms(id, name),
        rooms(code, name, capacity)
      `)
      .eq('is_active', true)
      .order('courses(code)');
    if (termId) {
      query = query.eq('term_id', termId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (
      data?.map((section: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: section.id,
        courseCode: section.courses?.code || '',
        courseName: section.courses?.name || '',
        termId: section.term_id,
        termName: section.terms?.name || '',
        sectionNumber: section.section_number,
        capacity: section.capacity || 0,
        enrolledCount: section.enrolled_count || 0,
        waitlistCount: section.waitlist_count || 0,
        scheduleDays: section.schedule_days || [],
        startTime: section.start_time,
        endTime: section.end_time,
        roomCode: section.rooms?.code || null,
        roomName: section.rooms?.name || null,
        roomCapacity: section.rooms?.capacity || null,
      })) || []
    );
  }
}
