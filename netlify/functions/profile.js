const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const serviceClient = getServiceClient();

  if (event.httpMethod === "GET") {
    const { data, error } = await serviceClient
      .from("student_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // PGRST116 = no rows — profile doesn't exist yet (new user)
    if (error && error.code !== "PGRST116") {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(data || null) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body);
    const updates = {};
    for (const key of ["display_name", "target_exam_date"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await serviceClient
      .from("student_profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
