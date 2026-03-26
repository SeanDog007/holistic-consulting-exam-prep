const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // ── GET: fetch all active flashcards + user's review state ──
  if (event.httpMethod === "GET") {
    try {
      const domain = event.queryStringParameters?.domain;

      // Get flashcards
      let query = userClient.from("flashcards").select("*").eq("is_active", true).order("domain").order("topic");
      if (domain) query = query.eq("domain", parseInt(domain));
      const { data: cards, error: cardsErr } = await query;
      if (cardsErr) throw cardsErr;

      // Get user's review state for all cards
      const { data: reviews, error: revErr } = await userClient
        .from("flashcard_reviews")
        .select("flashcard_id, quality, ease_factor, interval_days, repetition_count, next_review_at, reviewed_at")
        .eq("user_id", user.id);
      if (revErr) throw revErr;

      const reviewMap = {};
      (reviews || []).forEach(r => { reviewMap[r.flashcard_id] = r; });

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ cards: cards || [], reviews: reviewMap }),
      };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── POST: admin create flashcard ──
  if (event.httpMethod === "POST") {
    try {
      // Check admin
      const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin only" }) };

      const body = JSON.parse(event.body);
      const sc = getServiceClient();
      const { data, error } = await sc.from("flashcards").insert({
        domain: body.domain,
        topic: body.topic || "",
        front_text: body.front_text,
        back_text: body.back_text,
        card_type: body.card_type || "term",
        is_active: true,
      }).select().single();

      if (error) throw error;
      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
