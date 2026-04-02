/**
 * Resend email utility for Exam Prep magic links
 */
const { Resend } = require("resend");

const DEFAULT_FROM = process.env.FROM_EMAIL || "hello@holisticconsultinghq.com";
const DEFAULT_REPLY_TO = "hello@holisticconsultinghq.com";

/**
 * Strip HTML to plain text for the `text` param (spam filter prevention).
 * Resend recommends sending both html + text versions.
 */
function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·")
    .replace(/&#8226;/g, "•")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendEmail({ to, subject, html, text, from = DEFAULT_FROM, replyTo = DEFAULT_REPLY_TO, tags }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from, to, replyTo, subject, html,
      text: text || htmlToText(html),
      tags,
    });
    if (error) {
      console.error("[resend] Email send error:", error);
      return { success: false, error };
    }
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[resend] Unexpected error:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
