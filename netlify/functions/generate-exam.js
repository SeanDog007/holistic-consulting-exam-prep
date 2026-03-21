const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

const DOMAIN_DISTRIBUTION = { 1: 53, 2: 23, 3: 15, 4: 45, 5: 15 }; // total = 151

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { timed, domain_filter } = JSON.parse(event.body || "{}");

  // If domain filter, make a domain-specific exam
  let examQuestions = [];
  let totalQuestions = 0;

  if (domain_filter) {
    const { data: questions, error } = await userClient
      .from("questions").select("id, domain").eq("is_active", true).eq("domain", domain_filter);
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

    const shuffled = questions.sort(() => Math.random() - 0.5);
    examQuestions = shuffled.slice(0, Math.min(50, shuffled.length));
    totalQuestions = examQuestions.length;
  } else {
    // Full exam weighted by domain — use available questions up to target
    const targetTotal = Object.values(DOMAIN_DISTRIBUTION).reduce((a, b) => a + b, 0);
    for (const [domain, count] of Object.entries(DOMAIN_DISTRIBUTION)) {
      const { data: questions, error } = await userClient
        .from("questions").select("id, domain").eq("is_active", true).eq("domain", parseInt(domain));
      if (error) continue;

      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));
      examQuestions.push(...selected);
    }
    examQuestions.sort(() => Math.random() - 0.5);
    totalQuestions = examQuestions.length;
  }

  if (totalQuestions === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Not enough questions in the bank to generate an exam." }) };
  }

  // Create exam attempt record
  const { data: exam, error: examErr } = await userClient.from("exam_attempts").insert({
    user_id: user.id,
    exam_type: domain_filter ? "domain" : "full",
    domain_filter: domain_filter || null,
    total_questions: totalQuestions,
    time_limit_minutes: timed ? (domain_filter ? 60 : 180) : null,
  }).select().single();

  if (examErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: examErr.message }) };

  // Create exam answer slots
  const answerSlots = examQuestions.map((q, i) => ({
    exam_attempt_id: exam.id,
    question_id: q.id,
    question_number: i + 1,
  }));

  const { error: slotErr } = await userClient.from("exam_answers").insert(answerSlots);
  if (slotErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: slotErr.message }) };

  // Fetch full question data for the frontend
  const questionIds = examQuestions.map(q => q.id);
  const { data: fullQuestions } = await userClient
    .from("questions")
    .select("id, domain, topic, difficulty, cognitive_level, question_type, question_text, options, correct_answer, explanation, textbook_reference")
    .in("id", questionIds);

  // Maintain the shuffled order
  const questionMap = {};
  for (const q of fullQuestions || []) questionMap[q.id] = q;
  const orderedQuestions = examQuestions.map(q => questionMap[q.id]).filter(Boolean);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      exam_id: exam.id,
      total_questions: totalQuestions,
      time_limit_minutes: exam.time_limit_minutes,
      questions: orderedQuestions,
    }),
  };
};
