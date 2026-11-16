/**
 * Exam-track rules for the BCHN prep portal.
 *
 * NANP's cutoff: an exam on or after 2027-01-01 uses the 2027 study materials.
 * An earlier exam uses the 2026 materials.
 *
 * Content rows use exam_track '2026' | '2027' | 'both'.
 * A student sees rows whose exam_track is their track or 'both'.
 *
 * Retirement: after 2026-12-31 (or when EXAM_TRACK_ALLOW_2026=false), a student
 * who does not already have a target_exam_date before 2027-01-01 cannot choose
 * the 2026 track. Students who already have that earlier date keep it.
 *
 * Dates are calendar dates in EXAM_TRACK_TIMEZONE (default America/New_York).
 */

const CUTOFF_DATE = "2027-01-01";
const DEFAULT_RETIRE_2026_AFTER = "2026-12-31";
const DEFAULT_TIMEZONE = "America/New_York";

const TRACKS = ["2026", "2027"];
const CONTENT_TRACKS = ["2026", "2027", "both"];

const NANP_DOMAIN_NAMES = {
  1: "Food and Nutrition",
  2: "Fundamentals of Anatomy, Physiology, and Biochemistry",
  3: "Counseling, Ethics, and Scope of Practice",
  4: "Nutrition in Practice",
  5: "Research",
};

const DOMAIN_WEIGHTS = { 1: 35, 2: 15, 3: 10, 4: 30, 5: 10 };

// NANP full exam: 151 questions. Do not change these weights without a new study guide.
const DOMAIN_DISTRIBUTION = { 1: 53, 2: 23, 3: 15, 4: 45, 5: 15 };
const FULL_EXAM_TOTAL = 151;

const FIXED_EXAM_RE = /^(?:(2026|2027) )?Domain (\d+) Exam (\d+)$/;

const COVERAGE_NOTE_2027 =
  "2027 questions in this update: Hole's (Domain II), ethics, law, and scope (part of Domain III), and Krause items whose domain tags are a proposal David has not confirmed. Not in the bank yet: Integrative Medicine (Rakel), Craft of Research 5th edition, The Pantry Principle, and Domain III counseling skills.";

function distributionTotal(distribution = DOMAIN_DISTRIBUTION) {
  return Object.values(distribution).reduce((sum, n) => sum + n, 0);
}

function isoDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function trackSettings(options = {}) {
  const timeZone = options.timeZone || process.env.EXAM_TRACK_TIMEZONE || DEFAULT_TIMEZONE;
  const today = options.today || isoDateInTimeZone(options.now || new Date(), timeZone);
  const retireAfter = options.retireAfter || process.env.EXAM_TRACK_RETIRE_2026_AFTER || DEFAULT_RETIRE_2026_AFTER;
  const allow2026 = options.allow2026 !== undefined
    ? options.allow2026 !== false && options.allow2026 !== "false"
    : process.env.EXAM_TRACK_ALLOW_2026 !== "false";
  return {
    today,
    timeZone,
    retireAfter,
    allow2026,
    retired: !allow2026 || today > retireAfter,
    cutoff: CUTOFF_DATE,
  };
}

function dateToTrack(date) {
  const normalized = normalizeDate(date);
  if (!normalized) return null;
  return normalized >= CUTOFF_DATE ? "2027" : "2026";
}

function isGrandfathered2026(profile) {
  const date = normalizeDate(profile?.target_exam_date);
  return !!(date && date < CUTOFF_DATE);
}

function trackLabel(track) {
  if (track === "2027") return "Studying for an exam on or after Jan 1, 2027";
  if (track === "2026") return "Studying for an exam before Jan 1, 2027";
  return "Set your exam date to choose your study materials";
}

