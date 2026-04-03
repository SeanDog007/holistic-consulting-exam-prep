-- Trigger emails tracking table (Day 7 re-engagement, Day 28 churn prevention)
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS trigger_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id VARCHAR(100),
  UNIQUE(student_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_trigger_emails_student
  ON trigger_emails_sent(student_id, trigger_type);
