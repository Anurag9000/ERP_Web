/*
  # Registrar Requests messaging

  Adds table + policies so students can submit registrar service requests
  (official transcripts, certificates, notarised copies) and admins can
  manage fulfilment.
*/

-- Registrar requests
CREATE TABLE IF NOT EXISTS registrar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (
    request_type IN ('TRANSCRIPT', 'ENROLLMENT_CERTIFICATE', 'GRADUATION_CERTIFICATE', 'OTHER')
  ),
  delivery_format text DEFAULT 'PDF' CHECK (delivery_format IN ('PDF', 'PAPER', 'NOTARIZED')),
  message text,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PROCESSING', 'READY', 'CLOSED')),
  preferred_channel text DEFAULT 'EMAIL' CHECK (preferred_channel IN ('EMAIL', 'PICKUP')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_registrar_requests_student ON registrar_requests(student_id);

ALTER TABLE registrar_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own registrar requests"
  ON registrar_requests
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can create registrar requests"
  ON registrar_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins manage registrar requests"
  ON registrar_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
