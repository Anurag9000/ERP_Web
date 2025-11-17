/*
  # Instructor Messaging Hub

  Adds section messaging tables so instructors can send announcements to
  sections or individual students. Includes recipient tracking and RLS.
*/

CREATE TABLE IF NOT EXISTS section_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  delivery_scope text NOT NULL CHECK (delivery_scope IN ('SECTION', 'STUDENT')),
  delivery_channel text NOT NULL CHECK (delivery_channel IN ('IN_APP', 'EMAIL', 'SMS')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES section_messages(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ')),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_section_messages_section ON section_messages(section_id);
CREATE INDEX IF NOT EXISTS idx_section_message_recipients_student ON section_message_recipients(student_id);

ALTER TABLE section_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_message_recipients ENABLE ROW LEVEL SECURITY;

-- Instructors can insert/select messages for their sections
CREATE POLICY "Instructors manage own section messages"
  ON section_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections
      WHERE sections.id = section_messages.section_id
      AND sections.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections
      WHERE sections.id = section_messages.section_id
      AND sections.instructor_id = auth.uid()
    )
  );

-- Students can read messages targeted to them or their section
CREATE POLICY "Students read section messages"
  ON section_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM enrollments
      WHERE enrollments.section_id = section_messages.section_id
      AND enrollments.student_id = auth.uid()
      AND enrollments.status = 'ACTIVE'
    )
  );

CREATE POLICY "Instructors manage message recipients"
  ON section_message_recipients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM section_messages
      JOIN sections ON sections.id = section_messages.section_id
      WHERE section_messages.id = section_message_recipients.message_id
      AND sections.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM section_messages
      JOIN sections ON sections.id = section_messages.section_id
      WHERE section_messages.id = section_message_recipients.message_id
      AND sections.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students read receipts"
  ON section_message_recipients
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