function resolveStudentTrack(profile, options = {}) {
  const settings = trackSettings(options);
  const date = normalizeDate(profile?.target_exam_date);
  const storedOverride = profile?.exam_track_override === "2026" || profile?.exam_track_override === "2027"
    ? profile.exam_track_override
    : null;
  const fromDate = dateToTrack(date);
  const grandfather = isGrandfathered2026(profile);
  const canPick2026 = !settings.retired || grandfather;

  let override = storedOverride;
  if (override === "2026" && !canPick2026) override = null;

  let track = override || fromDate;
  let provisional = false;
  if (!track) {
    track = settings.retired ? "2027" : "2026";
    provisional = true;
  }
  if (track === "2026" && !canPick2026) track = "2027";

  return {
    track,
    fromDate,
    override,
    date,
    needsExamDate: !date,
    provisional,
    canPick2026,
    retired: settings.retired,
    today: settings.today,
    retireAfter: settings.retireAfter,
    cutoff: settings.cutoff,
    label: trackLabel(track),
    coverageNote: track === "2027" ? COVERAGE_NOTE_2027 : null,
  };
}

function contentTracksFor(studentTrack) {
  if (studentTrack !== "2026" && studentTrack !== "2027") return null;
  return [studentTrack, "both"];
}

function questionVisibleOnTrack(questionTrack, studentTrack) {
  const allowed = contentTracksFor(studentTrack);
  if (!allowed) return false;
  return allowed.includes(questionTrack || "2026");
}

function isMissingExamTrackColumn(error) {
  if (!error) return false;
  const msg = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  return msg.includes("exam_track");
}

/**
 * Run a Supabase query. If the exam_track column is not in the database yet,
 * retry without the filter and mark schemaPending. makeQuery() must build a
 * fresh query builder on every call.
 */
async function runTrackedQuery(makeQuery, trackInfo) {
  const filter = (query) => {
    if (!trackInfo || trackInfo.schemaPending || !trackInfo.track) return query;
    const allowed = contentTracksFor(trackInfo.track);
    if (!allowed) return query;
    return query.in("exam_track", allowed);
  };

  const first = await filter(makeQuery());
  if (first.error && isMissingExamTrackColumn(first.error)) {
    if (trackInfo) trackInfo.schemaPending = true;
    const retry = await makeQuery();
    retry.schemaPending = true;
    return retry;
  }
  return first;
}

async function loadActiveFocusAreas(client, userId, trackInfo) {
  let res = await client
    .from("user_focus_areas")
    .select("id, lesson_id, domain, wrong_count, last_wrong_at, study_lessons(id, title, exam_track, study_modules(title, exam_track))")
    .eq("user_id", userId)
    .eq("status", "active");

  if (res.error && isMissingExamTrackColumn(res.error)) {
    if (trackInfo) trackInfo.schemaPending = true;
    res = await client
      .from("user_focus_areas")
      .select("id, lesson_id, domain, wrong_count, last_wrong_at, study_lessons(id, title, study_modules(title))")
      .eq("user_id", userId)
      .eq("status", "active");
  }

  const rows = (res.data || []).filter((row) => {
    if (!row.study_lessons) return false;
    if (!trackInfo || trackInfo.schemaPending) return true;
    const lessonTrack = row.study_lessons.exam_track || "2026";
    const moduleTrack = row.study_lessons.study_modules?.exam_track || lessonTrack;
    return questionVisibleOnTrack(lessonTrack, trackInfo.track)
      && questionVisibleOnTrack(moduleTrack, trackInfo.track);
  });
  return { data: rows, error: res.error || null };
}

async function fetchAllTracked(makeQuery, trackInfo, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const page = await runTrackedQuery(
      () => makeQuery().range(from, from + pageSize - 1),
      trackInfo
    );
    if (page.error) return page;
    rows.push(...(page.data || []));
    if (!page.data || page.data.length < pageSize) break;
  }
  return { data: rows, error: null, schemaPending: !!trackInfo?.schemaPending };
}

async function loadStudentTrack(client, userId, options = {}) {
  const withOverride = await client
    .from("student_profiles")
    .select("target_exam_date, exam_track_override")
    .eq("id", userId)
    .maybeSingle();

  if (withOverride.error && isMissingExamTrackColumn(withOverride.error)) {
    const fallback = await client
      .from("student_profiles")
      .select("target_exam_date")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error && fallback.error.code !== "PGRST116") {
      throw new Error(fallback.error.message);
    }
    return { ...resolveStudentTrack(fallback.data || {}, options), schemaPending: true };
  }

  if (withOverride.error && withOverride.error.code !== "PGRST116") {
    throw new Error(withOverride.error.message);
  }

  return { ...resolveStudentTrack(withOverride.data || {}, options), schemaPending: false };
}

