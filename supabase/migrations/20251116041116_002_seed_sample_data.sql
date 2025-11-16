/*
  # Seed Sample Data for Testing

  ## Overview
  This migration adds sample data for testing and demonstration purposes.
  
  ## Data Created
  
  1. **Departments** - 5 sample departments
  2. **Terms** - Current and upcoming terms
  3. **Rooms** - Sample classroom and lab rooms
  4. **Sample Users** - Students, instructors, admin (created in auth.users and user_profiles)
  5. **Courses** - Sample courses with prerequisites
  6. **Sections** - Active sections for current term
  7. **System Settings** - Default configuration
  
  ## Test Credentials
  All test users have password: TestPassword123!
  
  - admin@university.edu (Admin)
  - instructor1@university.edu (Instructor)
  - student1@university.edu (Student)
  - student2@university.edu (Student)
  
  Note: Actual auth.users creation would need to be done via Supabase Auth API
  This migration only creates the profile data structure
*/

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

INSERT INTO departments (id, code, name, description, color, is_active) VALUES
  (gen_random_uuid(), 'CS', 'Computer Science', 'Department of Computer Science and Software Engineering', '#B8D4E8', true),
  (gen_random_uuid(), 'MATH', 'Mathematics', 'Department of Mathematics and Statistics', '#E8C1D4', true),
  (gen_random_uuid(), 'PHYS', 'Physics', 'Department of Physics and Astronomy', '#D4E8C1', true),
  (gen_random_uuid(), 'CHEM', 'Chemistry', 'Department of Chemistry and Biochemistry', '#E8D4B8', true),
  (gen_random_uuid(), 'BIO', 'Biology', 'Department of Biological Sciences', '#C1E8D4', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- TERMS
-- ============================================================================

INSERT INTO terms (id, code, name, start_date, end_date, registration_start, registration_end, drop_deadline, is_active) VALUES
  (gen_random_uuid(), 'FALL2025', 'Fall 2025', '2025-09-01', '2025-12-15', '2025-08-01', '2025-09-10', '2025-09-20', true),
  (gen_random_uuid(), 'SPRING2026', 'Spring 2026', '2026-01-15', '2026-05-15', '2025-12-01', '2026-01-25', '2026-02-05', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- ROOMS
-- ============================================================================

INSERT INTO rooms (id, code, name, building, capacity, room_type, is_active) VALUES
  (gen_random_uuid(), 'SCI-101', 'Science Building Room 101', 'Science Building', 30, 'CLASSROOM', true),
  (gen_random_uuid(), 'SCI-102', 'Science Building Room 102', 'Science Building', 35, 'CLASSROOM', true),
  (gen_random_uuid(), 'SCI-LAB1', 'Science Lab 1', 'Science Building', 25, 'LAB', true),
  (gen_random_uuid(), 'ENG-201', 'Engineering Building Room 201', 'Engineering Building', 40, 'CLASSROOM', true),
  (gen_random_uuid(), 'ENG-LAB1', 'Engineering Lab 1', 'Engineering Building', 20, 'LAB', true),
  (gen_random_uuid(), 'LECT-A', 'Lecture Hall A', 'Main Building', 100, 'LECTURE_HALL', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- COURSES
-- ============================================================================

DO $$
DECLARE
  cs_dept_id uuid;
  math_dept_id uuid;
  cs101_id uuid;
  cs102_id uuid;
  cs201_id uuid;
  cs202_id uuid;
  math101_id uuid;
  math201_id uuid;
BEGIN
  SELECT id INTO cs_dept_id FROM departments WHERE code = 'CS' LIMIT 1;
  SELECT id INTO math_dept_id FROM departments WHERE code = 'MATH' LIMIT 1;

  -- Computer Science Courses
  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'CS101', 'Introduction to Programming', 'Fundamentals of programming using Python', cs_dept_id, 3, '100', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO cs101_id;

  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'CS102', 'Data Structures', 'Introduction to data structures and algorithms', cs_dept_id, 3, '100', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO cs102_id;

  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'CS201', 'Object-Oriented Programming', 'Advanced programming with OOP principles', cs_dept_id, 4, '200', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO cs201_id;

  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'CS202', 'Database Systems', 'Introduction to database design and SQL', cs_dept_id, 4, '200', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO cs202_id;

  -- Mathematics Courses
  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'MATH101', 'Calculus I', 'Differential calculus and applications', math_dept_id, 4, '100', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO math101_id;

  INSERT INTO courses (id, code, name, description, department_id, credits, level, is_active)
  VALUES (gen_random_uuid(), 'MATH201', 'Linear Algebra', 'Vectors, matrices, and linear transformations', math_dept_id, 3, '200', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO math201_id;

  -- Get IDs if they already existed
  IF cs101_id IS NULL THEN SELECT id INTO cs101_id FROM courses WHERE code = 'CS101'; END IF;
  IF cs102_id IS NULL THEN SELECT id INTO cs102_id FROM courses WHERE code = 'CS102'; END IF;
  IF cs201_id IS NULL THEN SELECT id INTO cs201_id FROM courses WHERE code = 'CS201'; END IF;
  IF cs202_id IS NULL THEN SELECT id INTO cs202_id FROM courses WHERE code = 'CS202'; END IF;
  IF math101_id IS NULL THEN SELECT id INTO math101_id FROM courses WHERE code = 'MATH101'; END IF;

  -- Prerequisites
  INSERT INTO course_prerequisites (course_id, prerequisite_id)
  VALUES 
    (cs102_id, cs101_id),
    (cs201_id, cs102_id),
    (cs202_id, cs102_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- SYSTEM SETTINGS (if not already set)
-- ============================================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Global maintenance mode flag'),
  ('session_timeout_minutes', '30', 'Inactivity timeout in minutes'),
  ('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
  ('password_history_count', '5', 'Number of previous passwords to check'),
  ('max_credits_per_term', '18', 'Maximum credits a student can register per term'),
  ('registration_buffer_days', '7', 'Days before term start when registration opens')
ON CONFLICT (key) DO UPDATE SET updated_at = now();

-- ============================================================================
-- FEE STRUCTURES
-- ============================================================================

INSERT INTO fee_structures (id, name, description, amount, fee_type, per_credit, is_active) VALUES
  (gen_random_uuid(), 'Tuition (Per Credit)', 'Standard tuition fee per credit hour', 500.00, 'TUITION', true, true),
  (gen_random_uuid(), 'Lab Fee', 'Laboratory course fee', 150.00, 'LAB', false, true),
  (gen_random_uuid(), 'Technology Fee', 'Technology and infrastructure fee', 200.00, 'TECHNOLOGY', false, true),
  (gen_random_uuid(), 'Library Fee', 'Library access and services', 100.00, 'LIBRARY', false, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTIFICATION CATEGORIES DEFAULT PREFERENCES
-- ============================================================================

-- These will be used as defaults when creating new users
-- Actual user preferences will be created when user profiles are created

-- ============================================================================
-- SAMPLE SECTIONS (for Fall 2025)
-- ============================================================================

DO $$
DECLARE
  fall2025_id uuid;
  cs101_id uuid;
  cs102_id uuid;
  math101_id uuid;
  room101_id uuid;
  room102_id uuid;
  lect_a_id uuid;
BEGIN
  SELECT id INTO fall2025_id FROM terms WHERE code = 'FALL2025' LIMIT 1;
  SELECT id INTO cs101_id FROM courses WHERE code = 'CS101' LIMIT 1;
  SELECT id INTO cs102_id FROM courses WHERE code = 'CS102' LIMIT 1;
  SELECT id INTO math101_id FROM courses WHERE code = 'MATH101' LIMIT 1;
  SELECT id INTO room101_id FROM rooms WHERE code = 'SCI-101' LIMIT 1;
  SELECT id INTO room102_id FROM rooms WHERE code = 'SCI-102' LIMIT 1;
  SELECT id INTO lect_a_id FROM rooms WHERE code = 'LECT-A' LIMIT 1;

  -- CS101 Sections
  INSERT INTO sections (id, course_id, term_id, section_number, room_id, capacity, enrolled_count, schedule_days, start_time, end_time, status, is_active)
  VALUES 
    (gen_random_uuid(), cs101_id, fall2025_id, '001', room101_id, 30, 0, ARRAY['MONDAY', 'WEDNESDAY', 'FRIDAY'], '09:00', '10:00', 'OPEN', true),
    (gen_random_uuid(), cs101_id, fall2025_id, '002', room102_id, 30, 0, ARRAY['TUESDAY', 'THURSDAY'], '14:00', '15:30', 'OPEN', true)
  ON CONFLICT DO NOTHING;

  -- CS102 Section
  INSERT INTO sections (id, course_id, term_id, section_number, room_id, capacity, enrolled_count, schedule_days, start_time, end_time, status, is_active)
  VALUES 
    (gen_random_uuid(), cs102_id, fall2025_id, '001', room102_id, 30, 0, ARRAY['MONDAY', 'WEDNESDAY', 'FRIDAY'], '11:00', '12:00', 'OPEN', true)
  ON CONFLICT DO NOTHING;

  -- MATH101 Section
  INSERT INTO sections (id, course_id, term_id, section_number, room_id, capacity, enrolled_count, schedule_days, start_time, end_time, status, is_active)
  VALUES 
    (gen_random_uuid(), math101_id, fall2025_id, '001', lect_a_id, 100, 0, ARRAY['MONDAY', 'WEDNESDAY', 'FRIDAY'], '13:00', '14:00', 'OPEN', true)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- To create actual test users, use the Supabase Auth API:
-- 
-- Example (using Supabase client):
-- const { data, error } = await supabase.auth.admin.createUser({
--   email: 'admin@university.edu',
--   password: 'TestPassword123!',
--   email_confirm: true
-- });
--
-- Then insert into user_profiles with the returned user.id
