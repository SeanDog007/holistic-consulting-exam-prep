const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");
const {
  DOMAIN_DISTRIBUTION,
  loadStudentTrack,
  fetchAllTracked,
  fullExamPlan,
  fullExamShortfallMessage,
  publicTrackPayload,
} = require("./utils/exam-track");

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
  const trackInfo = await loadStudentTrack(userClient, user.id);

  async function questionsInDomain(domain) {
    const res = await fetchAllTracked(
      () => userClient.from("questions").select("id, domain").eq("is_active", true).eq("domain", domain),
      trackInfo
    );
    if (res.error) {
      const wrapped = new Error(res.error.message);
      wrapped.statusCode = 500;
      throw wrapped;
    }
    return res.data || [];
  }

  let examQuestions = [];
  let totalQuestions = 0;

  try {
    if (domain_filter) {
      const questions = await questionsInDomain(domain_filter);
      const shuffled = questions.sort(() => Math.random() - 0.5);
      examQuestions = shuffled.slice(0, Math.min(50, shuffled.length));
      totalQuestions = examQuestions.length;
    } else {
      const counts = {};
      const pools = {};
      for (const domain of Object.keys(DOMAIN_DISTRIBUTION)) {
        pools[domain] = await questionsInDomain(parseInt(domain, 10));
        counts[domain] = pools[domain].length;
      }
      const plan = fullExamPlan(counts);
      if (!plan.ok) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({
            error: fullExamShortfallMessage(plan),
            shortfall: plan.shortfall,
            ...publicTrackPayload(trackInfo),
          }),
        };
      }
      for (const [domain, count] of Object.entries(DOMAIN_DISTRIBUTION)) {
        const shuffled = pools[domain].sort(() => Math.random() - 0.5);
        examQuestions.push(...shuffled.slice(0, count));
      }
      examQuestions.sort(() => Math.random() - 0.5);
      totalQuestions = examQuestions.length;
    }
  } catch (err) {
    return { statusCode: err.statusCode || 500, headers: cors, body: JSON.stringify({ error: err.message }) };
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
