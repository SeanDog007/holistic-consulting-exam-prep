const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveStudentTrack,
  questionVisibleOnTrack,
  fullExamPlan,
  validateTrackUpdate,
  distributionTotal,
  FULL_EXAM_TOTAL,
  DOMAIN_DISTRIBUTION,
  FIXED_EXAM_RE,
  NANP_DOMAIN_NAMES,
} = require("../netlify/functions/utils/exam-track");

const TODAY = "2026-11-16";

describe("student track from exam date", () => {
  test("a date before 2027-01-01 is the 2026 track", () => {
    const track = resolveStudentTrack({ target_exam_date: "2026-12-31" }, { today: TODAY });
    assert.equal(track.track, "2026");
    assert.equal(track.needsExamDate, false);
    assert.match(track.label, /before Jan 1, 2027/);
  });

  test("2027-01-01 and later is the 2027 track", () => {
    assert.equal(resolveStudentTrack({ target_exam_date: "2027-01-01" }, { today: TODAY }).track, "2027");
    assert.equal(resolveStudentTrack({ target_exam_date: "2027-06-15" }, { today: TODAY }).track, "2027");
    assert.match(resolveStudentTrack({ target_exam_date: "2027-06-15" }, { today: TODAY }).label, /on or after Jan 1, 2027/);
  });

  test("no date asks the student to set one and uses a provisional track", () => {
    const track = resolveStudentTrack({}, { today: TODAY });
    assert.equal(track.needsExamDate, true);
    assert.equal(track.provisional, true);
    assert.equal(track.track, "2026");
  });

  test("an explicit switch overrides the date", () => {
    const track = resolveStudentTrack(
      { target_exam_date: "2026-12-01", exam_track_override: "2027" },
      { today: TODAY }
    );
    assert.equal(track.track, "2027");
    assert.equal(track.fromDate, "2026");
  });
});

describe("retiring the 2026 track", () => {
  test("after 2026-12-31 a new student cannot choose 2026", () => {
    const track = resolveStudentTrack({}, { today: "2027-01-01" });
    assert.equal(track.canPick2026, false);
    assert.equal(track.track, "2027");
    const blocked = validateTrackUpdate({}, { exam_date: "2026-11-01" }, { today: "2027-01-01" });
    assert.equal(blocked.ok, false);
  });

  test("a student who already has a 2026 exam date keeps that track", () => {
    const track = resolveStudentTrack({ target_exam_date: "2026-12-15" }, { today: "2027-03-01" });
    assert.equal(track.track, "2026");
    assert.equal(track.canPick2026, true);
  });

  test("EXAM_TRACK_ALLOW_2026=false closes 2026 for new students early", () => {
    const previous = process.env.EXAM_TRACK_ALLOW_2026;
    process.env.EXAM_TRACK_ALLOW_2026 = "false";
    try {
      const track = resolveStudentTrack({}, { today: TODAY });
      assert.equal(track.canPick2026, false);
      assert.equal(track.track, "2027");
    } finally {
      if (previous === undefined) delete process.env.EXAM_TRACK_ALLOW_2026;
      else process.env.EXAM_TRACK_ALLOW_2026 = previous;
    }
  });
});

describe("question visibility and the 151-question exam", () => {
  test("a student sees their track and rows tagged both", () => {
    assert.equal(questionVisibleOnTrack("2026", "2026"), true);
    assert.equal(questionVisibleOnTrack("both", "2026"), true);
    assert.equal(questionVisibleOnTrack("2027", "2026"), false);
    assert.equal(questionVisibleOnTrack("2026", "2027"), false);
    assert.equal(questionVisibleOnTrack("2027", "2027"), true);
  });

  test("the NANP distribution adds up to 151", () => {
    assert.equal(distributionTotal(), 151);
    assert.equal(FULL_EXAM_TOTAL, 151);
    assert.deepEqual(DOMAIN_DISTRIBUTION, { 1: 53, 2: 23, 3: 15, 4: 45, 5: 15 });
  });

  test("a full exam is refused when a domain is short", () => {
    const plan = fullExamPlan({ 1: 53, 2: 23, 3: 15, 4: 45, 5: 0 });
    assert.equal(plan.ok, false);
    assert.equal(plan.shortfall["5"].have, 0);
    assert.equal(plan.shortfall["5"].need, 15);
  });

  test("fixed exam names accept the current label and an optional year", () => {
    assert.equal(FIXED_EXAM_RE.test("Domain 2 Exam 4"), true);
    assert.equal(FIXED_EXAM_RE.test("2027 Domain 2 Exam 4"), true);
    assert.equal(FIXED_EXAM_RE.test("Hole's Chapter 3"), false);
  });

  test("domain names are the NANP names, not the RD exam names", () => {
    assert.equal(NANP_DOMAIN_NAMES[2], "Fundamentals of Anatomy, Physiology, and Biochemistry");
    assert.equal(NANP_DOMAIN_NAMES[3], "Counseling, Ethics, and Scope of Practice");
    assert.doesNotMatch(NANP_DOMAIN_NAMES[2], /Food Service|Community Nutrition/);
  });
});
