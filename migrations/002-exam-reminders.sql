-- Migration: Add email reminder preferences to student_profiles
-- Run this in the Supabase SQL editor for the HCQ project
-- Project: uvzfhksyjqadkxypcocq

-- Add email reminder opt-in column (defaults to true for new students)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add unsubscribe token for one-click unsubscribe (unique per student)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Ensure unsubscribe tokens are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_unsub_token
  ON student_profiles (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;

-- Index for the daily reminder query: active students with exam dates and reminders enabled
CREATE INDEX IF NOT EXISTS idx_student_profiles_reminder_eligible
  ON student_profiles (target_exam_date)
  WHERE email_reminders_enabled = true
    AND target_exam_date IS NOT NULL
    AND is_active = true;

COMMENT ON COLUMN student_profiles.email_reminders_enabled IS 'Whether the student receives daily study reminder emails';
COMMENT ON COLUMN student_profiles.unsubscribe_token IS 'One-click unsubscribe token for email reminders';
