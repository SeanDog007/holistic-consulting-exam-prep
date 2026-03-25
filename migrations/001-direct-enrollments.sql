-- Migration: Create direct_enrollments table for Stripe direct purchase flow
-- Run this in the Supabase SQL editor for the HCQ project
-- Project: uvzfhksyjqadkxypcocq

CREATE TABLE IF NOT EXISTS direct_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  price_id TEXT,
  amount_paid INTEGER, -- in cents
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'refunded')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_direct_enrollments_email ON direct_enrollments (email);

-- Index for Stripe session deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_enrollments_stripe_session ON direct_enrollments (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Enable RLS (service role bypasses it, so our functions still work)
ALTER TABLE direct_enrollments ENABLE ROW LEVEL SECURITY;

-- No public access policies — only service role can read/write
-- This is correct: Netlify functions use SUPABASE_SERVICE_ROLE_KEY

COMMENT ON TABLE direct_enrollments IS 'Stores direct Stripe purchases for BCHN Exam Prep. Managed by stripe-webhook and checked by check-access function.';
