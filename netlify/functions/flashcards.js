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

  if (event.httpMethod === "GET") {
    // Get cards due for review (includes new cards with no review record)
    if (params.due === "true") {
      const limit = params.limit ? parseInt(params.limit) : 20;

      // 1. Cards with review records that are due
      const { data: dueReviews } = await userClient
        .from("flashcard_reviews")
        .select("*, flashcards(*)")
        .eq("user_id", user.id)
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true })
        .limit(limit);

      // 2. New cards — flashcards that have NO review record for this user
      const { data: allCards } = await userClient
        .from("flashcards")
        .select("*")
        .eq("is_active", true)
        .order("domain")
        .order("topic");

      const { data: userReviews } = await userClient
        .from("flashcard_reviews")
        .select("flashcard_id")
        .eq("user_id", user.id);

      const reviewedIds = new Set((userReviews || []).map(r => r.flashcard_id));
      const newCards = (allCards || [])
        .filter(c => !reviewedIds.has(c.id))
        .slice(0, Math.max(0, limit - (dueReviews || []).length))
        .map(c => ({ flashcard_id: c.id, flashcards: c, is_new: true }));

      const combined = [...(dueReviews || []), ...newCards].slice(0, limit);
      return { statusCode: 200, headers: cors, body: JSON.stringify(combined) };
    }

    // Get all flashcards (optionally by domain)
    let query = userClient.from("flashcards").select("*").eq("is_active", true);
    if (params.domain) query = query.eq("domain", parseInt(params.domain));
    query = query.order("domain").order("topic");
    if (params.limit) query = query.limit(parseInt(params.limit));

    const { data, error } = await query;
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data || []) };
  }

  // Admin only: POST/PATCH/DELETE
  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const serviceClient = getServiceClient();

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);
    const { data, error } = await serviceClient.from("flashcards").insert({
      domain: body.domain,
      topic: body.topic,
      front_text: body.front_text,
      back_text: body.back_text,
      front_image_url: body.front_image_url || null,
      card_type: body.card_type || "text",
    }).select().single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "PATCH") {
    const body = JSON.parse(event.body);
    if (!body.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id required" }) };

    const updates = {};
    for (const key of ["domain", "topic", "front_text", "back_text", "front_image_url", "card_type", "is_active"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await serviceClient.from("flashcards").update(updates).eq("id", body.id).select().single();
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  }

  if (event.httpMethod === "DELETE") {
    const body = JSON.parse(event.body);
    if (!body.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id required" }) };
    const { error } = await serviceClient.from("flashcards").delete().eq("id", body.id);
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
