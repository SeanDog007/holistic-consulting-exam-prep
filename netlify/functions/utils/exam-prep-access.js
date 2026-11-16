/**
 * Shared purchase side effects for BCHN® Exam Prep.
 *
 * stripe-webhook.js and samcart-webhook.js both call these so a SamCart
 * buyer gets the same Kit tags and the same welcome magic link as a Stripe
 * buyer. Enrollment rows are written by the caller; this module does not
 * touch Supabase.
 */
const { addSubscriber } = require("./kit");
const { generateMagicToken } = require("./auth");
const { sendEmail } = require("./resend");

const EXAM_PREP_KIT_TAGS = [
  "HC:src:exam-prep",
  "HC:int:bchn-exam",
  "HC:stage:buyer",
  "HC:bought:exam-prep",
];

function siteUrl() {
  return process.env.SITE_URL || "https://exam.holisticconsultinghq.com";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildWelcomeEmail({ firstName, magicUrl }) {
  const name = escapeHtml(firstName || "there");
  return {
    subject: "🎉 Welcome to BCHN® Exam Prep — Access Your Account",
    html: `
            <div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
              <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; color: #2A3024; margin-bottom: 8px;">
                Welcome to BCHN® Exam Prep
              </h1>
              <p style="color: #6B7F5E; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">
                Holistic Consulting
              </p>
              <p style="color: #3a4a3a; font-size: 15px; line-height: 1.7;">
                Hey ${name}! Your purchase is confirmed. Click below to access your Exam Prep portal:
              </p>
              <div style="margin: 28px 0;">
                <a href="${magicUrl}" style="display: inline-block; background: #6B7F5E; color: white; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none;">
                  Access Exam Prep →
                </a>
              </div>
              <p style="color: #999; font-size: 13px; line-height: 1.6;">
                This link expires in 15 minutes. You can always request a new one from the login page.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="color: #bbb; font-size: 12px;">
                Holistic Consulting HQ · holisticconsultinghq.com
              </p>
            </div>
          `,
  };
}

async function syncBuyerToKit({ email, firstName }) {
  if (!(process.env.KIT_API_SECRET || process.env.KIT_API_KEY)) {
    return { skipped: true, success: false };
  }
  return addSubscriber({
    email,
    firstName: firstName || "",
    tags: EXAM_PREP_KIT_TAGS,
  });
}

async function sendWelcomeMagicLink({ email, firstName }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAGIC_LINK_SECRET) {
    return { skipped: true, success: false };
  }
  const token = generateMagicToken(email);
  const magicUrl = `${siteUrl()}/.netlify/functions/verify-magic-link?token=${encodeURIComponent(token)}`;
  const { subject, html } = buildWelcomeEmail({ firstName, magicUrl });
  return sendEmail({
    to: email,
    subject,
    html,
    tags: [{ name: "category", value: "exam-prep-welcome" }],
  });
}

module.exports = {
  EXAM_PREP_KIT_TAGS,
  buildWelcomeEmail,
  syncBuyerToKit,
  sendWelcomeMagicLink,
};
