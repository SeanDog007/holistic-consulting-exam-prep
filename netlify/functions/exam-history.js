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

  const params = event.queryStringParameters || {};

  // If specific exam requested, return with answers
  if (params.id) {
    const { data: exam, error } = await userClient
      .from("exam_attempts").select("*").eq("id", params.id).eq("user_id", user.id).single();
    if (error || !exam) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Exam not found" }) };

    const { data: answers } = await userClient
      .from("exam_answers")
      .select("*, questions(domain, topic, question_text, options, correct_answer, explanation, textbook_reference)")
      .eq("exam_attempt_id", exam.id)
      .order("question_number", { ascending: true });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ exam, answers: answers || [] }) };
  }

  // List all exams
  const { data: exams, error } = await userClient
    .from("exam_attempts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: cors, body: JSON.stringify(exams || []) };
};
