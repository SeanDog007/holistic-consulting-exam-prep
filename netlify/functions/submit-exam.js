const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");
const { batchUpdateFocusAreas } = require("./utils/focus-areas");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { exam_id, answers } = JSON.parse(event.body);
  if (!exam_id || !answers) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "exam_id and answers required" }) };

  // Verify exam belongs to user
  const { data: exam, error: examErr } = await userClient
    .from("exam_attempts").select("*").eq("id", exam_id).eq("user_id", user.id).single();
  if (examErr || !exam) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Exam not found" }) };

  // Get correct answers for all questions
  const questionIds = answers.map(a => a.question_id);
  const { data: questions } = await userClient
    .from("questions").select("id, domain, correct_answer").in("id", questionIds);
  const questionMap = {};
  for (const q of questions || []) questionMap[q.id] = q;

  // Score each answer
  let correctCount = 0;
  const domainScores = {};

  for (const answer of answers) {
    const q = questionMap[answer.question_id];
    if (!q) continue;

    const isCorrect = String(answer.selected_answer).toLowerCase() === String(q.correct_answer).toLowerCase();
    if (isCorrect) correctCount++;

    // Track domain scores
    if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 };
    domainScores[q.domain].total++;
    if (isCorrect) domainScores[q.domain].correct++;

    // Update exam_answers row
    await userClient.from("exam_answers")
      .update({
        selected_answer: answer.selected_answer,
        is_correct: isCorrect,
        time_taken_seconds: answer.time_taken_seconds || null,
        flagged_for_review: answer.flagged || false,
      })
      .eq("exam_attempt_id", exam_id)
      .eq("question_id", answer.question_id);

    // Record as question_attempt too (for overall stats)
    await userClient.from("question_attempts").insert({
      user_id: user.id,
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
      is_correct: isCorrect,
      time_taken_seconds: answer.time_taken_seconds || null,
    });
  }

  // Update focus areas for wrong answers (batched)
  const wrongQuestionIds = [];
  for (const answer of answers) {
    const q = questionMap[answer.question_id];
    if (!q) continue;
    const isCorrect = String(answer.selected_answer).toLowerCase() === String(q.correct_answer).toLowerCase();
    if (!isCorrect) wrongQuestionIds.push(answer.question_id);
  }
  if (wrongQuestionIds.length > 0) {
    try { await batchUpdateFocusAreas(userClient, user.id, wrongQuestionIds); } catch (e) { /* logged internally */ }
  }

  // Calculate percentages
  const scorePct = answers.length > 0 ? Math.round((correctCount / answers.length) * 10000) / 100 : 0;
  const domainPcts = {};
  for (const [d, s] of Object.entries(domainScores)) {
    domainPcts[d] = Math.round((s.correct / s.total) * 10000) / 100;
  }

  // Update exam attempt
  const { data: updated, error: updateErr } = await userClient.from("exam_attempts").update({
    correct_count: correctCount,
    score_pct: scorePct,
    domain_scores: domainPcts,
    is_passed: scorePct >= 70,
    completed_at: new Date().toISOString(),
  }).eq("id", exam_id).select().single();

  if (updateErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: updateErr.message }) };

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      score_pct: scorePct,
      correct_count: correctCount,
      total_questions: answers.length,
      is_passed: scorePct >= 70,
      domain_scores: domainPcts,
      domain_details: domainScores,
    }),
  };
};
