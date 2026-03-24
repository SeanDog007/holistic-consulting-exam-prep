/**
 * Shared utility for updating user_focus_areas when a question is answered wrong.
 * Called from practice.js, submit-answer.js, and submit-exam.js.
 */

async function updateFocusArea(userClient, userId, questionId) {
  try {
    // 1. Get question's lesson_id and domain
    const { data: q, error: qErr } = await userClient
      .from("questions")
      .select("lesson_id, domain")
      .eq("id", questionId)
      .single();

    if (qErr || !q || !q.lesson_id) return; // unmapped question, skip silently

    // 2. Check if a focus area row already exists for this user + lesson
    const { data: existing } = await userClient
      .from("user_focus_areas")
      .select("id, status, wrong_count")
      .eq("user_id", userId)
      .eq("lesson_id", q.lesson_id)
      .limit(1);

    const row = existing?.[0];

    if (!row) {
      // 3a. No existing row — insert new focus area
      await userClient.from("user_focus_areas").insert({
        user_id: userId,
        lesson_id: q.lesson_id,
        domain: q.domain,
        status: "active",
        wrong_count: 1,
        last_wrong_at: new Date().toISOString(),
      });
    } else {
      // 3b. Existing row — increment wrong_count and re-activate if dismissed/completed
      await userClient.from("user_focus_areas").update({
        status: "active",
        wrong_count: row.wrong_count + 1,
        last_wrong_at: new Date().toISOString(),
        dismissed_at: null,
        completed_at: null,
      }).eq("id", row.id);
    }
  } catch (err) {
    // Non-blocking — log but don't fail the parent request
    console.error("updateFocusArea error:", err.message || err);
  }
}

/**
 * Batch version for submit-exam.js — updates focus areas for multiple wrong questions at once.
 * Groups by lesson_id to avoid duplicate increments for the same lesson.
 */
async function batchUpdateFocusAreas(userClient, userId, wrongQuestionIds) {
  if (!wrongQuestionIds || wrongQuestionIds.length === 0) return;

  try {
    // 1. Get lesson_id + domain for all wrong questions
    const { data: questions } = await userClient
      .from("questions")
      .select("id, lesson_id, domain")
      .in("id", wrongQuestionIds);

    if (!questions || questions.length === 0) return;

    // 2. Group by lesson_id (count how many wrong per lesson)
    const lessonGroups = {};
    for (const q of questions) {
      if (!q.lesson_id) continue;
      if (!lessonGroups[q.lesson_id]) {
        lessonGroups[q.lesson_id] = { lesson_id: q.lesson_id, domain: q.domain, count: 0 };
      }
      lessonGroups[q.lesson_id].count++;
    }

    // 3. Upsert each unique lesson
    for (const group of Object.values(lessonGroups)) {
      const { data: existing } = await userClient
        .from("user_focus_areas")
        .select("id, status, wrong_count")
        .eq("user_id", userId)
        .eq("lesson_id", group.lesson_id)
        .limit(1);

      const row = existing?.[0];

      if (!row) {
        await userClient.from("user_focus_areas").insert({
          user_id: userId,
          lesson_id: group.lesson_id,
          domain: group.domain,
          status: "active",
          wrong_count: group.count,
          last_wrong_at: new Date().toISOString(),
        });
      } else {
        await userClient.from("user_focus_areas").update({
          status: "active",
          wrong_count: row.wrong_count + group.count,
          last_wrong_at: new Date().toISOString(),
          dismissed_at: null,
          completed_at: null,
        }).eq("id", row.id);
      }
    }
  } catch (err) {
    console.error("batchUpdateFocusAreas error:", err.message || err);
  }
}

module.exports = { updateFocusArea, batchUpdateFocusAreas };
