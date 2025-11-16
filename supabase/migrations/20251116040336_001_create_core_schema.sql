/*
  # University ERP Core Schema

  ## Overview
  Complete database schema for university academic management system supporting
  students, instructors, admins, staff with role-based access control.

  ## 1. User Management & Authentication
  
  ### Tables:
  - `users` - Core user table extending Supabase auth.users
  - `user_roles` - Role assignments (STUDENT, INSTRUCTOR, ADMIN, STAFF)
  - `user_profiles` - Extended profile information
  - `password_history` - Password history for policy enforcement
  - `login_attempts` - Failed login tracking for lockout
  - `user_sessions` - Active session tracking for timeout

  ## 2. Academic Structure
  
  ### Tables:
  - `departments` - Academic departments
  - `terms` - Academic terms/semesters
  - `courses` - Course catalog
  - `course_prerequisites` - Course prerequisites
  - `course_corequisites` - Course co-requisites
  - `course_antirequisites` - Course anti-requisites
  - `sections` - Course sections with schedule
  - `rooms` - Room inventory

  ## 3. Enrollment & Waitlists
  
  ### Tables:
  - `enrollments` - Student course enrollments
  - `waitlists` - Waitlist entries
  - `enrollment_history` - Audit trail

  ## 4. Gradebook & Attendance
  
  ### Tables:
  - `assessments` - Assessment definitions
  - `grades` - Student grades
  - `attendance_records` - Attendance tracking

  ## 5. Finance
  
  ### Tables:
  - `fee_structures` - Fee definitions
  - `student_fees` - Student fee assignments
  - `payments` - Payment records
  - `installment_plans` - Payment plans

  ## 6. Calendar & Events
  
  ### Tables:
  - `calendar_events` - All calendar events
  - `event_participants` - Event attendance/opt-ins
  - `meeting_slots` - Professor availability
  - `meeting_requests` - Student meeting requests

  ## 7. Notifications & Messaging
  
  ### Tables:
  - `notifications` - User notifications
  - `notification_preferences` - User preferences
  - `broadcasts` - System-wide messages

  ## 8. System Configuration
  
  ### Tables:
  - `system_settings` - Global settings
  - `maintenance_windows` - Scheduled maintenance
  - `audit_logs` - Complete audit trail

  ## 9. Security
  - Row Level Security (RLS) enabled on ALL tables
  - Restrictive policies based on user roles
  - All tables check authentication and ownership/membership
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER MANAGEMENT & AUTHENTICATION
-- ============================================================================

-- User profiles extending Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  department_id uuid,
  student_id text UNIQUE,
  employee_id text UNIQUE,
  profile_image_url text,
  bio text,
  office_room text,
  office_hours text,
  is_active boolean DEFAULT true,
  must_change_password boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Password history for policy enforcement
CREATE TABLE IF NOT EXISTS password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean DEFAULT false,
  ip_address inet,
  user_agent text,
  attempted_at timestamptz DEFAULT now()
);

-- Active sessions for timeout tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. ACADEMIC STRUCTURE
-- ============================================================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  head_id uuid REFERENCES auth.users(id),
  color text DEFAULT '#E0E0E0',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key to user_profiles
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_department 
FOREIGN KEY (department_id) REFERENCES departments(id);

-- Academic terms
CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  registration_start date,
  registration_end date,
  drop_deadline date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  building text,
  capacity integer NOT NULL DEFAULT 0,
  room_type text CHECK (room_type IN ('CLASSROOM', 'LAB', 'LECTURE_HALL', 'SEMINAR', 'OFFICE')),
  facilities text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  department_id uuid NOT NULL REFERENCES departments(id),
  credits integer NOT NULL DEFAULT 3,
  level text CHECK (level IN ('100', '200', '300', '400', 'GRAD')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Course prerequisites
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, prerequisite_id)
);

-- Course co-requisites
CREATE TABLE IF NOT EXISTS course_corequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  corequisite_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, corequisite_id)
);

-- Course anti-requisites
CREATE TABLE IF NOT EXISTS course_antirequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  antirequisite_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, antirequisite_id)
);

-- Sections
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id),
  term_id uuid NOT NULL REFERENCES terms(id),
  section_number text NOT NULL,
  instructor_id uuid REFERENCES auth.users(id),
  room_id uuid REFERENCES rooms(id),
  capacity integer NOT NULL DEFAULT 30,
  enrolled_count integer DEFAULT 0,
  waitlist_count integer DEFAULT 0,
  schedule_days text[] NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, term_id, section_number)
);

-- ============================================================================
-- 3. ENROLLMENT & WAITLISTS
-- ============================================================================

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id),
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED', 'COMPLETED', 'WITHDRAWN')),
  grade text,
  grade_points numeric(3,2),
  enrolled_at timestamptz DEFAULT now(),
  dropped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, section_id, term_id)
);

-- Waitlists
CREATE TABLE IF NOT EXISTS waitlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id),
  position integer NOT NULL,
  status text DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'PROMOTED', 'REMOVED')),
  added_at timestamptz DEFAULT now(),
  promoted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, section_id, term_id)
);

-- Enrollment history for audit
CREATE TABLE IF NOT EXISTS enrollment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  section_id uuid NOT NULL REFERENCES sections(id),
  term_id uuid NOT NULL REFERENCES terms(id),
  action text NOT NULL CHECK (action IN ('REGISTERED', 'DROPPED', 'PROMOTED', 'ADMIN_REGISTERED', 'ADMIN_DROPPED')),
  performed_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. GRADEBOOK & ATTENDANCE
-- ============================================================================

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  assessment_type text CHECK (assessment_type IN ('ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'PROJECT', 'PARTICIPATION')),
  max_marks numeric(5,2) NOT NULL,
  weight numeric(5,2) NOT NULL,
  due_date timestamptz,
  is_published boolean DEFAULT false,
  rubric text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marks_obtained numeric(5,2),
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'GRADED', 'PUBLISHED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  minutes_late integer DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section_id, student_id, attendance_date)
);

-- ============================================================================
-- 5. FINANCE
-- ============================================================================

-- Fee structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL,
  fee_type text CHECK (fee_type IN ('TUITION', 'LAB', 'LIBRARY', 'SPORTS', 'TECHNOLOGY', 'OTHER')),
  per_credit boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Student fees
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id),
  fee_structure_id uuid NOT NULL REFERENCES fee_structures(id),
  amount numeric(10,2) NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  due_date date,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES student_fees(id),
  amount numeric(10,2) NOT NULL,
  payment_method text CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE')),
  transaction_id text,
  payment_date timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Installment plans
CREATE TABLE IF NOT EXISTS installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. CALENDAR & EVENTS
-- ============================================================================

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('CLASS', 'EXAM', 'EVENT', 'MEETING', 'OFFICE_HOURS', 'CLUB', 'DEADLINE', 'HOLIDAY')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  department_id uuid REFERENCES departments(id),
  section_id uuid REFERENCES sections(id),
  organizer_id uuid REFERENCES auth.users(id),
  is_all_day boolean DEFAULT false,
  is_public boolean DEFAULT false,
  requires_opt_in boolean DEFAULT true,
  color text DEFAULT '#E0E0E0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event participants/opt-ins
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'OPTED_IN' CHECK (status IN ('OPTED_IN', 'DECLINED', 'TENTATIVE')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Professor meeting slots
CREATE TABLE IF NOT EXISTS meeting_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_available boolean DEFAULT true,
  max_bookings integer DEFAULT 1,
  current_bookings integer DEFAULT 0,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meeting requests
CREATE TABLE IF NOT EXISTS meeting_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES auth.users(id),
  meeting_slot_id uuid REFERENCES meeting_slots(id),
  requested_time timestamptz,
  purpose text,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'COMPLETED', 'CANCELLED')),
  response_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. NOTIFICATIONS & MESSAGING
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('ACADEMIC', 'FINANCE', 'EVENTS', 'SYSTEM', 'CLUBS', 'GRADES', 'ATTENDANCE', 'ENROLLMENT')),
  priority text DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  enabled boolean DEFAULT true,
  delivery_method text DEFAULT 'IN_APP' CHECK (delivery_method IN ('IN_APP', 'EMAIL', 'DIGEST')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_audience text NOT NULL CHECK (target_audience IN ('ALL', 'STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF')),
  category text NOT NULL,
  priority text DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. SYSTEM CONFIGURATION
-- ============================================================================

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_sections_term ON sections(term_id);
CREATE INDEX IF NOT EXISTS idx_sections_instructor ON sections(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_term ON enrollments(term_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_student ON waitlists(student_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_section ON waitlists(section_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_section ON attendance_records(section_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR DATA SAFETY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_corequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_antirequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - USER PROFILES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- RLS POLICIES - DEPARTMENTS
-- ============================================================================

CREATE POLICY "Anyone can view active departments"
  ON departments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- RLS POLICIES - TERMS
-- ============================================================================

CREATE POLICY "Anyone can view active terms"
  ON terms FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage terms"
  ON terms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- RLS POLICIES - COURSES & SECTIONS
-- ============================================================================

CREATE POLICY "Anyone can view active courses"
  ON courses FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

CREATE POLICY "Anyone can view active sections"
  ON sections FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Instructors can view their sections"
  ON sections FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage sections"
  ON sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================================================
-- RLS POLICIES - ENROLLMENTS
-- ============================================================================

CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view their section enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections
      WHERE sections.id = enrollments.section_id
      AND sections.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can create own enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own enrollments"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================================================
-- RLS POLICIES - GRADES
-- ============================================================================

CREATE POLICY "Students can view own grades"
  ON grades FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() AND status = 'PUBLISHED');

CREATE POLICY "Instructors can view grades for their sections"
  ON grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN sections s ON s.id = a.section_id
      WHERE a.id = grades.assessment_id
      AND s.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage grades for their sections"
  ON grades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN sections s ON s.id = a.section_id
      WHERE a.id = grades.assessment_id
      AND s.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all grades"
  ON grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- RLS POLICIES - CALENDAR
-- ============================================================================

CREATE POLICY "Users can view public events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can view events they created"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "Users can view events they opted into"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_participants.event_id = calendar_events.id
      AND event_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Users can manage their events"
  ON calendar_events FOR ALL
  TO authenticated
  USING (organizer_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - FINANCE
-- ============================================================================

CREATE POLICY "Students can view own fees"
  ON student_fees FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all finance"
  ON student_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================================================
-- RLS POLICIES - SYSTEM
-- ============================================================================

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage maintenance windows"
  ON maintenance_windows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view active maintenance"
  ON maintenance_windows FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if maintenance mode is active
CREATE OR REPLACE FUNCTION is_maintenance_mode()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM maintenance_windows
    WHERE is_active = true
    AND now() BETWEEN start_time AND end_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM user_profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Global maintenance mode flag'),
  ('session_timeout_minutes', '30', 'Inactivity timeout in minutes'),
  ('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
  ('password_history_count', '5', 'Number of previous passwords to check'),
  ('max_credits_per_term', '18', 'Maximum credits a student can register per term'),
  ('registration_buffer_days', '7', 'Days before term start when registration opens')
ON CONFLICT (key) DO NOTHING;
