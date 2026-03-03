const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // Verify admin
  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const serviceClient = getServiceClient();

  if (event.httpMethod === "GET") {
    // Get all students with their stats
    const { data: students, error } = await serviceClient
      .from("student_profiles")
      .select("*")
      .order("enrolled_at", { ascending: false });

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

    // Enrich with stats
    const enriched = [];
    for (const s of (students || [])) {
      const { count: questionCount } = await serviceClient
        .from("question_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", s.id);

      const { data: latestExam } = await serviceClient
        .from("exam_attempts")
        .select("score_pct, completed_at")
        .eq("user_id", s.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1);

      enriched.push({
        ...s,
        questions_practiced: questionCount || 0,
        latest_exam_score: latestExam?.[0]?.score_pct || null,
        latest_exam_date: latestExam?.[0]?.completed_at || null,
      });
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(enriched) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body);
    if (!body.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id required" }) };

    const updates = {};
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.is_admin !== undefined) updates.is_admin = body.is_admin;
    if (body.target_exam_date !== undefined) updates.target_exam_date = body.target_exam_date;

    const { data, error } = await serviceClient
      .from("student_profiles").update(updates).eq("id", body.id).select().single();
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
