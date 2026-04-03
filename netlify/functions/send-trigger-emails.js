/**
 * send-trigger-emails — Netlify scheduled function (daily at 1 PM ET / 17:00 UTC).
 * Sends behavioral trigger emails:
 *   - Day 7 re-engagement: low activity in first week
 *   - Day 28 churn prevention: inactive for 14+ days, still subscribed
 *
 * Copy by Pam (2026-04-01). Triggers based on student_profiles + question_attempts.
 */
const { getServiceClient } = require("./utils/supabase");
const { sendEmail } = require("./utils/resend");

const SITE_URL = process.env.SITE_URL || "https://prep.holisticconsultinghq.com";

// ── Day 7 Re-engagement Email ─────────────────────────────────
function day7Html(firstName, unsubUrl) {
  return `
<div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
  <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; color: #2A3024; margin-bottom: 4px;">
    BCHN® Exam Prep
  </h1>
  <p style="color: #6B7F5E; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">
    Holistic Consulting
  </p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Hey ${firstName},</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">I noticed you haven't spent much time on the platform yet — and I get it. Life is busy, the exam feels far away, and it's easy to tell yourself you'll start properly next week.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">But I want to show you something most members don't find until their third week, and it changes how they study: <strong>Focus Areas.</strong></p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Focus Areas tracks which exam domains you're strongest in and which ones need work — not based on how you <em>feel</em> about the material, but based on your actual practice question performance. It tells you exactly where to spend your study time for maximum impact. The members who use it study smarter, not longer — and their pass rates reflect it.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">It takes 15 minutes to generate your first Focus Areas profile. Log in, answer 20 practice questions, and the platform does the rest.</p>

  <div style="margin: 28px 0;">
    <a href="${SITE_URL}" style="display: inline-block; background: #6B7F5E; color: white; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none;">
      See your Focus Areas →
    </a>
  </div>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Fifteen minutes. That's all. And you'll know more about your exam readiness than most candidates learn in a month of unfocused studying.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">— Sean</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #bbb; font-size: 12px; line-height: 1.6;">
    Holistic Consulting HQ · holisticconsultinghq.com<br>
    <a href="${unsubUrl}" style="color: #bbb; text-decoration: underline;">Unsubscribe from emails</a>
  </p>
</div>`;
}

// ── Day 28 Churn Prevention Email ──────────────────────────────
function day28Html(firstName, unsubUrl) {
  return `
<div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
  <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; color: #2A3024; margin-bottom: 4px;">
    BCHN® Exam Prep
  </h1>
  <p style="color: #6B7F5E; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">
    Holistic Consulting
  </p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Hey ${firstName},</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">It's been a little while since you logged in. No judgment — every BCHN candidate hits a stretch where life takes over and studying slides.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Here's what I know from working with hundreds of exam candidates: the ones who pass aren't the ones who never took a break. They're the ones who came back.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;"><strong>Here's how to restart without overwhelm:</strong></p>

  <ol style="color: #3a4a3a; font-size: 15px; line-height: 1.9; padding-left: 20px;">
    <li><strong>Log in and take 10 practice questions</strong> — any domain, no pressure. This breaks the seal and gets you back in study mode. Ten questions, ten minutes.</li>
    <li><strong>Check your Focus Areas profile.</strong> If you used it before, it remembers where you left off. If you haven't used it yet, 20 questions will generate your first readiness snapshot — and show you exactly which domain to focus on next.</li>
    <li><strong>Pick your exam date.</strong> If you haven't already, commit to a date. Even a tentative one. Candidates who set a date study 3x more consistently than those who study "whenever." The exam is online via ProctorU — you can take it from home, any day you're ready.</li>
  </ol>

  <div style="margin: 28px 0;">
    <a href="${SITE_URL}" style="display: inline-block; background: #6B7F5E; color: white; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none;">
      Pick up where you left off →
    </a>
  </div>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Your course materials are exactly where you left them. Your progress is saved. The only thing that's changed is time — and you have enough of it.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">Come back. Finish what you started.</p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">— Sean<br>Holistic Consulting</p>

  <p style="color: #888; font-size: 14px; line-height: 1.7; margin-top: 16px;">P.S. — If something about the platform isn't working for you — confusing navigation, wrong difficulty level, not enough time — reply to this email and tell me. I'd rather fix the problem than lose you.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #bbb; font-size: 12px; line-height: 1.6;">
    Holistic Consulting HQ · holisticconsultinghq.com<br>
    <a href="${unsubUrl}" style="color: #bbb; text-decoration: underline;">Unsubscribe from emails</a>
  </p>
</div>`;
}

