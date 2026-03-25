/**
 * send-magic-link — Sends a magic link email for passwordless login.
 *
 * POST /api/send-magic-link
 * Body: { email: string }
 *
 * Rate limited: 3 attempts per email per 15 minutes.
 */
const { generateMagicToken } = require("./utils/auth");
const { sendEmail } = require("./utils/resend");
const { hasEnrollment } = require("./utils/enrollments");
const { getCorsHeaders } = require("./utils/supabase");

const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";

// In-memory rate limiting (resets on function cold start, which is fine for Netlify)
const _rateLimits = new Map();

function checkRateLimit(email, maxAttempts = 3, windowMs = 15 * 60 * 1000) {
  const key = email.toLowerCase();
  const now = Date.now();
  let entry = _rateLimits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0 };
    _rateLimits.set(key, entry);
  }
  entry.count++;
  return entry.count <= maxAttempts;
}

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email || !email.includes("@")) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Valid email is required" }) };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit
    if (!checkRateLimit(normalizedEmail)) {
      return {
        statusCode: 429,
        headers: cors,
        body: JSON.stringify({ error: "Too many requests. Please wait a few minutes and try again." }),
      };
    }

    // Check enrollment — only enrolled users can request magic links
    const enrolled = await hasEnrollment(normalizedEmail);
    
    // Always return success (don't leak whether email is enrolled)
    // But only actually send the email if enrolled
    if (enrolled) {
      const token = generateMagicToken(normalizedEmail);
      const magicUrl = `${SITE_URL}/.netlify/functions/verify-magic-link?token=${encodeURIComponent(token)}`;

      await sendEmail({
        to: normalizedEmail,
        subject: "Your BCHN Exam Prep Login Link",
        html: `
          <div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; color: #2A3024; margin-bottom: 8px;">
              BCHN Exam Prep
            </h1>
            <p style="color: #6B7F5E; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">
              Holistic Consulting
            </p>
            <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">
              Click below to sign in to your Exam Prep portal:
            </p>
            <div style="margin: 28px 0;">
              <a href="${magicUrl}" style="display: inline-block; background: #6B7F5E; color: white; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none;">
                Sign In →
              </a>
            </div>
            <p style="color: #999; font-size: 13px; line-height: 1.6;">
              This link expires in 15 minutes. If you didn't request this, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            <p style="color: #bbb; font-size: 12px;">
              Holistic Consulting HQ · holisticconsultinghq.com
            </p>
          </div>
        `,
        tags: [{ name: "category", value: "exam-prep-magic-link" }],
      });
    }

    // Always return the same response (don't reveal enrollment status)
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        message: "If you have an active enrollment, a login link has been sent to your email.",
      }),
    };
  } catch (err) {
    console.error("[send-magic-link] Error:", err.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Failed to send magic link" }),
    };
  }
};
