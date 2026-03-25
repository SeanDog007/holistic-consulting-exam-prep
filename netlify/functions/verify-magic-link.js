/**
 * verify-magic-link — Verifies a magic link token and sets a session cookie.
 *
 * GET /api/verify-magic-link?token=...
 *
 * On success: sets hcq_exam_session cookie and redirects to the exam prep app.
 * On failure: redirects to buy.html with an error message.
 */
const { verifyMagicToken, makeSessionCookie } = require("./utils/auth");
const { hasEnrollment } = require("./utils/enrollments");

const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return redirect(`${SITE_URL}/buy.html?error=missing_token`);
  }

  const { email, reason } = verifyMagicToken(token);

  if (!email) {
    const errorParam = reason === "expired" ? "link_expired" : "invalid_link";
    return redirect(`${SITE_URL}/buy.html?error=${errorParam}`);
  }

  // Verify enrollment
  const enrolled = await hasEnrollment(email);
  if (!enrolled) {
    return redirect(`${SITE_URL}/buy.html?error=no_enrollment`);
  }

  // Set session cookie and redirect to the app
  const isSecure = SITE_URL.startsWith("https");
  const cookie = makeSessionCookie(email, isSecure);

  return {
    statusCode: 302,
    headers: {
      Location: `${SITE_URL}/buy.html?authenticated=1`,
      "Set-Cookie": cookie,
      "Cache-Control": "no-cache, no-store",
    },
    body: "",
  };
};

function redirect(url) {
  return {
    statusCode: 302,
    headers: { Location: url, "Cache-Control": "no-cache, no-store" },
    body: "",
  };
}
