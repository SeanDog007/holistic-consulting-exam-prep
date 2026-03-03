const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

// SM-2 algorithm implementation
function sm2(quality, prevEase, prevInterval, prevReps) {
  // quality: 1-5 (1=blackout, 3=correct with difficulty, 5=perfect recall)
  let ease = prevEase;
  let interval = prevInterval;
  let reps = prevReps;

  if (quality >= 3) {
    // Correct response
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(prevInterval * ease);
    reps++;
  } else {
    // Incorrect — reset
    reps = 0;
    interval = 1;
  }

  // Update ease factor (min 1.3)
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return { ease: Math.round(ease * 100) / 100, interval, reps };
}

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { flashcard_id, quality } = JSON.parse(event.body);
  if (!flashcard_id || !quality || quality < 1 || quality > 5) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "flashcard_id and quality (1-5) required" }) };
  }

  // Get existing review or create new
  const { data: existing } = await userClient
    .from("flashcard_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("flashcard_id", flashcard_id)
    .single();

  const prevEase = existing?.ease_factor || 2.5;
  const prevInterval = existing?.interval_days || 0;
  const prevReps = existing?.repetition_count || 0;

  const { ease, interval, reps } = sm2(quality, prevEase, prevInterval, prevReps);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  if (existing) {
    const { data, error } = await userClient.from("flashcard_reviews").update({
      quality,
      ease_factor: ease,
      interval_days: interval,
      repetition_count: reps,
      next_review_at: nextReview.toISOString(),
      reviewed_at: new Date().toISOString(),
    }).eq("id", existing.id).select().single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  } else {
    const { data, error } = await userClient.from("flashcard_reviews").insert({
      user_id: user.id,
      flashcard_id,
      quality,
      ease_factor: ease,
      interval_days: interval,
      repetition_count: reps,
      next_review_at: nextReview.toISOString(),
    }).select().single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
  }
};
