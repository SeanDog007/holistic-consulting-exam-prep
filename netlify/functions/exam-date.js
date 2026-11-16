/**
 * exam-date — Get/set exam date, email reminders, and the study-material track.
 *
 * GET  → exam date, reminder flag, and the resolved track.
 * POST → { exam_date: "YYYY-MM-DD"|null, email_reminders_enabled: bool, exam_track: "2026"|"2027"|null }
 *
 * The track follows target_exam_date unless exam_track_override is set.
 * On or after 2027-01-01 is the 2027 materials. Earlier is the 2026 materials.
 * After 2026-12-31, a student without an existing pre-2027 exam date cannot choose 2026.
 */
const { getServiceClient, getCorsHeaders, extractToken, getUserClient } = require("./utils/supabase");
const {
  loadStudentTrack,
  resolveStudentTrack,
  validateTrackUpdate,
  publicTrackPayload,
  isMissingExamTrackColumn,
} = require("./utils/exam-track");

function trackResponse(row, trackInfo) {
  return {
    exam_date: row?.target_exam_date || trackInfo.date || null,
    email_reminders_enabled: row?.email_reminders_enabled ?? true,
    ...publicTrackPayload(trackInfo),
  };
}

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
      .select("target_exam_date, email_reminders_enabled, exam_track_override")
      .eq("id", user.id)
      .maybeSingle();

    let row = data;
    let schemaPending = false;
    if (error && isMissingExamTrackColumn(error)) {
      schemaPending = true;
      const fallback = await sc
        .from("student_profiles")
        .select("target_exam_date, email_reminders_enabled")
        .eq("id", user.id)
        .maybeSingle();
      if (fallback.error && fallback.error.code !== "PGRST116") {
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: fallback.error.message }) };
      }
      row = fallback.data;
    } else if (error && error.code !== "PGRST116") {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }

    const trackInfo = { ...resolveStudentTrack(row || {}), schemaPending };
    return { statusCode: 200, headers: cors, body: JSON.stringify(trackResponse(row, trackInfo)) };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const trackInfo = await loadStudentTrack(sc, user.id);
    const updates = {};

    if (body.exam_date !== undefined) updates.target_exam_date = body.exam_date || null;
    if (body.email_reminders_enabled !== undefined) updates.email_reminders_enabled = !!body.email_reminders_enabled;
    if (body.exam_track !== undefined) {
      if (trackInfo.schemaPending) {
        return {
          statusCode: 409,
          headers: cors,
          body: JSON.stringify({
            error: "Switching study materials is waiting on migration 003-exam-track.sql. Set your exam date for now. The materials follow that date after the migration.",
            schema_pending: true,
          }),
        };
      }
      updates.exam_track_override = body.exam_track || null;
    }

    if (Object.keys(updates).length === 0) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "No updates provided" }) };
    }

    const check = validateTrackUpdate(
      { target_exam_date: trackInfo.date, exam_track_override: trackInfo.override },
      {
        ...(body.exam_date !== undefined ? { exam_date: body.exam_date } : {}),
        ...(body.exam_track !== undefined ? { exam_track: body.exam_track || null } : {}),
      }
    );
    if (!check.ok) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: check.error }) };

    const selectCols = trackInfo.schemaPending
      ? "target_exam_date, email_reminders_enabled"
      : "target_exam_date, email_reminders_enabled, exam_track_override";

    const { data, error } = await sc
      .from("student_profiles")
      .update(updates)
      .eq("id", user.id)
      .select(selectCols)
      .single();

    if (error && error.code === "PGRST116") {
      const { data: inserted, error: insertErr } = await sc
        .from("student_profiles")
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.email.split("@")[0],
          ...updates,
        })
        .select(selectCols)
        .single();
      if (insertErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: insertErr.message }) };
      const insertedTrack = { ...resolveStudentTrack(inserted), schemaPending: false };
      return { statusCode: 200, headers: cors, body: JSON.stringify(trackResponse(inserted, insertedTrack)) };
    }

    if (error && isMissingExamTrackColumn(error)) {
      return {
        statusCode: 409,
        headers: cors,
        body: JSON.stringify({
          error: "Switching study materials is waiting on migration 003-exam-track.sql.",
          schema_pending: true,
        }),
      };
    }
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

    const nextTrack = { ...resolveStudentTrack(data), schemaPending: false };
    return { statusCode: 200, headers: cors, body: JSON.stringify(trackResponse(data, nextTrack)) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
