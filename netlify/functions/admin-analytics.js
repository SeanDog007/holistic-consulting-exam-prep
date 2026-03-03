const { getUserClient, getServiceClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const serviceClient = getServiceClient();

  // Question bank stats
  const { count: totalQuestions } = await serviceClient
    .from("questions").select("*", { count: "exact", head: true }).eq("is_active", true);

  const { data: questionsByDomain } = await serviceClient
    .from("questions").select("domain").eq("is_active", true);
  const domainCounts = {};
  for (const q of (questionsByDomain || [])) {
    domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
  }

  // Hardest questions (lowest pass rate with at least 10 attempts)
  const { data: hardQuestions } = await serviceClient
    .from("questions")
    .select("id, domain, topic, question_text, times_shown, times_correct")
    .eq("is_active", true)
    .gte("times_shown", 10)
    .order("times_correct", { ascending: true })
    .limit(10);

  const hardest = (hardQuestions || []).map(q => ({
    ...q,
    pass_rate: q.times_shown > 0 ? Math.round((q.times_correct / q.times_shown) * 100) : 0,
  })).sort((a, b) => a.pass_rate - b.pass_rate);

  // Flagged questions
  const { count: flaggedCount } = await serviceClient
    .from("question_flags").select("*", { count: "exact", head: true }).eq("is_resolved", false);

  // Active students (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: activeStudents } = await serviceClient
    .from("student_profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .gte("last_active_at", weekAgo.toISOString());

  const { count: totalStudents } = await serviceClient
    .from("student_profiles").select("*", { count: "exact", head: true }).eq("is_active", true);

  // Exam pass rate
  const { data: completedExams } = await serviceClient
    .from("exam_attempts")
    .select("is_passed")
    .not("completed_at", "is", null)
    .eq("exam_type", "full");

  const examPassRate = completedExams && completedExams.length > 0
    ? Math.round((completedExams.filter(e => e.is_passed).length / completedExams.length) * 100)
    : null;

  // Flashcard stats
  const { count: totalFlashcards } = await serviceClient
    .from("flashcards").select("*", { count: "exact", head: true }).eq("is_active", true);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      totalQuestions: totalQuestions || 0,
      questionsByDomain: domainCounts,
      hardestQuestions: hardest,
      flaggedCount: flaggedCount || 0,
      activeStudents: activeStudents || 0,
      totalStudents: totalStudents || 0,
      examPassRate,
      completedExams: completedExams?.length || 0,
      totalFlashcards: totalFlashcards || 0,
    }),
  };
};
