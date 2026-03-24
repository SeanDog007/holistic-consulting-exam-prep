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
    // 1. Fetch wrong attempts with question domain and topic
    const { data: wrongAttempts, error: attErr } = await userClient
      .from("question_attempts")
      .select("question_id, created_at, questions(domain, topic)")
      .eq("user_id", user.id)
      .eq("is_correct", false);

    if (attErr) throw attErr;

    if (!wrongAttempts || wrongAttempts.length === 0) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ focus_areas: [], total_count: 0 }),
      };
    }

    // 2. Group wrong answers by domain + topic
    const groups = {};
    for (const att of wrongAttempts) {
      const domain = att.questions?.domain;
      const topic = att.questions?.topic;
      if (!domain || !topic) continue;

      const key = `${domain}::${topic}`;
      if (!groups[key]) {
        groups[key] = { domain, topic, count: 0, last_wrong_at: att.created_at };
      }
      groups[key].count++;
      if (att.created_at > groups[key].last_wrong_at) {
        groups[key].last_wrong_at = att.created_at;
      }
    }

    const groupEntries = Object.values(groups);
    if (groupEntries.length === 0) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ focus_areas: [], total_count: 0 }),
      };
    }

    // 3. Fetch lessons joined with modules for matching
    const { data: lessons, error: lessonErr } = await userClient
      .from("study_lessons")
      .select("id, title, study_modules(domain, title)")
      .order("lesson_order", { ascending: true });

    if (lessonErr) throw lessonErr;

    // 4. Fetch user's completed lessons
    const { data: completedLessons, error: progErr } = await userClient
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("is_completed", true);

    if (progErr) throw progErr;

    const completedSet = new Set((completedLessons || []).map(lp => lp.lesson_id));

    // 5. Match each group to a lesson
    const DOMAIN_WEIGHTS = { 1: 0.35, 2: 0.15, 3: 0.10, 4: 0.30, 5: 0.10 };

    const focusAreas = [];

    for (const g of groupEntries) {
      // Extract first significant word from topic for keyword matching
      const stopWords = new Set(["the", "a", "an", "and", "or", "of", "in", "to", "for", "on", "with", "is", "at", "by"]);
      const words = g.topic.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
      const keyword = words.length > 0 ? words[0] : g.topic.split(/\s+/)[0];

      // Find a matching lesson: same domain, title contains keyword
      const match = (lessons || []).find(l => {
        const mod = l.study_modules;
        if (!mod || mod.domain !== g.domain) return false;
        if (completedSet.has(l.id)) return false;
        return l.title.toLowerCase().includes(keyword.toLowerCase());
      });

      // If no keyword match found, try any uncompleted lesson in the same domain
      const fallback = !match
        ? (lessons || []).find(l => {
            const mod = l.study_modules;
            if (!mod || mod.domain !== g.domain) return false;
            return !completedSet.has(l.id);
          })
        : null;

      const lesson = match || fallback;
      if (!lesson) continue;

      // 6. Score
      const daysSince = (Date.now() - new Date(g.last_wrong_at).getTime()) / (1000 * 60 * 60 * 24);
      const recency = daysSince <= 7 ? 3 : daysSince <= 30 ? 1.5 : 1;
      const weight = DOMAIN_WEIGHTS[g.domain] || 0.10;
      const score = g.count * recency * (weight * 10);

      focusAreas.push({
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        module_title: lesson.study_modules.title,
        domain: g.domain,
        topic: g.topic,
        wrong_count: g.count,
        last_wrong_at: g.last_wrong_at,
        priority_score: Math.round(score * 100) / 100,
      });
    }

    // 7. Deduplicate by lesson_id (keep highest score)
    const byLesson = {};
    for (const fa of focusAreas) {
      if (!byLesson[fa.lesson_id] || fa.priority_score > byLesson[fa.lesson_id].priority_score) {
        byLesson[fa.lesson_id] = fa;
      }
    }

    // 8. Sort by score descending, limit to 15
    const sorted = Object.values(byLesson)
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 15);

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
