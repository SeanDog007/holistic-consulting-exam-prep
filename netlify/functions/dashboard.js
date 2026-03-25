const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

const DOMAIN_NAMES = {
  1: "Food & Nutrition",
  2: "A&P / Biochemistry",
  3: "Counseling / Ethics / Scope",
  4: "Nutrition in Practice",
  5: "Research",
};
const DOMAIN_WEIGHTS = { 1: 35, 2: 15, 3: 10, 4: 30, 5: 10 };

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // ── Fetch all data in parallel ──────────────────────────────────
  const [
    { data: attempts },
    { data: exams },
    { count: questionsDue },
    { count: questionsMastered },
    { data: focusAreas },
    { data: todayAttempts },
    { data: todayExams },
  ] = await Promise.all([
    // All question attempts with domain
    userClient
      .from("question_attempts")
      .select("is_correct, created_at, questions(domain)")
      .eq("user_id", user.id),
    // Exam history
    userClient
      .from("exam_attempts")
      .select("id, score_pct, is_passed, completed_at, exam_type")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    // Questions due for spaced repetition
    userClient
      .from("question_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString()),
    // Mastered questions
    userClient
      .from("question_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("interval_days", 21),
    // Active focus areas with lesson info
    userClient
      .from("user_focus_areas")
      .select("id, lesson_id, domain, wrong_count, last_wrong_at, study_lessons(id, title, study_modules(title))")
      .eq("user_id", user.id)
      .eq("status", "active"),
    // Today's question attempts (to know what they've done today)
    userClient
      .from("question_attempts")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
    // Today's completed exams
    userClient
      .from("exam_attempts")
      .select("id, exam_type, completed_at")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ]);

  // ── Domain mastery ──────────────────────────────────────────────
  const domainStats = {};
  for (const a of (attempts || [])) {
    const d = a.questions?.domain;
    if (!d) continue;
    if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0, recentMisses: 0 };
    domainStats[d].total++;
    if (a.is_correct) domainStats[d].correct++;
    else {
      // Count misses in the last 7 days
      const ageMs = Date.now() - new Date(a.created_at).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000) domainStats[d].recentMisses++;
    }
  }

  const domainMastery = {};
  let weightedScore = 0;
  let totalWeight = 0;
  for (let d = 1; d <= 5; d++) {
    const s = domainStats[d];
    const pct = s ? Math.round((s.correct / s.total) * 100) : 0;
    domainMastery[d] = { pct, correct: s?.correct || 0, total: s?.total || 0 };
    if (s) {
      weightedScore += pct * DOMAIN_WEIGHTS[d];
      totalWeight += DOMAIN_WEIGHTS[d];
    }
  }

  const readinessScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // ── Study streak ────────────────────────────────────────────────
  const dates = new Set((attempts || []).map(a => a.created_at?.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) streak++;
    else if (i > 0) break;
  }

  // ── Smart Priority Scoring ──────────────────────────────────────
  // Each candidate action gets a composite score (0-100). We pick top 3.
  const candidates = [];
  const todayKey = today.toISOString().slice(0, 10);
  const questionsToday = (todayAttempts || []).length;
  const examsToday = (todayExams || []);
  const diagnosticToday = examsToday.some(e => e.exam_type === "diagnostic");
  const practiceToday = questionsToday > 0;

  const allExams = exams || [];
  const diagnostics = allExams.filter(e => e.exam_type === "diagnostic");
  const lastDiagnostic = diagnostics[0];
  const daysSinceDiagnostic = lastDiagnostic
    ? (Date.now() - new Date(lastDiagnostic.completed_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  // ─ 1. High-priority Focus Area review ─────────────────────────
  const activeFAs = (focusAreas || []).filter(fa => fa.study_lessons);
  for (const fa of activeFAs) {
    const hoursSince = (Date.now() - new Date(fa.last_wrong_at).getTime()) / (1000 * 60 * 60);
    const wrongScore = Math.min(30, Math.log2(fa.wrong_count + 1) * 10);
    const recencyScore = Math.max(0, 25 - (hoursSince / 24) * 1.5);
    const domainWeightScore = (DOMAIN_WEIGHTS[fa.domain] || 10) * 0.6; // 0-21
    const priorityBonus = (wrongScore + recencyScore) >= 40 ? 15 : 0; // high-priority bonus

    const score = wrongScore + recencyScore + domainWeightScore + priorityBonus;

    candidates.push({
      id: `focus-${fa.id}`,
      type: "focus-area",
      score: Math.min(95, score),
      title: `Review: ${fa.study_lessons.title}`,
      detail: `${DOMAIN_NAMES[fa.domain] || "Domain " + fa.domain} — missed ${fa.wrong_count} time${fa.wrong_count !== 1 ? "s" : ""}. ${fa.study_lessons.study_modules?.title || ""}`,
      action: "study-guide",
      actionLabel: "Review Now",
      lessonId: fa.lesson_id,
      icon: "focus",
    });
  }

  // ─ 2. Take diagnostic (only if never taken or 7+ days stale) ──
  if (!diagnosticToday) {
    if ((attempts || []).length === 0 && diagnostics.length === 0) {
      // Brand new student — diagnostic is THE priority
      candidates.push({
        id: "diagnostic-new",
        type: "diagnostic",
        score: 98, // Highest possible for new students
        title: "Take the Diagnostic Assessment",
        detail: "25 questions to map your strengths and weak areas. Takes ~15 minutes.",
        action: "practice",
        actionLabel: "Start Assessment",
        icon: "diagnostic",
      });
    } else if (daysSinceDiagnostic >= 7) {
      // Stale diagnostic — retake for updated baseline
      const staleDays = Math.round(daysSinceDiagnostic);
      candidates.push({
        id: "diagnostic-stale",
        type: "diagnostic",
        score: Math.min(80, 45 + staleDays * 0.5), // grows with staleness, caps at 80
        title: "Retake the Diagnostic",
        detail: `Last taken ${staleDays} days ago. Retake to see how much you've improved.`,
        action: "practice",
        actionLabel: "Retake",
        icon: "diagnostic",
      });
    }
  }

  // ─ 3. Weakest domain practice ─────────────────────────────────
  // Find weakest domain that has been attempted
  const attemptedDomains = Object.entries(domainMastery)
    .filter(([_, v]) => v.total > 0)
    .sort((a, b) => a[1].pct - b[1].pct);

  for (const [dStr, dm] of attemptedDomains) {
    const d = parseInt(dStr);
    if (dm.pct >= 80) continue; // already strong

    const weakness = (80 - dm.pct); // 0-80
    const weightBonus = DOMAIN_WEIGHTS[d] * 0.4; // 0-14
    const recentMissBonus = Math.min(15, (domainStats[d]?.recentMisses || 0) * 3);
    const score = Math.min(85, weakness * 0.7 + weightBonus + recentMissBonus);

    candidates.push({
      id: `domain-${d}`,
      type: "domain-practice",
      score,
      title: `Practice ${DOMAIN_NAMES[d]}`,
      detail: `Currently at ${dm.pct}%${dm.pct < 60 ? " — below passing" : dm.pct < 70 ? " — close to passing" : " — room to grow"}. ${dm.total} questions attempted.`,
      action: "practice",
      actionLabel: "Practice",
      actionData: { domain: d },
      icon: "practice",
    });
  }

  // ─ 4. Spaced repetition review ────────────────────────────────
  if ((questionsDue || 0) > 0) {
    const dueCount = questionsDue || 0;
    // Higher score with more due questions, but capped
    const score = Math.min(75, 35 + Math.log2(dueCount + 1) * 8);
    candidates.push({
      id: "spaced-rep",
      type: "spaced-repetition",
      score,
      title: `${dueCount} Question${dueCount !== 1 ? "s" : ""} Due for Review`,
      detail: "Spaced repetition keeps knowledge locked in. Don't break the chain.",
      action: "practice",
      actionLabel: "Review",
      icon: "review",
    });
  }

  // ─ 5. Mock exam (only if readiness > 70%) ─────────────────────
  const fullExams = allExams.filter(e => e.exam_type === "full");
  const tookFullToday = examsToday.some(e => e.exam_type === "full");
  if (readinessScore >= 70 && !tookFullToday) {
    const noFullYet = fullExams.length === 0;
    const score = noFullYet ? 65 : 40; // higher if they haven't tried one yet
    candidates.push({
      id: "mock-exam",
      type: "mock-exam",
      score,
      title: noFullYet ? "Ready for a Full Practice Exam" : "Take Another Practice Exam",
      detail: noFullYet
        ? `Your readiness score is ${readinessScore}% — time to test under real conditions.`
        : `Readiness at ${readinessScore}%. Keep sharpening under exam pressure.`,
      action: "full-exam",
      actionLabel: "Start Exam",
      icon: "exam",
    });
  }

  // ─ 6. Streak maintenance / gap recovery ───────────────────────
  if (streak === 0 && (attempts || []).length > 0 && !practiceToday) {
    // They have history but broke their streak
    candidates.push({
      id: "streak-recovery",
      type: "streak",
      score: 55,
      title: "Restart Your Study Streak",
      detail: "You had momentum going. Even 5 questions today gets you back on track.",
      action: "practice",
      actionLabel: "Quick Practice",
      icon: "streak",
    });
  } else if (streak >= 3 && !practiceToday) {
    // Active streak, keep it alive
    candidates.push({
      id: "streak-maintain",
      type: "streak",
      score: 50,
      title: `Keep Your ${streak}-Day Streak Alive`,
      detail: "Don't let today be the day it breaks. A quick session keeps it going.",
      action: "practice",
      actionLabel: "Quick Practice",
      icon: "streak",
    });
  }

  // ── Apply today-activity penalty ────────────────────────────────
  // If they already did something today, lower scores for similar actions
  for (const c of candidates) {
    if (practiceToday && (c.type === "domain-practice" || c.type === "streak")) {
      c.score *= 0.7; // reduce, but don't eliminate
    }
    if (diagnosticToday && c.type === "diagnostic") {
      c.score = 0; // already did it
    }
  }

  // ── Sort and pick top 3 ─────────────────────────────────────────
  candidates.sort((a, b) => b.score - a.score);
  const smartActions = candidates
    .filter(c => c.score > 5)
    .slice(0, 6) // send up to 6 so frontend can show "see all" if > 3
    .map((c, i) => ({
      ...c,
      rank: i === 0 ? "primary" : "secondary",
    }));

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      readinessScore,
      domainMastery,
      questionsAttempted: (attempts || []).length,
      examsTaken: (allExams || []).length,
      recentExams: allExams || [],
      streak,
      questionsDue: questionsDue || 0,
      questionsMastered: questionsMastered || 0,
      smartActions,
      // Keep legacy field for backwards compat (empty)
      recommendations: [],
    }),
  };
};
