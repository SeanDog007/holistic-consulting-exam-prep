const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");
const { updateFocusArea } = require("./utils/focus-areas");

// SM-2 algorithm implementation
function sm2(quality, prevEase, prevInterval, prevReps) {
  let ease = prevEase;
  let interval = prevInterval;
  let reps = prevReps;

  if (quality >= 3) {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(prevInterval * ease);
    reps++;
  } else {
    reps = 0;
    interval = 1;
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return { ease: Math.round(ease * 100) / 100, interval, reps };
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // ── GET /practice?domain=N&limit=20 ─────────────────────────────────
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    const limit = params.limit ? parseInt(params.limit, 10) : 20;
    const domainFilter = params.domain ? parseInt(params.domain, 10) : null;

    // 1. Get due reviews (next_review_at <= now)
    let dueQuery = userClient
      .from("question_reviews")
      .select("*, questions(id, domain, topic, question_text, options, difficulty)")
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString())
      .order("next_review_at", { ascending: true });

    const { data: dueReviews, error: dueErr } = await dueQuery;
    if (dueErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: dueErr.message }) };

    // Filter by domain (question_reviews doesn't have domain column)
    const filteredDue = domainFilter
      ? (dueReviews || []).filter(r => r.questions && r.questions.domain === domainFilter)
      : (dueReviews || []);

    const dueSlice = filteredDue.slice(0, limit);
    const dueCount = dueSlice.length;

    // 2. Fill remaining slots with NEW questions (no review record for this user)
    const remaining = limit - dueCount;
    let newQuestions = [];

    if (remaining > 0) {
      // Get all question IDs this user has already reviewed
      const { data: userReviews } = await userClient
        .from("question_reviews")
        .select("question_id")
        .eq("user_id", user.id);

      const reviewedIds = new Set((userReviews || []).map(r => r.question_id));

      // Get candidate new questions
      let newQuery = userClient
        .from("questions")
        .select("id, domain, topic, question_text, options, difficulty")
        .eq("is_active", true);
      if (domainFilter) newQuery = newQuery.eq("domain", domainFilter);

      const { data: candidates, error: newErr } = await newQuery;
      if (newErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: newErr.message }) };

      const unreviewed = (candidates || []).filter(q => !reviewedIds.has(q.id));
      newQuestions = shuffle(unreviewed).slice(0, remaining);
    }

    // 3. Build response — strip correct_answer (client validates via POST)
    const questions = [
      ...dueSlice.map(r => r.questions).filter(Boolean),
      ...newQuestions,
    ];

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        questions,
        dueCount,
        newCount: newQuestions.length,
      }),
    };
  }

  // ── POST /practice ──────────────────────────────────────────────────
  if (event.httpMethod === "POST") {
    const { question_id, selected_answer } = JSON.parse(event.body);
    if (!question_id || selected_answer === undefined || selected_answer === null) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "question_id and selected_answer required" }) };
    }

    // 1. Look up question (need correct_answer + option text for feedback)
    const { data: question, error: qErr } = await userClient
      .from("questions")
      .select("domain, topic, correct_answer, options, explanation, textbook_reference")
      .eq("id", question_id)
      .single();
    if (qErr || !question) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Question not found" }) };

    // correct_answer may be a 0-based index (number) or a letter ("a"–"f"); handle both
    // selected_answer comes from client as 0-based index
    const indexToLetter = ['a', 'b', 'c', 'd', 'e', 'f'];
    const letterToIndex = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5 };
    const _raw = question.correct_answer;
    const correctLetter = (typeof _raw === 'number' && _raw >= 0 && _raw <= 5) ? indexToLetter[_raw] : String(_raw).toLowerCase();
    const selectedLetter = indexToLetter[selected_answer] || '';
    const isCorrect = selectedLetter === correctLetter;
    const correctIdx = letterToIndex[correctLetter] ?? -1;

    // 2. SM-2 quality: correct = 4, incorrect = 1
    const quality = isCorrect ? 4 : 1;

    // 3. Get existing review or defaults
    const { data: existingRows } = await userClient
      .from("question_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("question_id", question_id)
      .limit(1);

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    const prevEase = existing?.ease_factor || 2.5;
    const prevInterval = existing?.interval_days || 0;
    const prevReps = existing?.repetition_count || 0;

    const { ease, interval, reps } = sm2(quality, prevEase, prevInterval, prevReps);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // 4. Upsert question_reviews
    if (existing) {
      const { error: updErr } = await userClient.from("question_reviews").update({
        quality,
        ease_factor: ease,
        interval_days: interval,
        repetition_count: reps,
        next_review_at: nextReview.toISOString(),
        reviewed_at: new Date().toISOString(),
      }).eq("id", existing.id);

      if (updErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: updErr.message }) };
    } else {
      const { error: insErr } = await userClient.from("question_reviews").insert({
        user_id: user.id,
        question_id,
        quality,
        ease_factor: ease,
        interval_days: interval,
        repetition_count: reps,
        next_review_at: nextReview.toISOString(),
      });

      if (insErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: insErr.message }) };
    }

    // 5. Record attempt in question_attempts (for dashboard stats) — non-blocking
    try {
      await userClient.from("question_attempts").insert({
        user_id: user.id,
        question_id,
        selected_answer: selectedLetter,
        is_correct: isCorrect,
      });
    } catch (e) { console.error("question_attempts insert failed:", e); }

    // 5b. Update focus areas if wrong
    if (!isCorrect) {
      try { await updateFocusArea(userClient, user.id, question_id); } catch (e) { /* logged internally */ }
    }

    // 6. Update aggregate stats on questions table — non-blocking
    try {
      const serviceClient = getServiceClient();
      const { data: qRow } = await serviceClient.from("questions").select("times_shown, times_correct").eq("id", question_id).single();
      if (qRow) {
        const updates = { times_shown: (qRow.times_shown || 0) + 1 };
        if (isCorrect) updates.times_correct = (qRow.times_correct || 0) + 1;
        await serviceClient.from("questions").update(updates).eq("id", question_id);
      }
    } catch (e) { console.error("stats update failed:", e); }

    // 7. Build response with correct answer text (return 0-based index for frontend)
    const correctText = question.options && Array.isArray(question.options)
      ? (question.options[correctIdx] || null)
      : null;

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        correct: isCorrect,
        correctAnswer: correctIdx,
        correctText,
        explanation: question.explanation || null,
        textbook_reference: question.textbook_reference || null,
        domain: question.domain,
        topic: question.topic,
      }),
    };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
