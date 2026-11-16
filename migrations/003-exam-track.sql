-- Exam tracks for the NANP 2027 reference-material change.
--
-- Sean runs this in the Supabase SQL editor after review.
-- It was not applied by the coding agent. It does not delete rows.
-- Safe to run more than once.
--
-- Existing questions, flashcards, study guides, modules, and lessons
-- default to exam_track '2026' until David reviews them.
-- A row marked 'both' is shown on the 2026 track and the 2027 track.
--
-- student_profiles.exam_track_override is optional. When it is null,
-- the portal derives the track from target_exam_date:
--   on or after 2027-01-01 → 2027
--   before 2027-01-01      → 2026

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '2026';

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_exam_track_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_exam_track_check
  CHECK (exam_track IN ('2026', '2027', 'both'));

UPDATE questions SET exam_track = '2026' WHERE exam_track IS NULL;

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '2026';

ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_exam_track_check;
ALTER TABLE flashcards
  ADD CONSTRAINT flashcards_exam_track_check
  CHECK (exam_track IN ('2026', '2027', 'both'));

UPDATE flashcards SET exam_track = '2026' WHERE exam_track IS NULL;

ALTER TABLE study_guide_sections
  ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '2026';

ALTER TABLE study_guide_sections DROP CONSTRAINT IF EXISTS study_guide_sections_exam_track_check;
ALTER TABLE study_guide_sections
  ADD CONSTRAINT study_guide_sections_exam_track_check
  CHECK (exam_track IN ('2026', '2027', 'both'));

UPDATE study_guide_sections SET exam_track = '2026' WHERE exam_track IS NULL;

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS exam_track_override text;

ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_exam_track_override_check;
ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_exam_track_override_check
  CHECK (exam_track_override IS NULL OR exam_track_override IN ('2026', '2027'));

CREATE INDEX IF NOT EXISTS idx_questions_domain_track
  ON questions (domain, exam_track)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_flashcards_domain_track
  ON flashcards (domain, exam_track)
  WHERE is_active = true;

-- study_modules and study_lessons are used by the portal but are not in
-- supabase-setup.sql. Add the column only when the table is present.
DO $$
BEGIN
  IF to_regclass('public.study_modules') IS NOT NULL THEN
    ALTER TABLE study_modules
      ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '2026';
    ALTER TABLE study_modules DROP CONSTRAINT IF EXISTS study_modules_exam_track_check;
    ALTER TABLE study_modules
      ADD CONSTRAINT study_modules_exam_track_check
      CHECK (exam_track IN ('2026', '2027', 'both'));
    UPDATE study_modules SET exam_track = '2026' WHERE exam_track IS NULL;
    CREATE INDEX IF NOT EXISTS idx_study_modules_domain_track
      ON study_modules (domain, exam_track);
  END IF;

  IF to_regclass('public.study_lessons') IS NOT NULL THEN
    ALTER TABLE study_lessons
      ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '2026';
    ALTER TABLE study_lessons DROP CONSTRAINT IF EXISTS study_lessons_exam_track_check;
    ALTER TABLE study_lessons
      ADD CONSTRAINT study_lessons_exam_track_check
      CHECK (exam_track IN ('2026', '2027', 'both'));
    UPDATE study_lessons SET exam_track = '2026' WHERE exam_track IS NULL;
  END IF;
END $$;

COMMIT;
