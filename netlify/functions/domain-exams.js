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

  const params = new URL(event.rawUrl || `http://x${event.path}?${new URLSearchParams(event.queryStringParameters || {})}`).searchParams;
  const examName = params.get("exam");

  // ── List all available domain exams ──
  if (!examName) {
    const { data: questions, error } = await userClient
      .from("questions")
      .select("domain, subtopic")
      .eq("is_active", true)
      .not("subtopic", "is", null)
      .like("subtopic", "Domain %Exam%");

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

    // Group by subtopic, count per exam
    const examMap = {};
    for (const q of questions) {
      const key = q.subtopic;
      if (!examMap[key]) examMap[key] = { name: key, domain: q.domain, questionCount: 0 };
      examMap[key].questionCount++;
    }

    // Fetch user's best scores for each domain exam
    const { data: attempts } = await userClient
      .from("exam_attempts")
      .select("domain_filter, score_pct, exam_type")
      .eq("user_id", user.id)
      .eq("exam_type", "domain")
      .not("score_pct", "is", null);

    // Group by domain to get best scores (we'll match by exam name via notes later)
    // For now, group exams by domain
    const domains = {};
    for (const exam of Object.values(examMap)) {
      if (!domains[exam.domain]) domains[exam.domain] = [];
      domains[exam.domain].push(exam);
    }

    // Sort exams within each domain
    for (const d of Object.keys(domains)) {
      domains[d].sort((a, b) => {
        const numA = parseInt(a.name.match(/Exam (\d+)/)?.[1] || "0");
        const numB = parseInt(b.name.match(/Exam (\d+)/)?.[1] || "0");
        return numA - numB;
      });
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ domains }),
    };
  }

  // ── Start a specific fixed exam ──
  const { data: questions, error } = await userClient
    .from("questions")
    .select("id, domain, topic, difficulty, cognitive_level, question_type, question_text, options, correct_answer, explanation, textbook_reference")
    .eq("is_active", true)
    .eq("subtopic", examName)
    .order("id", { ascending: true }); // Fixed order — same every time

  if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  if (!questions || questions.length === 0) {
    return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Exam not found" }) };
  }

  const domain = questions[0].domain;

  // Create exam attempt
  const { data: exam, error: examErr } = await userClient.from("exam_attempts").insert({
    user_id: user.id,
    exam_type: "domain",
    domain_filter: domain,
    total_questions: questions.length,
    time_limit_minutes: null, // Untimed for domain exams
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
      domain,
      total_questions: questions.length,
      time_limit_minutes: null,
      questions,
    }),
  };
};
