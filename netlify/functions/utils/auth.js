/**
 * Magic-link auth utilities for BCHN® Exam Prep direct purchase flow.
 *
 * Uses HMAC-signed tokens (no database needed) for both magic links and sessions.
 * Modeled after FMA's auth pattern.
 */
const crypto = require("crypto");

const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days

function getSecret() {
  const secret = process.env.MAGIC_LINK_SECRET;
  if (!secret) throw new Error("MAGIC_LINK_SECRET env var is not set");
  return secret;
}

// ─── Magic link tokens ───

function generateMagicToken(email) {
  const expires = Date.now() + MAGIC_LINK_EXPIRY;
  const payload = `${email.toLowerCase()}|${expires}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return Buffer.from(payload).toString("base64url") + "." + signature;
}

function verifyMagicToken(token) {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return { email: null, reason: "invalid" };

    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

    if (sig.length !== expectedSig.length) return { email: null, reason: "invalid" };
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { email: null, reason: "invalid" };
    }

    const [email, expiresStr] = payload.split("|");
    if (Date.now() > parseInt(expiresStr, 10)) return { email: null, reason: "expired" };

    return { email, reason: "valid" };
  } catch {
    return { email: null, reason: "invalid" };
  }
}

// ─── Signed cookie sessions ───

function createSignedSession(email) {
  const expiresAt = Date.now() + SESSION_MAX_AGE;
  const payload = `${email.toLowerCase()}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return Buffer.from(payload).toString("base64url") + "." + signature;
}

function verifySignedSession(cookie) {
  if (!cookie) return null;
  try {
    const [payloadB64, sig] = cookie.split(".");
    if (!payloadB64 || !sig) return null;

    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const [email, expiresStr] = payload.split("|");
    if (Date.now() > parseInt(expiresStr, 10)) return null;

    return { email };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

function getSessionUser(headers) {
  const cookies = parseCookies(headers.cookie || headers.Cookie || "");
  return verifySignedSession(cookies.hcq_exam_session);
}

function makeSessionCookie(email, isSecure) {
  const signedValue = createSignedSession(email);
  const maxAge = Math.floor(SESSION_MAX_AGE / 1000);
  const secure = isSecure ? "Secure; " : "";
  return `hcq_exam_session=${signedValue}; ${secure}HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function makeClearSessionCookie(isSecure) {
  const secure = isSecure ? "Secure; " : "";
  return `hcq_exam_session=; ${secure}HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

module.exports = {
  generateMagicToken,
  verifyMagicToken,
  createSignedSession,
  verifySignedSession,
  parseCookies,
  getSessionUser,
  makeSessionCookie,
  makeClearSessionCookie,
  MAGIC_LINK_EXPIRY,
  SESSION_MAX_AGE,
};
