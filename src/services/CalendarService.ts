import { supabase } from '../lib/supabase';

export interface CalendarEvent {
    id: string;
    title: string;
    description: string | null;
    start: Date;
    end: Date;
    type: 'SECTION' | 'EVENT' | 'EXAM' | 'HOLIDAY';
    location?: string;
    allDay?: boolean;
    color?: string;
}

export interface TimetableSection {
    id: string;
    section_number: string;
    start_time: string; // HH:MM:SS
    end_time: string;   // HH:MM:SS
    schedule_days: string[]; // ['MONDAY', ...]
    course_code: string;
    course_name: string;
    room?: string;
    instructor?: string;
}

export class CalendarService {
    /**
     * Fetches the student's recurring class schedule.
     */
    async fetchStudentSchedule(studentId: string): Promise<TimetableSection[]> {
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
        id,
        sections (
          id,
          section_number,
          start_time,
          end_time,
          schedule_days,
          rooms (code, name),
          courses (code, name),
          user_profiles!sections_instructor_id_fkey (first_name, last_name)
        )
      `)
            .eq('student_id', studentId)
            .eq('status', 'ACTIVE');

        if (error) throw error;

        return (data || [])
            .map((row: any) => row.sections)
            .filter(Boolean)
            .map((section: any) => ({
                id: section.id,
                section_number: section.section_number,
                start_time: section.start_time,
                end_time: section.end_time,
                schedule_days: section.schedule_days,
                course_code: section.courses.code,
                course_name: section.courses.name,
                room: section.rooms?.code,
                instructor: section.user_profiles
                    ? `${section.user_profiles.first_name} ${section.user_profiles.last_name}`
                    : undefined,
            }));
    }

    /**
     * Fetches upcoming specific events (exams, holidays, custom events).
     */
    async fetchUpcomingEvents(studentId: string): Promise<CalendarEvent[]> {
        // 1. Fetch Academic Events (Exams/Assessments)
        // We need to join enrollments to get sections to get assessments
        const { data: assessments, error: assessError } = await supabase
            .from('assessments')
            .select(`
        id,
        name,
        due_date,
        sections!inner (
            enrollments!inner (student_id)
        ),
        courses:sections (
            courses (code)
        )
      `)
            .eq('sections.enrollments.student_id', studentId)
            .gt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(10);

        if (assessError) throw assessError;

        // 2. Fetch Personal Calendar Events
        const { data: personal, error: calError } = await supabase
            .from('calendar_events')
            .select('*')
            .or(`organizer_id.eq.${studentId}, is_public.eq.true`)
            .gt('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(10);

        if (calError) throw calError;

        const events: CalendarEvent[] = [];

        // Map Assessments to Events
        assessments?.forEach((a: any) => {
            if (!a.due_date) return;
            events.push({
                id: a.id,
                title: `${a.courses?.courses?.code} - ${a.name}`,
                description: 'Assessment Due',
                start: new Date(a.due_date),
                end: new Date(new Date(a.due_date).getTime() + 60 * 60 * 1000), // Assumed 1 hour duration for due date
                type: 'EXAM',
                allDay: false,
                color: 'red'
            });
        });

        // Map Personal Events
        personal?.forEach((e: any) => {
            events.push({
                id: e.id,
                title: e.title,
                description: e.description,
                start: new Date(e.start_time),
                end: new Date(e.end_time),
                type: 'EVENT',
                location: e.location,
                allDay: e.is_all_day,
                color: e.color || 'blue'
            });
        });

        return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
}
