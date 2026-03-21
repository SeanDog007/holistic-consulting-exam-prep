const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const params = event.queryStringParameters || {};

  // GET — fetch questions
  if (event.httpMethod === "GET") {
    let query = userClient.from("questions").select("*");

    if (params.domain) query = query.eq("domain", parseInt(params.domain, 10));
    if (params.topic) query = query.eq("topic", params.topic);
    if (params.difficulty) query = query.eq("difficulty", parseInt(params.difficulty, 10));
    if (params.type) query = query.eq("question_type", params.type);
    if (params.active !== "false") query = query.eq("is_active", true);
    if (params.id) query = query.eq("id", params.id);

    query = query.order("created_at", { ascending: false });
    if (params.limit) query = query.limit(parseInt(params.limit, 10));

    const { data, error } = await query;
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  }

  // POST/PATCH/DELETE — admin only
  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const serviceClient = getServiceClient();

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);
    const { data, error } = await serviceClient.from("questions").insert({
      domain: body.domain,
      topic: body.topic,
      subtopic: body.subtopic || null,
      difficulty: body.difficulty || 2,
      cognitive_level: body.cognitive_level || "recall",
      question_type: body.question_type || "mc",
      question_text: body.question_text,
      options: body.options || null,
      correct_answer: body.correct_answer,
      explanation: body.explanation || null,
      textbook_reference: body.textbook_reference || null,
    }).select().single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body);
    if (!body.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id required" }) };

    const updates = {};
    for (const key of ["domain", "topic", "subtopic", "difficulty", "cognitive_level", "question_type", "question_text", "options", "correct_answer", "explanation", "textbook_reference", "is_active"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await serviceClient.from("questions").update(updates).eq("id", body.id).select().single();
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "DELETE") {
    const body = JSON.parse(event.body);
    if (!body.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id required" }) };

    const { error } = await serviceClient.from("questions").delete().eq("id", body.id);
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
