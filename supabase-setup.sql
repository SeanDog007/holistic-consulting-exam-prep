-- ============================================
-- BCHN Exam Prep Platform — Supabase Setup
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor → New Query → paste → Run
-- Uses the same Supabase instance as the CRM (uvzfhksyjqadkxypcocq)

-- ============================================
-- 1. STUDENT PROFILES (extends auth.users)
-- ============================================
CREATE TABLE student_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  target_exam_date date,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. QUESTIONS (exam question bank)
-- ============================================
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain smallint NOT NULL CHECK (domain BETWEEN 1 AND 5),
  topic text NOT NULL,
  subtopic text,
  difficulty smallint NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  cognitive_level text NOT NULL DEFAULT 'recall'
    CHECK (cognitive_level IN ('recall', 'application', 'analysis')),
  question_type text NOT NULL DEFAULT 'mc'
    CHECK (question_type IN ('mc', 'tf', 'matching', 'fill')),
  question_text text NOT NULL,
  options jsonb,                -- for mc: ["option A", "option B", ...]; for matching: {terms: [], definitions: []}
  correct_answer text NOT NULL, -- for mc: "A"/"B"/"C"/"D"; for tf: "true"/"false"; for fill: expected text
  explanation text,             -- why the correct answer is correct
  textbook_reference text,      -- e.g. "Encyclopedia of Healing Foods, Ch. 7"
  times_shown integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  flag_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. QUESTION ATTEMPTS (individual practice)
-- ============================================
CREATE TABLE question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  time_taken_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. EXAM ATTEMPTS (full-length & practice exams)
-- ============================================
CREATE TABLE exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type text NOT NULL DEFAULT 'practice'
    CHECK (exam_type IN ('diagnostic', 'practice', 'full', 'domain')),
  domain_filter smallint,       -- NULL for full/diagnostic, 1-5 for domain-specific practice
  total_questions integer NOT NULL,
  correct_count integer,
  score_pct numeric(5,2),
  domain_scores jsonb,          -- {"1": 85.0, "2": 72.5, "3": 90.0, "4": 68.0, "5": 80.0}
  is_passed boolean,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  time_limit_minutes integer,   -- NULL = untimed
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 5. EXAM ANSWERS (per-question within an exam)
-- ============================================
CREATE TABLE exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_number smallint NOT NULL,
  selected_answer text,
  is_correct boolean,
  time_taken_seconds integer,
  flagged_for_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 6. FLASHCARDS
