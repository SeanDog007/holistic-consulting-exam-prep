-- Migration 002: prevent duplicate ACTIVE enrollments per email.
--
-- Belt-and-suspenders backing the app-level idempotency added to
-- createEnrollment() in utils/enrollments.js. A partial unique index means
-- the database itself will reject a second active row for the same email.
--
-- SAFE TO RUN ONLY AFTER existing duplicates are resolved (each email must
-- already have at most one active row). The duplicates present as of
-- 2026-07 were cleaned up (extras set to status='cancelled') before this.
--
-- Apply via the Supabase SQL editor (DDL can't go through the REST API).

CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_enrollments_active_email
  ON direct_enrollments (email)
  WHERE status = 'active';
