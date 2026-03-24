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
    // Get ALL attempts to calculate accuracy per domain
    const { data: attempts, error: attErr } = await userClient
      .from("question_attempts")
      .select("question_id, is_correct, created_at, questions(domain)")
      .eq("user_id", user.id);

    if (attErr) throw attErr;
    if (!attempts || attempts.length === 0) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ domains: [], total_weak: 0 }) };
    }

    // Calculate per-domain stats: unique questions attempted, unique wrong, accuracy %
    const domainStats = {};
    const questionsByDomain = {}; // domain -> Set of question_ids
    const wrongByDomain = {}; // domain -> Set of question_ids answered wrong (most recent attempt)

    // First pass: group by question_id to find most recent attempt per question
    const latestByQuestion = {};
    for (const att of attempts) {
      const domain = att.questions?.domain;
      if (!domain) continue;
      const qid = att.question_id;
      if (!latestByQuestion[qid] || att.created_at > latestByQuestion[qid].created_at) {
        latestByQuestion[qid] = { domain, is_correct: att.is_correct, created_at: att.created_at };
      }
    }

    // Second pass: count per domain based on most recent attempt
    for (const [qid, info] of Object.entries(latestByQuestion)) {
      const d = info.domain;
      if (!domainStats[d]) domainStats[d] = { total: 0, wrong: 0, last_wrong_at: null };
      domainStats[d].total++;
      if (!info.is_correct) {
        domainStats[d].wrong++;
        if (!domainStats[d].last_wrong_at || info.created_at > domainStats[d].last_wrong_at) {
          domainStats[d].last_wrong_at = info.created_at;
        }
      }
    }

    const DOMAIN_NAMES = {
      1: "Food & Nutrition",
      2: "A&P / Biochemistry",
      3: "Counseling / Ethics / Scope",
      4: "Nutrition in Practice",
      5: "Research",
    };
    const DOMAIN_WEIGHTS = { 1: 35, 2: 15, 3: 10, 4: 30, 5: 10 };

    // Build domain-level focus areas (only domains where accuracy < 70%)
    const domains = [];
    for (const [domainStr, stats] of Object.entries(domainStats)) {
      const domain = parseInt(domainStr);
      const accuracy = stats.total > 0 ? Math.round((1 - stats.wrong / stats.total) * 100) : 100;
      if (accuracy >= 70 || stats.wrong === 0) continue; // Skip domains where user is doing well

      domains.push({
        domain,
        domain_name: DOMAIN_NAMES[domain] || `Domain ${domain}`,
        exam_weight: DOMAIN_WEIGHTS[domain] || 10,
        questions_attempted: stats.total,
        questions_wrong: stats.wrong,
        accuracy_pct: accuracy,
        last_wrong_at: stats.last_wrong_at,
      });
    }

    // Sort by accuracy ascending (worst domains first)
    domains.sort((a, b) => a.accuracy_pct - b.accuracy_pct);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        domains,
        total_weak: domains.length,
      }),
    };
  } catch (err) {
    console.error("Focus areas error:", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to compute focus areas" }) };
  }
};
