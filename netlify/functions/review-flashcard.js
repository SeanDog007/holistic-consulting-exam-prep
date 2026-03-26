const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // ── POST: record a flashcard review ──
  if (event.httpMethod === "POST") {
    try {
      const { flashcard_id, quality } = JSON.parse(event.body);
      // quality: 1 = missed, 5 = got it

      if (!flashcard_id || !quality) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "flashcard_id and quality required" }) };
      }

      const sc = getServiceClient();

      // Get existing review record
      const { data: existing } = await sc
        .from("flashcard_reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("flashcard_id", flashcard_id)
        .single();

      let easeFactor = existing?.ease_factor || 2.5;
      let interval = existing?.interval_days || 1;
      let reps = existing?.repetition_count || 0;

      // SM-2 inspired algorithm (simplified for Got it / Missed it)
      if (quality >= 4) {
        // Got it
        reps += 1;
        if (reps === 1) interval = 1;
        else if (reps === 2) interval = 3;
        else interval = Math.round(interval * easeFactor);
        // Increase ease slightly
        easeFactor = Math.max(1.3, easeFactor + 0.1);
      } else {
        // Missed it — reset
        reps = 0;
        interval = 1;
        // Decrease ease
        easeFactor = Math.max(1.3, easeFactor - 0.2);
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      const reviewData = {
        user_id: user.id,
        flashcard_id,
        quality,
        ease_factor: easeFactor,
        interval_days: interval,
        repetition_count: reps,
        next_review_at: nextReview.toISOString(),
        reviewed_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await sc
          .from("flashcard_reviews")
          .update(reviewData)
          .eq("user_id", user.id)
          .eq("flashcard_id", flashcard_id);
        if (error) throw error;
      } else {
        const { error } = await sc
          .from("flashcard_reviews")
          .insert(reviewData);
        if (error) throw error;
      }

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          interval_days: interval,
          next_review_at: nextReview.toISOString(),
          repetition_count: reps,
          ease_factor: easeFactor,
        }),
      };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
