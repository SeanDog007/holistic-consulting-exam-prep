/**
 * logout — Clears the session cookie and redirects to buy.html.
 *
 * GET /api/logout
 */
const { makeClearSessionCookie } = require("./utils/auth");

const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";

exports.handler = async (event) => {
  const isSecure = SITE_URL.startsWith("https");
  return {
    statusCode: 302,
    headers: {
      Location: `${SITE_URL}/buy.html`,
      "Set-Cookie": makeClearSessionCookie(isSecure),
      "Cache-Control": "no-cache, no-store",
    },
    body: "",
  };
};
