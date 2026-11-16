const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");
const {
  NANP_DOMAIN_NAMES,
  FIXED_EXAM_RE,
  loadStudentTrack,
  fetchAllTracked,
  publicTrackPayload,
} = require("./utils/exam-track");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const params = event.queryStringParameters || {};
  const examName = params.exam;
  const trackInfo = await loadStudentTrack(userClient, user.id);

  // ── Start a specific fixed exam ──────────────────────────────────────
  if (examName) {
    const match = examName.match(FIXED_EXAM_RE);
    if (!match) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid exam name. Expected format: Domain N Exam N" }) };
    }
    const domainNumber = parseInt(match[2], 10);

    const { data: questions, error } = await fetchAllTracked(
      () => userClient
        .from("questions")
        .select("id, domain, topic, difficulty, cognitive_level, question_type, question_text, options, correct_answer, explanation, textbook_reference")
        .eq("is_active", true)
        .eq("subtopic", examName)
        .order("id", { ascending: true }),
      trackInfo
    );

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    if (!questions || questions.length === 0) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Exam not found" }) };
    }

    // Create exam attempt record
    const { data: exam, error: examErr } = await userClient.from("exam_attempts").insert({
      user_id: user.id,
      exam_type: "domain",
      domain_filter: domainNumber,
      total_questions: questions.length,
      time_limit_minutes: null,
    }).select().single();

    if (examErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: examErr.message }) };

    // Create exam answer slots
    const answerSlots = questions.map((q, i) => ({
      exam_attempt_id: exam.id,
      question_id: q.id,
      question_number: i + 1,
    }));

    const { error: slotErr } = await userClient.from("exam_answers").insert(answerSlots);
    if (slotErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: slotErr.message }) };

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        exam_id: exam.id,
        exam_name: examName,
        domain: domainNumber,
        domain_name: NANP_DOMAIN_NAMES[domainNumber] || `Domain ${domainNumber}`,
        ...publicTrackPayload(trackInfo),
        total_questions: questions.length,
        time_limit_minutes: null,
        questions,
      }),
    };
  }

  // ── List all available fixed exams ───────────────────────────────────

  // Get all active questions whose subtopic matches "Domain N Exam N"
  const { data: questionRows, error: qErr } = await fetchAllTracked(
    () => userClient
      .from("questions")
      .select("domain, subtopic")
      .eq("is_active", true)
      .not("subtopic", "is", null)
      .like("subtopic", "%Domain % Exam %"),
    trackInfo
  );

  if (qErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: qErr.message }) };

  // Group by subtopic, count questions per exam
  const examMap = {};
  for (const q of questionRows || []) {
    const key = q.subtopic;
    if (!key || !FIXED_EXAM_RE.test(key)) continue;
    if (!examMap[key]) examMap[key] = { name: key, domain: q.domain, questionCount: 0 };
    examMap[key].questionCount++;
  }

  // Fetch user's completed domain exam attempts to compute best scores & attempt counts.
  // We join through exam_answers -> questions to identify which specific fixed exam an attempt belongs to.
  const { data: attempts, error: attErr } = await userClient
    .from("exam_attempts")
    .select("id, domain_filter, score_pct")
    .eq("user_id", user.id)
    .eq("exam_type", "domain")
    .not("score_pct", "is", null);

  if (attErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: attErr.message }) };

  // For each completed attempt, look up the subtopic from its first answer to identify the exam
  const examStats = {}; // examName -> { bestScore, attempts }
  const attemptIds = (attempts || []).map(a => a.id);

  if (attemptIds.length > 0) {
    // Fetch first exam_answer per attempt with the question's subtopic
    const chunkSize = 200;
    const answerRows = [];
    for (let i = 0; i < attemptIds.length; i += chunkSize) {
      const chunk = attemptIds.slice(i, i + chunkSize);
      const { data } = await userClient
        .from("exam_answers")
        .select("exam_attempt_id, question:questions(subtopic)")
        .in("exam_attempt_id", chunk)
        .order("question_number", { ascending: true });
      if (data) answerRows.push(...data);
    }

    // Map attempt_id -> subtopic (from first answer row seen per attempt)
    const attemptToExam = {};
    for (const row of answerRows) {
      if (!attemptToExam[row.exam_attempt_id] && row.question && row.question.subtopic) {
        attemptToExam[row.exam_attempt_id] = row.question.subtopic;
      }
    }

    for (const attempt of attempts || []) {
      const name = attemptToExam[attempt.id];
      if (!name || !FIXED_EXAM_RE.test(name)) continue;
      if (!examStats[name]) examStats[name] = { bestScore: null, attempts: 0 };
      examStats[name].attempts += 1;
      if (attempt.score_pct != null) {
        if (examStats[name].bestScore == null || attempt.score_pct > examStats[name].bestScore) {
          examStats[name].bestScore = attempt.score_pct;
        }
      }
    }
  }

  // Build response grouped by domain
  const domainGroups = {};
  for (const exam of Object.values(examMap)) {
    if (!domainGroups[exam.domain]) domainGroups[exam.domain] = [];
    const stats = examStats[exam.name] || { bestScore: null, attempts: 0 };
    domainGroups[exam.domain].push({
      name: exam.name,
      questionCount: exam.questionCount,
      bestScore: stats.bestScore,
      attempts: stats.attempts,
    });
  }

  // Sort exams within each domain numerically
  for (const exams of Object.values(domainGroups)) {
    exams.sort((a, b) => {
      const numA = parseInt(a.name.match(/Exam (\d+)/)?.[1] || "0");
      const numB = parseInt(b.name.match(/Exam (\d+)/)?.[1] || "0");
      return numA - numB;
    });
  }

  const domains = Object.keys(domainGroups)
    .map(Number)
    .sort((a, b) => a - b)
    .map(domainNum => ({
      domain: domainNum,
      name: NANP_DOMAIN_NAMES[domainNum] || `Domain ${domainNum}`,
      exams: domainGroups[domainNum],
    }));

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ domains, ...publicTrackPayload(trackInfo) }),
  };
};
