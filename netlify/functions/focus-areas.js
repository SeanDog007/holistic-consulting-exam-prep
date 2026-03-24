const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  try {
    // 1. Fetch ALL question attempts (right and wrong) to calculate per-question accuracy
    const { data: allAttempts, error: attErr } = await userClient
      .from("question_attempts")
      .select("question_id, is_correct, created_at")
      .eq("user_id", user.id);

    if (attErr) throw attErr;
    if (!allAttempts || allAttempts.length === 0) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ focus_areas: [], total_count: 0 }) };
    }

    // 2. Group by question_id — track wrong count, total attempts, last wrong date
    const questionStats = {};
    for (const att of allAttempts) {
      if (!questionStats[att.question_id]) {
        questionStats[att.question_id] = { wrong: 0, total: 0, last_wrong_at: null };
      }
      questionStats[att.question_id].total++;
      if (!att.is_correct) {
        questionStats[att.question_id].wrong++;
        if (!questionStats[att.question_id].last_wrong_at || att.created_at > questionStats[att.question_id].last_wrong_at) {
          questionStats[att.question_id].last_wrong_at = att.created_at;
        }
      }
    }

    // 3. Filter to questions the user is still getting wrong (accuracy < 70% OR never got right)
    const weakQuestionIds = Object.entries(questionStats)
      .filter(([_, s]) => s.wrong > 0 && (s.wrong / s.total) > 0.3)
      .map(([id]) => id);

    if (weakQuestionIds.length === 0) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ focus_areas: [], total_count: 0 }) };
    }

    // 4. Fetch question details for weak questions
    const { data: weakQuestions, error: qErr } = await userClient
      .from("questions")
      .select("id, domain, topic")
      .in("id", weakQuestionIds.slice(0, 200));

    if (qErr) throw qErr;

    // 5. Group weak questions by domain — count unique weak questions per domain
    const domainGroups = {};
    for (const q of (weakQuestions || [])) {
      if (!q.domain) continue;
      if (!domainGroups[q.domain]) {
        domainGroups[q.domain] = { domain: q.domain, uniqueQuestions: 0, topics: new Set(), last_wrong_at: null };
      }
      domainGroups[q.domain].uniqueQuestions++;
      if (q.topic) domainGroups[q.domain].topics.add(q.topic);
      const stat = questionStats[q.id];
      if (stat?.last_wrong_at) {
        if (!domainGroups[q.domain].last_wrong_at || stat.last_wrong_at > domainGroups[q.domain].last_wrong_at) {
          domainGroups[q.domain].last_wrong_at = stat.last_wrong_at;
        }
      }
    }

    // 6. Fetch ALL lessons with modules
    const { data: lessons, error: lesErr } = await userClient
      .from("study_lessons")
      .select("id, title, module_id, content_html, study_modules(domain, title)")
      .order("lesson_order");

    if (lesErr) throw lesErr;

    // 7. Fetch completed lessons
    const { data: completedLessons } = await userClient
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("is_completed", true);

    const completedSet = new Set((completedLessons || []).map(lp => lp.lesson_id));

    // 8. For each domain with weak questions, find RELEVANT uncompleted lessons
    //    Only match lessons that have actual content (content_html is not null)
    //    Only match by DIRECT keyword match — no fallback to random lessons
    const DOMAIN_WEIGHTS = { 1: 0.35, 2: 0.15, 3: 0.10, 4: 0.30, 5: 0.10 };
    const DOMAIN_NAMES = { 1: "Food & Nutrition", 2: "A&P / Biochemistry", 3: "Counseling / Ethics", 4: "Nutrition in Practice", 5: "Research" };

    const focusAreas = [];

    for (const [domainStr, group] of Object.entries(domainGroups)) {
      const domain = parseInt(domainStr);

      // Get uncompleted lessons with content in this domain
      const domainLessons = (lessons || []).filter(l => {
        const mod = l.study_modules;
        return mod && mod.domain === domain && l.content_html && !completedSet.has(l.id);
      });

      if (domainLessons.length === 0) continue;

      // Try to find lessons that match the weak topics by keyword
      const matchedLessonIds = new Set();
      const topicKeywords = [...group.topics].flatMap(t =>
        t.split(/[\s,/&]+/).filter(w => w.length > 3).map(w => w.toLowerCase())
      );

      for (const lesson of domainLessons) {
        const titleLower = lesson.title.toLowerCase();
        const hasMatch = topicKeywords.some(kw => titleLower.includes(kw));
        if (hasMatch) matchedLessonIds.add(lesson.id);
      }

      // If we found keyword matches, use those. Otherwise pick the first 2 uncompleted lessons.
      const selectedLessons = matchedLessonIds.size > 0
        ? domainLessons.filter(l => matchedLessonIds.has(l.id)).slice(0, 3)
        : domainLessons.slice(0, 2);

      // Score
      const daysSince = group.last_wrong_at
        ? (Date.now() - new Date(group.last_wrong_at).getTime()) / (1000 * 60 * 60 * 24)
        : 30;
      const recency = daysSince <= 7 ? 3 : daysSince <= 30 ? 1.5 : 1;
      const weight = DOMAIN_WEIGHTS[domain] || 0.10;
      const score = group.uniqueQuestions * recency * (weight * 10);

      for (const lesson of selectedLessons) {
        focusAreas.push({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          module_title: lesson.study_modules?.title || '',
          domain,
          domain_name: DOMAIN_NAMES[domain] || '',
          wrong_count: group.uniqueQuestions,
          last_wrong_at: group.last_wrong_at,
          priority_score: Math.round(score * 100) / 100,
        });
      }
    }

    // Sort by score descending, limit to 10
    const sorted = focusAreas
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ focus_areas: sorted, total_count: sorted.length }),
    };
  } catch (err) {
    console.error("Focus areas error:", err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Failed to compute focus areas" }),
    };
  }
};
