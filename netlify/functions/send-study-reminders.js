/**
 * send-study-reminders — Netlify scheduled function (daily at 8 AM ET).
 * Sends personalized study reminder emails to students with exam dates set.
 *
 * Schedule: daily at 12:00 UTC (8 AM ET during EDT)
 */
const { getServiceClient } = require("./utils/supabase");
const { sendEmail } = require("./utils/resend");

const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";

const DOMAIN_NAMES = {
  1: "Food & Nutrition",
  2: "A&P / Biochemistry",
  3: "Counseling / Ethics / Scope",
  4: "Nutrition in Practice",
  5: "Research",
};

// Motivational messages — professional, encouraging, varied
const MOTIVATIONAL_MESSAGES = [
  "Every question you practice today strengthens your readiness for exam day.",
  "Consistency beats intensity. A focused 30-minute session today moves you forward.",
  "The practitioners who pass aren't the ones who cram — they're the ones who show up daily.",
  "Your future clients are counting on the knowledge you're building right now.",
  "Small, steady progress compounds. Keep showing up.",
  "You've already taken the hardest step — committing to this. Now keep the momentum going.",
  "Think of each practice question as a rep that makes you stronger for the real thing.",
  "The exam tests what you know, not what you memorize last minute. Trust your preparation.",
  "Today's study session is an investment in your career. Make it count.",
  "Progress isn't always visible day to day, but it's there. Keep going.",
];

exports.handler = async (event) => {
  console.log("[send-study-reminders] Starting daily reminder run...");

  const sc = getServiceClient();

  // Fetch all students with:
  // - exam date set (in the future)
  // - email reminders enabled
  // - active account
  const today = new Date().toISOString().slice(0, 10);
  const { data: students, error } = await sc
    .from("student_profiles")
    .select("id, email, display_name, target_exam_date, unsubscribe_token")
    .eq("email_reminders_enabled", true)
    .eq("is_active", true)
    .not("target_exam_date", "is", null)
    .gte("target_exam_date", today);

  if (error) {
    console.error("[send-study-reminders] Failed to fetch students:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  if (!students || students.length === 0) {
    console.log("[send-study-reminders] No eligible students found.");
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  console.log(`[send-study-reminders] Found ${students.length} eligible students.`);

  let sent = 0;
  let failed = 0;

  for (const student of students) {
    try {
      const daysUntilExam = Math.ceil(
        (new Date(student.target_exam_date) - new Date(today)) / (1000 * 60 * 60 * 24)
      );

      // Skip if exam is more than 90 days out (don't spam early planners)
      if (daysUntilExam > 90) continue;

      // Get their study plan for today's recommended topic
      let todayTopic = null;
      try {
        const { data: plan } = await sc
          .from("study_plans")
          .select("plan_data")
          .eq("user_id", student.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (plan?.plan_data?.weeks) {
          const planStart = new Date(plan.plan_data.weeks[0]?.start_date || today);
          const daysSinceStart = Math.floor((new Date(today) - planStart) / (1000 * 60 * 60 * 24));
          const currentWeekNum = Math.max(1, Math.floor(daysSinceStart / 7) + 1);
          const currentWeek = plan.plan_data.weeks.find(w => w.week === currentWeekNum);
          if (currentWeek?.domains?.length > 0) {
            todayTopic = currentWeek.domains.map(d => DOMAIN_NAMES[d] || `Domain ${d}`).join(" & ");
          } else if (currentWeek?.theme) {
            todayTopic = currentWeek.theme;
          }
        }
      } catch (e) {
        // No study plan — that's fine, we just won't include a topic
      }

      const motivational = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      const firstName = (student.display_name || student.email.split("@")[0]).split(" ")[0];
      const unsubUrl = `${SITE_URL}/.netlify/functions/unsubscribe?token=${student.unsubscribe_token}`;

      const urgencyColor = daysUntilExam <= 7 ? "#e53935" : daysUntilExam <= 14 ? "#B07242" : "#6B7F5E";
      const urgencyLabel = daysUntilExam <= 7 ? "Final stretch!" : daysUntilExam <= 14 ? "Two weeks out" : "";
      const urgencyBg = daysUntilExam <= 7 ? "#FFF5F5" : daysUntilExam <= 14 ? "#FFF8F0" : "#f4f7f2";

      const topicSection = todayTopic
        ? `<div style="background: #f4f7f2; border: 1px solid #e4ebe0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7F5E; margin: 0 0 6px;">Today's Focus</p>
            <p style="font-size: 15px; font-weight: 600; color: #2A3024; margin: 0;">${todayTopic}</p>
          </div>`
        : "";

      const html = `
<div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
  <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; color: #2A3024; margin-bottom: 4px;">
    BCHN® Exam Prep
  </h1>
  <p style="color: #6B7F5E; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">
    Daily Study Reminder
  </p>

  <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7; margin-bottom: 8px;">
    Good morning, ${firstName}.
  </p>

  <!-- Countdown -->
  <div style="background: ${urgencyBg}; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
    <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 42px; font-weight: 700; color: ${urgencyColor}; margin: 0; line-height: 1;">
      ${daysUntilExam}
    </p>
    <p style="font-size: 14px; color: #475940; margin: 4px 0 0; font-weight: 500;">
      day${daysUntilExam !== 1 ? "s" : ""} until your exam${urgencyLabel ? ` · <span style="color: ${urgencyColor}; font-weight: 700;">${urgencyLabel}</span>` : ""}
    </p>
  </div>

  ${topicSection}

  <p style="color: #6B7F5E; font-size: 14px; line-height: 1.7; font-style: italic; margin: 20px 0;">
    "${motivational}"
  </p>

  <div style="margin: 28px 0;">
    <a href="${SITE_URL}" style="display: inline-block; background: ${urgencyColor}; color: white; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none;">
      Open Exam Prep →
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #bbb; font-size: 12px; line-height: 1.6;">
    Holistic Consulting HQ · holisticconsultinghq.com<br>
    <a href="${unsubUrl}" style="color: #bbb; text-decoration: underline;">Unsubscribe from daily reminders</a>
  </p>
</div>`;

      const result = await sendEmail({
        to: student.email,
        subject: `${daysUntilExam} day${daysUntilExam !== 1 ? "s" : ""} until your BCHN® exam${urgencyLabel ? " — " + urgencyLabel : ""}`,
        html,
        tags: [{ name: "category", value: "exam-prep-daily-reminder" }],
      });

      if (result.success) {
        sent++;
      } else {
        console.error(`[send-study-reminders] Failed for ${student.email}:`, result.error);
        failed++;
      }

      // Small delay between sends to respect Resend rate limits
      if (students.length > 5) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      console.error(`[send-study-reminders] Error for ${student.email}:`, err.message);
      failed++;
    }
  }

  console.log(`[send-study-reminders] Complete. Sent: ${sent}, Failed: ${failed}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ sent, failed, total: students.length }),
  };
};
