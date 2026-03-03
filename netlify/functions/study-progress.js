const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const params = event.queryStringParameters || {};

  if (event.httpMethod === "GET") {
    // Get study guide sections with user's progress
    let sectionsQuery = userClient.from("study_guide_sections").select("*").order("domain").order("section_order");
    if (params.domain) sectionsQuery = sectionsQuery.eq("domain", parseInt(params.domain));

    const { data: sections, error: sectErr } = await sectionsQuery;
    if (sectErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: sectErr.message }) };

    const { data: progress } = await userClient
      .from("study_progress")
      .select("*")
      .eq("user_id", user.id);

    const progressMap = {};
    for (const p of (progress || [])) progressMap[p.section_id] = p;

    const result = (sections || []).map(s => ({
      ...s,
      progress: progressMap[s.id] || null,
    }));

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);
    if (!body.section_id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "section_id required" }) };

    // Upsert progress
    const { data: existing } = await userClient
      .from("study_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("section_id", body.section_id)
      .single();

    if (existing) {
      const updates = {};
      if (body.is_completed !== undefined) {
        updates.is_completed = body.is_completed;
        if (body.is_completed) updates.completed_at = new Date().toISOString();
      }
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.highlights !== undefined) updates.highlights = body.highlights;

      const { data, error } = await userClient.from("study_progress").update(updates).eq("id", existing.id).select().single();
      if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    } else {
      const { data, error } = await userClient.from("study_progress").insert({
        user_id: user.id,
        section_id: body.section_id,
        is_completed: body.is_completed || false,
        completed_at: body.is_completed ? new Date().toISOString() : null,
        notes: body.notes || null,
        highlights: body.highlights || null,
      }).select().single();

      if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    }
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