function validateTrackUpdate(existingProfile, updates, options = {}) {
  const settings = trackSettings(options);
  const grandfather = isGrandfathered2026(existingProfile);
  const nextDate = updates.exam_date !== undefined
    ? normalizeDate(updates.exam_date)
    : normalizeDate(existingProfile?.target_exam_date);
  const nextOverride = updates.exam_track !== undefined
    ? updates.exam_track
    : (existingProfile?.exam_track_override || null);

  if (updates.exam_track !== undefined && updates.exam_track !== null && !TRACKS.includes(updates.exam_track)) {
    return { ok: false, error: "exam_track must be 2026, 2027, or null." };
  }
  if (updates.exam_date !== undefined && updates.exam_date && !normalizeDate(updates.exam_date)) {
    return { ok: false, error: "Invalid date format. Use YYYY-MM-DD." };
  }

  if (settings.retired && !grandfather) {
    if (nextDate && nextDate < CUTOFF_DATE) {
      return {
        ok: false,
        error: "Exam dates before Jan 1, 2027 use the 2026 materials, which are closed for students who do not already have a 2026 exam date. Choose a date on or after Jan 1, 2027.",
      };
    }
    if (nextOverride === "2026") {
      return {
        ok: false,
        error: "The 2026 materials are closed for students who do not already have an exam date before Jan 1, 2027.",
      };
    }
  }

  return { ok: true, nextDate, nextOverride: nextOverride || null };
}

function fullExamPlan(countsByDomain, distribution = DOMAIN_DISTRIBUTION) {
  const shortfall = {};
  for (const [domain, need] of Object.entries(distribution)) {
    const have = countsByDomain[domain] || countsByDomain[Number(domain)] || 0;
    if (have < need) shortfall[domain] = { need, have };
  }
  const total = distributionTotal(distribution);
  return {
    ok: Object.keys(shortfall).length === 0,
    total,
    distribution,
    shortfall,
  };
}

function fullExamShortfallMessage(plan) {
  const parts = Object.entries(plan.shortfall).map(([domain, row]) => {
    const name = NANP_DOMAIN_NAMES[domain] || `Domain ${domain}`;
    return `Domain ${domain} (${name}) has ${row.have} of ${row.need}`;
  });
  return `This track does not have enough questions for a ${plan.total}-question exam at the NANP distribution. ${parts.join("; ")}.`;
}

function publicTrackPayload(trackInfo) {
  return {
    exam_track: trackInfo.track,
    exam_track_label: trackInfo.label,
    exam_track_override: trackInfo.override,
    exam_track_from_date: trackInfo.fromDate,
    needs_exam_date: trackInfo.needsExamDate,
    provisional_track: trackInfo.provisional,
    can_pick_2026: trackInfo.canPick2026,
    retire_2026_after: trackInfo.retireAfter,
    schema_pending: !!trackInfo.schemaPending,
    coverage_note: trackInfo.schemaPending ? null : trackInfo.coverageNote,
  };
}

module.exports = {
  CUTOFF_DATE,
  DEFAULT_RETIRE_2026_AFTER,
  DEFAULT_TIMEZONE,
  TRACKS,
  CONTENT_TRACKS,
  NANP_DOMAIN_NAMES,
  DOMAIN_WEIGHTS,
  DOMAIN_DISTRIBUTION,
  FULL_EXAM_TOTAL,
  FIXED_EXAM_RE,
  COVERAGE_NOTE_2027,
  distributionTotal,
  isoDateInTimeZone,
  normalizeDate,
  trackSettings,
  dateToTrack,
  isGrandfathered2026,
  trackLabel,
  resolveStudentTrack,
  contentTracksFor,
  questionVisibleOnTrack,
  isMissingExamTrackColumn,
  runTrackedQuery,
  fetchAllTracked,
  loadActiveFocusAreas,
  loadStudentTrack,
  validateTrackUpdate,
  fullExamPlan,
  fullExamShortfallMessage,
  publicTrackPayload,
};
