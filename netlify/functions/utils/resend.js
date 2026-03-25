/**
 * Resend email utility for Exam Prep magic links
 */
const { Resend } = require("resend");

const DEFAULT_FROM = process.env.FROM_EMAIL || "hello@holisticconsultinghq.com";
const DEFAULT_REPLY_TO = "hello@holisticconsultinghq.com";

async function sendEmail({ to, subject, html, from = DEFAULT_FROM, replyTo = DEFAULT_REPLY_TO, tags }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({ from, to, replyTo, subject, html, tags });
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
