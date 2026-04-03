const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");
const { updateFocusArea } = require("./utils/focus-areas");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { question_id, selected_answer, time_taken_seconds } = JSON.parse(event.body);
  if (!question_id || !selected_answer) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "question_id and selected_answer required" }) };
  }

  // Get the question to check answer
  const { data: question, error: qErr } = await userClient.from("questions").select("correct_answer, explanation, textbook_reference").eq("id", question_id).single();
  if (qErr || !question) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Question not found" }) };

  // correct_answer may be a 0-based index (number) or a letter; normalize both to compare
  const _idxToLetter = ['a', 'b', 'c', 'd', 'e', 'f'];
  const _normAnswer = (v) => { const n = Number(v); return (!isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 5) ? _idxToLetter[n] : String(v).toLowerCase(); };
  const is_correct = _normAnswer(selected_answer) === _normAnswer(question.correct_answer);

  // Record attempt
  const { error: insertErr } = await userClient.from("question_attempts").insert({
    user_id: user.id,
    question_id,
    selected_answer,
    is_correct,
    time_taken_seconds: time_taken_seconds || null,
  });

  if (insertErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: insertErr.message }) };

  // Update focus areas if wrong (non-blocking)
  if (!is_correct) {
    try { await updateFocusArea(userClient, user.id, question_id); } catch (e) { /* logged internally */ }
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      is_correct,
      correct_answer: _normAnswer(question.correct_answer),
      explanation: question.explanation,
      textbook_reference: question.textbook_reference,
    }),
  };
};
