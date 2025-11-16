export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'STAFF';

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          role: UserRole;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          department_id: string | null;
          student_id: string | null;
          employee_id: string | null;
          profile_image_url: string | null;
          bio: string | null;
          office_room: string | null;
          office_hours: string | null;
          is_active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          head_id: string | null;
          color: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      terms: {
        Row: {
          id: string;
          code: string;
          name: string;
          start_date: string;
          end_date: string;
          registration_start: string | null;
          registration_end: string | null;
          drop_deadline: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['terms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['terms']['Insert']>;
      };
      courses: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          department_id: string;
          credits: number;
          level: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };
      sections: {
        Row: {
          id: string;
          course_id: string;
          term_id: string;
          section_number: string;
          instructor_id: string | null;
          room_id: string | null;
          capacity: number;
          enrolled_count: number;
          waitlist_count: number;
          schedule_days: string[];
          start_time: string;
          end_time: string;
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sections']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sections']['Insert']>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          section_id: string;
          term_id: string;
          status: string;
          grade: string | null;
          grade_points: number | null;
          enrolled_at: string;
          dropped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>;
      };
      waitlists: {
        Row: {
          id: string;
          student_id: string;
          section_id: string;
          term_id: string;
          position: number;
          status: string;
          added_at: string;
          promoted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['waitlists']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['waitlists']['Insert']>;
      };
      assessments: {
        Row: {
          id: string;
          section_id: string;
          name: string;
          description: string | null;
          assessment_type: string;
          max_marks: number;
          weight: number;
          due_date: string | null;
          is_published: boolean;
          rubric: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assessments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assessments']['Insert']>;
      };
      grades: {
        Row: {
          id: string;
          assessment_id: string;
          student_id: string;
          marks_obtained: number | null;
          feedback: string | null;
          submitted_at: string | null;
          graded_at: string | null;
          graded_by: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['grades']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['grades']['Insert']>;
      };
      attendance_records: {
        Row: {
          id: string;
          section_id: string;
          student_id: string;
          attendance_date: string;
          status: string;
          minutes_late: number;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>;
      };
      student_fees: {
        Row: {
          id: string;
          student_id: string;
          term_id: string;
          fee_structure_id: string;
          amount: number;
          amount_paid: number;
          due_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['student_fees']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['student_fees']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          student_fee_id: string | null;
          amount: number;
          payment_method: string;
          transaction_id: string | null;
          payment_date: string;
          recorded_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_type: string;
          start_time: string;
          end_time: string;
          location: string | null;
          department_id: string | null;
          section_id: string | null;
          organizer_id: string | null;
          is_all_day: boolean;
          is_public: boolean;
          requires_opt_in: boolean;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['calendar_events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['calendar_events']['Insert']>;
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['event_participants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['event_participants']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          category: string;
          priority: string;
          is_read: boolean;
          action_url: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          enabled: boolean;
          delivery_method: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notification_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>;
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['system_settings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>;
      };
      maintenance_windows: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_windows']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['maintenance_windows']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
    Functions: {
      is_maintenance_mode: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_user_role: {
        Args: { user_uuid: string };
        Returns: string;
      };
    };
  };
};
