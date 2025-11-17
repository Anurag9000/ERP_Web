import { supabase } from '../lib/supabase';

export interface MessagingSection {
  id: string;
  courseCode: string;
  courseName: string;
  termName: string;
}

export interface MessagingStudent {
  id: string;
  fullName: string;
  email: string;
}

export interface SectionMessage {
  id: string;
  title: string;
  body: string;
  deliveryScope: 'SECTION' | 'STUDENT';
  deliveryChannel: 'IN_APP' | 'EMAIL' | 'SMS';
  createdAt: string;
  recipients: {
    id: string;
    studentId: string;
    status: string;
    readAt: string | null;
    student?: MessagingStudent;
  }[];
}

export interface CreateMessagePayload {
  sectionId: string;
  title: string;
  body: string;
  deliveryScope: 'SECTION' | 'STUDENT';
  deliveryChannel: 'IN_APP' | 'EMAIL' | 'SMS';
  recipientIds: string[];
}

export class InstructorMessagingService {
  async fetchSections(instructorId: string): Promise<MessagingSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select(
        `
        id,
        courses(code, name),
        terms(name)
      `
      )
      .eq('instructor_id', instructorId)
      .eq('is_active', true)
      .order('courses(code)');

    if (error) throw error;

    return (
      data?.map((section) => ({
        id: section.id,
        courseCode: section.courses?.code || '',
        courseName: section.courses?.name || '',
        termName: section.terms?.name || '',
      })) || []
    );
  }

  async fetchStudents(sectionId: string): Promise<MessagingStudent[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        student_id,
        user_profiles!enrollments_student_id_fkey(first_name, last_name, email)
      `
      )
      .eq('section_id', sectionId)
      .eq('status', 'ACTIVE')
      .order('user_profiles(last_name)');
    if (error) throw error;

    return (
      data?.map((row) => ({
        id: row.student_id,
        fullName: `${row.user_profiles?.first_name || ''} ${row.user_profiles?.last_name || ''}`.trim(),
        email: row.user_profiles?.email || '',
      })) || []
    );
  }

  async fetchMessages(sectionId: string): Promise<SectionMessage[]> {
    const { data, error } = await supabase
      .from('section_messages')
      .select(
        `
        id,
        title,
        body,
        delivery_scope,
        delivery_channel,
        created_at,
        section_message_recipients (
          id,
          student_id,
          status,
          read_at,
          user_profiles!section_message_recipients_student_id_fkey(first_name, last_name, email)
        )
      `
      )
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) throw error;

    return (
      data?.map((message) => ({
        id: message.id,
        title: message.title,
        body: message.body,
        deliveryScope: message.delivery_scope,
        deliveryChannel: message.delivery_channel,
        createdAt: message.created_at,
        recipients:
          message.section_message_recipients?.map((recipient: any) => ({
            id: recipient.id,
            studentId: recipient.student_id,
            status: recipient.status,
            readAt: recipient.read_at,
            student: recipient.user_profiles
              ? {
                  id: recipient.student_id,
                  fullName: `${recipient.user_profiles.first_name || ''} ${recipient.user_profiles.last_name || ''}`.trim(),
                  email: recipient.user_profiles.email || '',
                }
              : undefined,
          })) || [],
      })) || []
    );
  }

  async sendMessage(instructorId: string, payload: CreateMessagePayload) {
    const { data, error } = await supabase
      .from('section_messages')
      .insert({
        section_id: payload.sectionId,
        instructor_id: instructorId,
        title: payload.title,
        body: payload.body,
        delivery_scope: payload.deliveryScope,
        delivery_channel: payload.deliveryChannel,
      })
      .select('id')
      .single();
    if (error) throw error;

    if (payload.recipientIds.length) {
      const { error: recipientError } = await supabase.from('section_message_recipients').insert(
        payload.recipientIds.map((studentId) => ({
          message_id: data.id,
          student_id: studentId,
        }))
      );
      if (recipientError) throw recipientError;
    }
  }
}
