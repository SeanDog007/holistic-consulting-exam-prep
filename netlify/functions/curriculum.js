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
    // --- Single lesson with full content ---
    if (params.lesson) {
      return handleGetLesson(userClient, user, params.lesson, cors);
    }
    // --- All modules/lessons for a domain ---
    if (params.domain) {
      return handleGetDomain(userClient, user, parseInt(params.domain), cors);
    }
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "domain or lesson parameter required" }) };
  }

  if (event.httpMethod === "POST") {
    return handlePostProgress(userClient, user, event.body, cors);
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};

// GET /curriculum?domain=N
async function handleGetDomain(userClient, user, domain, cors) {
  const { data: modules, error: modErr } = await userClient
    .from("study_modules")
    .select("*")
    .eq("domain", domain)
    .order("module_order");

  if (modErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: modErr.message }) };
  if (!modules || modules.length === 0) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ domain, modules: [] }) };
  }

  const moduleIds = modules.map(m => m.id);

  const { data: lessons, error: lesErr } = await userClient
    .from("study_lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("lesson_order");

  if (lesErr) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: lesErr.message }) };

  // Get lesson progress for current user
  const lessonIds = (lessons || []).map(l => l.id);
  let progressMap = {};
  if (lessonIds.length > 0) {
    const { data: progress } = await userClient
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds);

    for (const p of (progress || [])) progressMap[p.lesson_id] = p;
  }

  // Group lessons by module and calculate completion
  const lessonsMap = {};
  for (const l of (lessons || [])) {
    if (!lessonsMap[l.module_id]) lessonsMap[l.module_id] = [];
    lessonsMap[l.module_id].push(l);
  }

  const result = modules.map(m => {
    const moduleLessons = lessonsMap[m.id] || [];
    const completedCount = moduleLessons.filter(l => progressMap[l.id]?.is_completed).length;
    const completionPct = moduleLessons.length > 0
      ? Math.round((completedCount / moduleLessons.length) * 100)
      : 0;

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      module_order: m.module_order,
      estimated_minutes: m.estimated_minutes,
      lessons: moduleLessons.map(l => ({
        id: l.id,
        title: l.title,
        subtitle: l.subtitle,
        lesson_order: l.lesson_order,
        estimated_minutes: l.estimated_minutes,
        exam_alert: l.exam_alert,
        is_completed: progressMap[l.id]?.is_completed || false,
        completed_at: progressMap[l.id]?.completed_at || null,
      })),
      completion_pct: completionPct,
    };
  });

  return { statusCode: 200, headers: cors, body: JSON.stringify({ domain, modules: result }) };
}

// GET /curriculum?lesson=LESSON_ID
async function handleGetLesson(userClient, user, lessonId, cors) {
  // Get lesson with module context
  const { data: lesson, error: lesErr } = await userClient
    .from("study_lessons")
    .select("*, study_modules(*)")
    .eq("id", lessonId)
    .single();

  if (lesErr || !lesson) {
    return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Lesson not found" }) };
  }

  const module = lesson.study_modules;

  // Get user progress for this lesson
  const { data: progress } = await userClient
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Get practice questions matching the lesson's domain and topic keyword
  let practiceQuestions = [];
  if (lesson.title) {
    // Use first significant keyword from lesson title for topic matching
    const keyword = lesson.title.split(/[\s&,]+/).find(w => w.length > 3) || lesson.title;
    const { data: questions } = await userClient
      .from("questions")
      .select("id, question_text, options, correct_answer, explanation, textbook_reference, domain, topic")
      .eq("domain", module.domain)
      .ilike("topic", `%${keyword}%`)
      .limit(3);

    practiceQuestions = (questions || []).map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      textbook_reference: q.textbook_reference,
      domain: q.domain,
      topic: q.topic,
    }));
  }

  // Get navigation (prev/next lessons within the same module)
  const { data: siblings } = await userClient
    .from("study_lessons")
    .select("id, title, lesson_order")
    .eq("module_id", module.id)
    .order("lesson_order");

  let prevLesson = null;
  let nextLesson = null;
  if (siblings) {
    const idx = siblings.findIndex(s => s.id === lessonId);
    if (idx > 0) prevLesson = siblings[idx - 1];
    if (idx >= 0 && idx < siblings.length - 1) nextLesson = siblings[idx + 1];
  }

  const result = {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      content_html: lesson.content_html,
      key_takeaways: lesson.key_takeaways,
      exam_alert: lesson.exam_alert,
      estimated_minutes: lesson.estimated_minutes,
    },
    module: {
      id: module.id,
      title: module.title,
      domain: module.domain,
    },
    progress: {
      is_completed: progress?.is_completed || false,
      time_spent_seconds: progress?.time_spent_seconds || 0,
    },
    practice_questions: practiceQuestions,
    navigation: {
      prev_lesson_id: prevLesson?.id || null,
      next_lesson_id: nextLesson?.id || null,
      prev_title: prevLesson?.title || null,
      next_title: nextLesson?.title || null,
    },
  };

  return { statusCode: 200, headers: cors, body: JSON.stringify(result) };
}

// POST /curriculum — Update lesson progress
async function handlePostProgress(userClient, user, rawBody, cors) {
  const body = JSON.parse(rawBody);
  if (!body.lesson_id) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "lesson_id required" }) };
  }

  const { data: existing } = await userClient
    .from("lesson_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", body.lesson_id)
    .single();

  if (existing) {
    const updates = {};
    if (body.is_completed !== undefined) {
      updates.is_completed = body.is_completed;
      if (body.is_completed) updates.completed_at = new Date().toISOString();
    }
    if (body.time_spent_seconds !== undefined) updates.time_spent_seconds = body.time_spent_seconds;

    const { data, error } = await userClient
      .from("lesson_progress")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  } else {
    const { data, error } = await userClient
      .from("lesson_progress")
      .insert({
        user_id: user.id,
        lesson_id: body.lesson_id,
        is_completed: body.is_completed || false,
        completed_at: body.is_completed ? new Date().toISOString() : null,
        time_spent_seconds: body.time_spent_seconds || 0,
      })
      .select()
      .single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
  }
}
