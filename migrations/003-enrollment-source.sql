-- Optional: record which integration wrote a direct_enrollments row.
--
-- samcart-webhook.js stores the order as stripe_session_id = 'samcart:<order id>'
-- whether or not this column exists, and retries the insert without `source`
-- when PostgREST reports the column is missing. Run this in the Supabase SQL
-- editor when you want `source = 'samcart'` stored on its own. Do not apply
-- it from CI, and do not run it against a project you have not picked.
-- Safe to run more than once. Existing Stripe and Circle rows stay null.

ALTER TABLE direct_enrollments
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN direct_enrollments.source IS
  'Which integration wrote the row: stripe, samcart, or circle. Null on rows created before this column existed.';