-- ============================================
CREATE TABLE flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain smallint NOT NULL CHECK (domain BETWEEN 1 AND 5),
  topic text NOT NULL,
  front_text text NOT NULL,
  back_text text NOT NULL,
  front_image_url text,
  card_type text NOT NULL DEFAULT 'text'
    CHECK (card_type IN ('text', 'image', 'scenario', 'term')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 7. FLASHCARD REVIEWS (spaced repetition tracking)
-- ============================================
CREATE TABLE flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  quality smallint NOT NULL CHECK (quality BETWEEN 1 AND 5),
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50,
  interval_days integer NOT NULL DEFAULT 1,
  repetition_count integer NOT NULL DEFAULT 0,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one active review record per user+flashcard
CREATE UNIQUE INDEX idx_flashcard_reviews_unique
  ON flashcard_reviews(user_id, flashcard_id);

-- ============================================
-- 8. STUDY GUIDES (structured content)
-- ============================================
CREATE TABLE study_guide_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain smallint NOT NULL CHECK (domain BETWEEN 1 AND 5),
  section_order smallint NOT NULL,
  title text NOT NULL,
  content_html text NOT NULL,
  exam_alert boolean NOT NULL DEFAULT false,  -- "This topic appears frequently on the exam"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 9. STUDY PROGRESS (per-user section completion)
-- ============================================
CREATE TABLE study_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES study_guide_sections(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  highlights jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_study_progress_unique
  ON study_progress(user_id, section_id);

-- ============================================
-- 10. STUDY PLANS (personalized schedules)
-- ============================================
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_exam_date date,
  plan_data jsonb NOT NULL,     -- week-by-week schedule with domain allocations
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 11. DIAGNOSTIC RESULTS
-- ============================================
CREATE TABLE diagnostic_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_scores jsonb NOT NULL, -- {"1": 60, "2": 45, "3": 80, "4": 55, "5": 70}
  weak_topics jsonb,            -- ["detoxification", "endocrine system", ...]
  taken_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 12. QUESTION FLAGS (student-reported issues)
-- ============================================
CREATE TABLE question_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reason text NOT NULL,         -- "incorrect answer", "unclear question", "typo", "other"
  details text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_questions_domain ON questions(domain);
CREATE INDEX idx_questions_topic ON questions(domain, topic);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = true;
CREATE INDEX idx_question_attempts_user ON question_attempts(user_id);
CREATE INDEX idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_answers_attempt ON exam_answers(exam_attempt_id);
CREATE INDEX idx_flashcard_reviews_user_next ON flashcard_reviews(user_id, next_review_at);
CREATE INDEX idx_flashcards_domain ON flashcards(domain);
CREATE INDEX idx_study_progress_user ON study_progress(user_id);
CREATE INDEX idx_study_guide_sections_domain ON study_guide_sections(domain, section_order);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on student_profiles
CREATE TRIGGER set_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on questions
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on flashcards
CREATE TRIGGER set_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on study_progress
CREATE TRIGGER set_study_progress_updated_at
  BEFORE UPDATE ON study_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on study_plans
CREATE TRIGGER set_study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update last_active_at on student_profiles when they do anything
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_profiles
  SET last_active_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_activity_question_attempts
  AFTER INSERT ON question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

CREATE TRIGGER track_activity_exam_attempts
  AFTER INSERT ON exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

CREATE TRIGGER track_activity_flashcard_reviews
  AFTER INSERT ON flashcard_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- Auto-increment question stats when answered
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE questions
  SET times_shown = times_shown + 1,
      times_correct = times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_stats_on_attempt
  AFTER INSERT ON question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_question_stats();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_guide_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_flags ENABLE ROW LEVEL SECURITY;

-- Student profiles: users see their own, admins see all
CREATE POLICY "Users can view own profile"
  ON student_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON student_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON student_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert profiles"
  ON student_profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update all profiles"
  ON student_profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Questions: all authenticated users can read active questions
CREATE POLICY "Authenticated users can read active questions"
  ON questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage questions
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Question attempts: users can insert and read their own
CREATE POLICY "Users can insert own question attempts"
  ON question_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own question attempts"
  ON question_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all question attempts"
  ON question_attempts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Exam attempts: users own their data
CREATE POLICY "Users can manage own exam attempts"
  ON exam_attempts FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all exam attempts"
  ON exam_attempts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Exam answers: users own their data
CREATE POLICY "Users can manage own exam answers"
  ON exam_answers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM exam_attempts WHERE id = exam_answers.exam_attempt_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can read all exam answers"
  ON exam_answers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Flashcards: all authenticated users can read
CREATE POLICY "Authenticated users can read flashcards"
  ON flashcards FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage flashcards"
  ON flashcards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Flashcard reviews: users own their data
CREATE POLICY "Users can manage own flashcard reviews"
  ON flashcard_reviews FOR ALL
  USING (user_id = auth.uid());

-- Study guide sections: all authenticated users can read
CREATE POLICY "Authenticated users can read study guides"
  ON study_guide_sections FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage study guides"
  ON study_guide_sections FOR ALL
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Study progress: users own their data
CREATE POLICY "Users can manage own study progress"
  ON study_progress FOR ALL
  USING (user_id = auth.uid());

-- Study plans: users own their data
CREATE POLICY "Users can manage own study plans"
  ON study_plans FOR ALL
  USING (user_id = auth.uid());

-- Diagnostic results: users own their data
CREATE POLICY "Users can manage own diagnostic results"
  ON diagnostic_results FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all diagnostic results"
  ON diagnostic_results FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Question flags: users can create, admins can manage
CREATE POLICY "Users can create question flags"
  ON question_flags FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own flags"
  ON question_flags FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all flags"
  ON question_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM student_profiles WHERE id = auth.uid() AND is_admin = true)
  );
