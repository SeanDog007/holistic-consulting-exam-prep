/**
 * check-access — Checks if the current session has valid auth + enrollment.
 *
 * GET /api/check-access
 *
 * Returns: { authenticated: bool, enrolled: bool, email: string|null }
 *
 * Used by buy.html to determine what to show (sales page vs app).
 */
const { getSessionUser } = require("./utils/auth");
const { hasEnrollment } = require("./utils/enrollments");
const { getCorsHeaders } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const user = getSessionUser(event.headers);

  if (!user) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ authenticated: false, enrolled: false, email: null }),
    };
  }

  const enrolled = await hasEnrollment(user.email);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      authenticated: true,
      enrolled,
      email: user.email,
    }),
  };
};
