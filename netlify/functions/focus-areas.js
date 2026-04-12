const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

const DOMAIN_NAMES = {
  1: "Food & Nutrition",
  2: "A&P / Biochemistry",
  3: "Counseling / Ethics / Scope",
  4: "Nutrition in Practice",
  5: "Research",
};
const DOMAIN_WEIGHTS = { 1: 0.35, 2: 0.15, 3: 0.10, 4: 0.30, 5: 0.10 };

function computePriority(wrongCount, lastWrongAt, domain) {
  // Wrong count score (0-50): logarithmic so early wrongs matter most
  const wrongScore = Math.min(50, Math.log2(wrongCount + 1) * 15);

  // Recency score (0-30): decays ~2 pts per day
  const hoursSince = (Date.now() - new Date(lastWrongAt).getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 30 - (hoursSince / 24) * 2);

  // Domain weight score (0-20): higher-weight exam domains score more
  const domainScore = (DOMAIN_WEIGHTS[domain] || 0.10) * 57;

  return Math.round((wrongScore + recencyScore + domainScore) * 10) / 10;
}

function priorityLabel(score) {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // ── GET /focus-areas ──────────────────────────────────────────────
  if (event.httpMethod === "GET") {
    try {
      const { data: focusAreas, error: faErr } = await userClient
        .from("user_focus_areas")
        .select("id, lesson_id, domain, wrong_count, last_wrong_at, study_lessons(id, title, study_modules(title))")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (faErr) throw faErr;

      if (!focusAreas || focusAreas.length === 0) {
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ focus_areas: [], total_active: 0 }),
        };
      }

      // Build response with priority scoring
      const items = focusAreas
        .filter(fa => fa.study_lessons) // skip if lesson was deleted
        .map(fa => {
          const score = computePriority(fa.wrong_count, fa.last_wrong_at, fa.domain);
          return {
            id: fa.id,
            lesson_id: fa.lesson_id,
            lesson_title: fa.study_lessons.title,
            module_title: fa.study_lessons.study_modules?.title || "",
            domain: fa.domain,
            domain_name: DOMAIN_NAMES[fa.domain] || `Domain ${fa.domain}`,
            wrong_count: fa.wrong_count,
            last_wrong_at: fa.last_wrong_at,
            priority_score: score,
            priority: priorityLabel(score),
          };
        })
        .sort((a, b) => b.priority_score - a.priority_score);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          focus_areas: items,
          total_active: items.length,
        }),
      };
    } catch (err) {
      console.error("Focus areas GET error:", err);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to load focus areas" }) };
    }
  }

  // ── POST /focus-areas ─────────────────────────────────────────────
  if (event.httpMethod === "POST") {
    try {
      const { id, action } = JSON.parse(event.body);
      if (!id || !action) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id and action required" }) };
      }
      if (!["dismiss", "complete"].includes(action)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "action must be 'dismiss' or 'complete'" }) };
      }

      // Verify the focus area belongs to this user
      const { data: fa, error: faErr } = await userClient
        .from("user_focus_areas")
        .select("id, lesson_id, user_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (faErr || !fa) {
        return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "Focus area not found" }) };
      }

      if (action === "dismiss") {
        await userClient.from("user_focus_areas").update({
          status: "dismissed",
          dismissed_at: new Date().toISOString(),
        }).eq("id", id);
      }

      if (action === "complete") {
        // 1. Mark focus area as completed
        await userClient.from("user_focus_areas").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", id);

        // 2. Also mark the lesson as complete in lesson_progress (mirrors curriculum.js logic)
        const { data: existingProgress } = await userClient
          .from("lesson_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("lesson_id", fa.lesson_id)
          .maybeSingle();

        const progressRow = existingProgress;
        if (progressRow) {
          await userClient.from("lesson_progress").update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          }).eq("id", progressRow.id);
        } else {
          await userClient.from("lesson_progress").insert({
            user_id: user.id,
            lesson_id: fa.lesson_id,
            is_completed: true,
            completed_at: new Date().toISOString(),
            time_spent_seconds: 0,
          });
        }
      }

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, action }),
      };
    } catch (err) {
      console.error("Focus areas POST error:", err);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to update focus area" }) };
    }
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
