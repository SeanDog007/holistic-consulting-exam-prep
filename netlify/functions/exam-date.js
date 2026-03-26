/**
 * exam-date — Get/set exam date and email reminder preferences.
 *
 * GET  → returns { exam_date, email_reminders_enabled }
 * POST → body: { exam_date: "YYYY-MM-DD", email_reminders_enabled: bool }
 */
const { getServiceClient, getCorsHeaders, extractToken, getUserClient } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const sc = getServiceClient();

  if (event.httpMethod === "GET") {
    const { data, error } = await sc
      .from("student_profiles")
      .select("target_exam_date, email_reminders_enabled")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        exam_date: data?.target_exam_date || null,
        email_reminders_enabled: data?.email_reminders_enabled ?? true,
      }),
    };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const updates = {};

    if (body.exam_date !== undefined) {
      // Validate date format
      if (body.exam_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." }) };
      }
      updates.target_exam_date = body.exam_date || null;
    }

    if (body.email_reminders_enabled !== undefined) {
      updates.email_reminders_enabled = !!body.email_reminders_enabled;
    }

    if (Object.keys(updates).length === 0) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "No updates provided" }) };
    }

    // Upsert: try update first, create if doesn't exist
    const { data, error } = await sc
      .from("student_profiles")
      .update(updates)
      .eq("id", user.id)
      .select("target_exam_date, email_reminders_enabled")
      .single();

    if (error) {
      // Profile doesn't exist — try insert
      if (error.code === "PGRST116") {
        const { data: inserted, error: insertErr } = await sc
          .from("student_profiles")
          .insert({
            id: user.id,
            email: user.email,
            display_name: user.email.split("@")[0],
            ...updates,
          })
          .select("target_exam_date, email_reminders_enabled")
          .single();

        if (insertErr) {
          return { statusCode: 500, headers: cors, body: JSON.stringify({ error: insertErr.message }) };
        }
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({
            exam_date: inserted.target_exam_date,
            email_reminders_enabled: inserted.email_reminders_enabled,
          }),
        };
      }
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        exam_date: data.target_exam_date,
        email_reminders_enabled: data.email_reminders_enabled,
      }),
    };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
