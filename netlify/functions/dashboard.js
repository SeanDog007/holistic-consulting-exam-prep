const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const DOMAIN_WEIGHTS = { 1: 35, 2: 15, 3: 10, 4: 30, 5: 10 };

  // Fetch all question attempts with domain
  const { data: attempts } = await userClient
    .from("question_attempts")
    .select("is_correct, created_at, questions(domain)")
    .eq("user_id", user.id);

  // Domain mastery
  const domainStats = {};
  for (const a of (attempts || [])) {
    const d = a.questions?.domain;
    if (!d) continue;
    if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0 };
    domainStats[d].total++;
    if (a.is_correct) domainStats[d].correct++;
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

  // Study streak
  const dates = new Set((attempts || []).map(a => a.created_at?.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) streak++;
    else if (i > 0) break; // Allow today to be missing
  }

  // Exam count & latest
  const { data: exams } = await userClient
    .from("exam_attempts")
    .select("id, score_pct, is_passed, completed_at, exam_type")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  // Flashcard stats
  const { count: flashcardsDue } = await userClient
    .from("flashcard_reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("next_review_at", new Date().toISOString());

  const { count: flashcardsMastered } = await userClient
    .from("flashcard_reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("interval_days", 21);

  // Recommendations
  const recommendations = [];
  if ((attempts || []).length === 0) {
    recommendations.push({ type: "diagnostic", text: "Take the diagnostic assessment", detail: "25 questions to identify your strengths and weak areas." });
  }
  for (let d = 1; d <= 5; d++) {
    if (domainMastery[d].pct < 60 && domainMastery[d].total > 0) {
      recommendations.push({ type: "practice", text: `Practice Domain ${d} questions`, detail: `Your score is ${domainMastery[d].pct}% — below the 70% pass threshold.`, domain: d });
    }
  }
  if ((flashcardsDue || 0) > 0) {
    recommendations.push({ type: "flashcards", text: `Review ${flashcardsDue} flashcard${flashcardsDue === 1 ? "" : "s"} due today`, detail: "Keep your spaced repetition streak going." });
  }
  if ((exams || []).length === 0 && (attempts || []).length > 50) {
    recommendations.push({ type: "exam", text: "Try a full-length practice exam", detail: "You've practiced enough questions — test yourself under exam conditions." });
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      readinessScore,
      domainMastery,
      questionsAttempted: (attempts || []).length,
      examsTaken: (exams || []).length,
      recentExams: exams || [],
      streak,
      flashcardsDue: flashcardsDue || 0,
      flashcardsMastered: flashcardsMastered || 0,
      recommendations,
    }),
  };
};
