/**
 * unsubscribe — One-click unsubscribe from daily study reminders.
 *
 * GET ?token=<uuid> → renders confirmation page and disables reminders.
 */
const { getServiceClient } = require("./utils/supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: renderPage("Invalid Link", "This unsubscribe link is invalid or expired.", false),
    };
  }

  const sc = getServiceClient();

  // Find the student by unsubscribe token
  const { data: profile, error } = await sc
    .from("student_profiles")
    .select("id, email, email_reminders_enabled")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !profile) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html" },
      body: renderPage("Link Not Found", "We couldn't find an account matching this unsubscribe link. It may have already been used or expired.", false),
    };
  }

  if (!profile.email_reminders_enabled) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: renderPage("Already Unsubscribed", "You've already been unsubscribed from daily study reminders. No further emails will be sent.", true),
    };
  }

  // Disable reminders
  await sc
    .from("student_profiles")
    .update({ email_reminders_enabled: false })
    .eq("id", profile.id);

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: renderPage(
      "Unsubscribed Successfully",
      "You've been unsubscribed from daily study reminders. You can re-enable them anytime from your Exam Prep dashboard.",
      true
    ),
  };
};

function renderPage(title, message, success) {
  const icon = success
    ? '<svg class="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
    : '<svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — BCHN® Exam Prep</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'DM Sans', sans-serif; background: #F5F1E6; margin: 0; padding: 40px 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 12px; padding: 48px 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(42,48,36,0.06), 0 4px 12px rgba(42,48,36,0.04); }
    h1 { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #2A3024; margin: 0 0 12px; }
    p { color: #6B7F5E; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #6B7F5E; color: white; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; }
    a:hover { background: #5a6e4e; }
    .footer { font-size: 12px; color: #C5BFAF; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    ${icon}
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://exam.holisticconsultinghq.com">Return to Exam Prep →</a>
    <p class="footer">Holistic Consulting HQ · holisticconsultinghq.com</p>
  </div>
</body>
</html>`;
}
