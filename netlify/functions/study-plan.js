const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

const DOMAIN_NAMES = {
  1: "Food & Nutrition",
  2: "A&P / Biochemistry",
  3: "Counseling / Ethics / Scope",
  4: "Nutrition in Practice",
  5: "Research",
};
const DOMAIN_WEIGHTS = { 1: 35, 2: 15, 3: 10, 4: 30, 5: 10 };

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  if (event.httpMethod === "GET") {
    const { data, error } = await userClient
      .from("study_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .maybeSingle();

    return { statusCode: 200, headers: cors, body: JSON.stringify(data || null) };
  }

  if (event.httpMethod === "POST") {
    const { target_exam_date } = JSON.parse(event.body);
    if (!target_exam_date) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "target_exam_date required" }) };

    // Get domain mastery to personalize the plan
    const { data: attempts } = await userClient
      .from("question_attempts")
      .select("is_correct, questions(domain)")
      .eq("user_id", user.id);

    const domainScores = {};
    for (const a of (attempts || [])) {
      const d = a.questions?.domain;
      if (!d) continue;
      if (!domainScores[d]) domainScores[d] = { correct: 0, total: 0 };
      domainScores[d].total++;
      if (a.is_correct) domainScores[d].correct++;
    }

    // Calculate weeks until exam
    const examDate = new Date(target_exam_date);
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksUntilExam = Math.max(1, Math.ceil((examDate - today) / msPerWeek));

    // Sort domains by weakness (weakest first)
    const domainPriority = [1, 2, 3, 4, 5].map(d => {
      const s = domainScores[d];
      const pct = s && s.total > 0 ? (s.correct / s.total) * 100 : 50; // Default 50% if untested
      return { domain: d, score: pct, weight: DOMAIN_WEIGHTS[d] };
    }).sort((a, b) => a.score - b.score);

    // Generate weekly plan
    const weeks = [];
    const domainsPerWeek = Math.min(2, weeksUntilExam >= 10 ? 2 : 3);

    for (let w = 0; w < weeksUntilExam; w++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + (w * 7));

      let focus;
      if (w >= weeksUntilExam - 2) {
        // Last 2 weeks: full review + practice exams
        focus = {
          week: w + 1,
          start_date: weekStart.toISOString().slice(0, 10),
          theme: "Final Review & Practice Exams",
          domains: [1, 2, 3, 4, 5],
          activities: [
            "Take a full-length practice exam",
            "Review all flagged/missed questions",
            "Flashcard review (all domains)",
            "Light review of weakest topics",
          ],
        };
      } else {
        // Rotate through domains, prioritizing weak ones
        const weekDomainIdx = (w * domainsPerWeek) % 5;
        const focusDomains = [];
        for (let i = 0; i < domainsPerWeek; i++) {
          focusDomains.push(domainPriority[(weekDomainIdx + i) % 5].domain);
        }

        focus = {
          week: w + 1,
          start_date: weekStart.toISOString().slice(0, 10),
          theme: focusDomains.map(d => `Domain ${d}: ${DOMAIN_NAMES[d]}`).join(" + "),
          domains: focusDomains,
          activities: [
            `Read study guide for ${focusDomains.map(d => `Domain ${d}`).join(" & ")}`,
            `Practice 25+ questions per focus domain`,
            "Daily flashcard review (15-20 min)",
            focusDomains.some(d => (domainScores[d]?.total || 0) > 0 && ((domainScores[d]?.correct || 0) / domainScores[d].total) < 0.7)
              ? "Extra focus: review explanations for missed questions"
              : "Build flashcards from new material",
          ],
        };
      }
      weeks.push(focus);
    }

    // Deactivate old plans
    await userClient.from("study_plans").update({ is_active: false }).eq("user_id", user.id);

    // Save new plan
    const { data, error } = await userClient.from("study_plans").insert({
      user_id: user.id,
      target_exam_date,
      plan_data: { weeks, weeksUntilExam, domainPriority },
      is_active: true,
    }).select().single();

    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

    // Update profile exam date
    await userClient.from("student_profiles").update({ target_exam_date }).eq("id", user.id);

    return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
