const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  // GET — retrieve existing diagnostic results
  if (event.httpMethod === "GET") {
    const { data, error } = await userClient
      .from("diagnostic_results")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false })
      .maybeSingle();

    return { statusCode: 200, headers: cors, body: JSON.stringify(data || null) };
  }

  // POST — generate diagnostic exam (5 questions per domain = 25 total)
  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");

    // If submitting results
    if (body.domain_scores) {
      // Identify weak topics
      const weakTopics = [];
      for (const [domain, score] of Object.entries(body.domain_scores)) {
        if (score < 70) weakTopics.push(`Domain ${domain}`);
      }

      const { data, error } = await userClient.from("diagnostic_results").insert({
        user_id: user.id,
        domain_scores: body.domain_scores,
        weak_topics: weakTopics,
      }).select().single();

      if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };

      // Also create an exam attempt record for tracking
      await userClient.from("exam_attempts").insert({
        user_id: user.id,
        exam_type: "diagnostic",
        total_questions: 25,
        correct_count: body.correct_count || null,
        score_pct: body.score_pct || null,
        domain_scores: body.domain_scores,
        completed_at: new Date().toISOString(),
      });

      return { statusCode: 201, headers: cors, body: JSON.stringify(data) };
    }

    // Generate diagnostic questions (5 per domain)
    const questions = [];
    const domainCoverage = {};
    const missingDomains = [];

    for (let domain = 1; domain <= 5; domain++) {
      const { data: domainQs } = await userClient
        .from("questions")
        .select("id, domain, topic, difficulty, question_type, question_text, options, correct_answer, explanation, textbook_reference")
        .eq("is_active", true)
        .eq("domain", domain);

      const count = domainQs ? domainQs.length : 0;
      domainCoverage[domain] = count;

      if (count === 0) {
        missingDomains.push(domain);
      } else {
        const shuffled = domainQs.sort(() => Math.random() - 0.5);
        questions.push(...shuffled.slice(0, Math.min(5, shuffled.length)));
      }
    }

    // If any domain has zero questions, return an informative error
    if (missingDomains.length > 0) {
      const domainNames = { 1: "Food & Nutrition", 2: "A&P / Biochem", 3: "Counseling / Ethics", 4: "Nutrition in Practice", 5: "Research" };
      const missing = missingDomains.map(d => `Domain ${d} (${domainNames[d]})`).join(", ");
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          questions: [],
          total: 0,
          insufficient: true,
          message: `The diagnostic assessment requires questions in all 5 domains. Missing: ${missing}. Ask your instructor to add more questions.`,
          domain_coverage: domainCoverage,
        }),
      };
    }

    // Shuffle all together
    questions.sort(() => Math.random() - 0.5);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ questions, total: questions.length }) };
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
