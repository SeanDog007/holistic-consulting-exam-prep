const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const { questions, format } = JSON.parse(event.body);
  if (!questions || !Array.isArray(questions)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "questions array required" }) };
  }

  const serviceClient = getServiceClient();
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const q of questions) {
    // Validate required fields
    if (!q.domain || !q.topic || !q.question_text || !q.correct_answer) {
      skipped++;
      errors.push(`Skipped: missing required fields — "${(q.question_text || "").slice(0, 50)}..."`);
      continue;
    }

    const { error } = await serviceClient.from("questions").insert({
      domain: parseInt(q.domain),
      topic: q.topic,
      subtopic: q.subtopic || null,
      difficulty: parseInt(q.difficulty) || 2,
      cognitive_level: q.cognitive_level || "recall",
      question_type: q.question_type || "mc",
      question_text: q.question_text,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      textbook_reference: q.textbook_reference || null,
    });

    if (error) {
      skipped++;
      errors.push(`Error: ${error.message} — "${q.question_text.slice(0, 50)}..."`);
    } else {
      imported++;
    }
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      imported,
      skipped,
      total: questions.length,
      errors: errors.slice(0, 10), // Limit error messages
    }),
  };
};