// ── Main Handler ───────────────────────────────────────────────
exports.handler = async () => {
  console.log("[trigger-emails] Starting daily trigger check...");
  const sc = getServiceClient();
  const now = Date.now();
  let sent = 0;
  let skipped = 0;

  // Get all active students with email enabled
  const { data: students, error } = await sc
    .from("student_profiles")
    .select("id, email, display_name, enrolled_at, last_active_at, unsubscribe_token, is_active")
    .eq("is_active", true)
    .eq("email_reminders_enabled", true);

  if (error) {
    console.error("[trigger-emails] Failed to fetch students:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  if (!students || students.length === 0) {
    console.log("[trigger-emails] No eligible students.");
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  // Get already-sent trigger emails to avoid duplicates
  const studentIds = students.map(s => s.id);
  const { data: alreadySent } = await sc
    .from("trigger_emails_sent")
    .select("student_id, trigger_type")
    .in("student_id", studentIds);

  const sentSet = new Set(
    (alreadySent || []).map(r => `${r.student_id}:${r.trigger_type}`)
  );

  // Get question attempt counts per student (engagement proxy)
  const { data: attemptRows } = await sc
    .from("question_attempts")
    .select("user_id")
    .in("user_id", studentIds);

  const attemptCounts = {};
  for (const a of (attemptRows || [])) {
    attemptCounts[a.user_id] = (attemptCounts[a.user_id] || 0) + 1;
  }

  const tasks = [];

  for (const student of students) {
    const firstName = (student.display_name || student.email.split("@")[0]).split(" ")[0];
    const unsubUrl = `${SITE_URL}/.netlify/functions/unsubscribe?token=${student.unsubscribe_token}`;
    const enrolledAt = new Date(student.enrolled_at).getTime();
    const daysSinceEnroll = Math.floor((now - enrolledAt) / 86400000);
    const lastActive = student.last_active_at ? new Date(student.last_active_at).getTime() : enrolledAt;
    const daysSinceLastActive = Math.floor((now - lastActive) / 86400000);
    const questionsAnswered = attemptCounts[student.id] || 0;

    // ── Day 7 trigger ──
    // Conditions: 7 days since enroll, < 50 questions answered (low engagement), not already sent
    if (daysSinceEnroll >= 7 && questionsAnswered < 50 && !sentSet.has(`${student.id}:day7_reengagement`)) {
      tasks.push(async () => {
        const result = await sendEmail({
          to: student.email,
          subject: "You haven't found Focus Areas yet, have you?",
          html: day7Html(firstName, unsubUrl),
          tags: [
            { name: "category", value: "trigger" },
            { name: "trigger", value: "day7_reengagement" },
          ],
        });
        if (result.success) {
          await sc.from("trigger_emails_sent").insert({
            student_id: student.id,
            trigger_type: "day7_reengagement",
            resend_id: result.id || null,
          });
          sent++;
          console.log(`[trigger-emails] Day 7 sent to ${student.email}`);
        } else {
          console.error(`[trigger-emails] Day 7 failed for ${student.email}:`, result.error);
        }
      });
    }

    // ── Day 28 trigger ──
    // Conditions: 28+ days since enroll, 14+ days inactive, not already sent
    if (daysSinceEnroll >= 28 && daysSinceLastActive >= 14 && !sentSet.has(`${student.id}:day28_churn`)) {
      tasks.push(async () => {
        const result = await sendEmail({
          to: student.email,
          subject: "Still planning to take the BCHN exam?",
          html: day28Html(firstName, unsubUrl),
          tags: [
            { name: "category", value: "trigger" },
            { name: "trigger", value: "day28_churn" },
          ],
        });
        if (result.success) {
          await sc.from("trigger_emails_sent").insert({
            student_id: student.id,
            trigger_type: "day28_churn",
            resend_id: result.id || null,
          });
          sent++;
          console.log(`[trigger-emails] Day 28 sent to ${student.email}`);
        } else {
          console.error(`[trigger-emails] Day 28 failed for ${student.email}:`, result.error);
        }
      });
    }
  }

  // Execute all sends (serialized to respect Resend rate limits)
  for (const task of tasks) {
    await task();
    if (tasks.length > 5) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[trigger-emails] Complete: ${sent} sent, ${students.length} students checked`);
  return { statusCode: 200, body: JSON.stringify({ sent, studentsChecked: students.length }) };
};
