/**
 * stripe-webhook — Handles Stripe webhook events for BCHN Exam Prep.
 *
 * POST /api/stripe-webhook
 *
 * Handles checkout.session.completed:
 * 1. Creates enrollment record in Supabase
 * 2. Syncs buyer to Kit with purchase tag
 * 3. Sends magic link email for immediate access
 */
const { getStripe } = require("./utils/stripe");
const { createEnrollment } = require("./utils/enrollments");
const { addSubscriber } = require("./utils/kit");
const { generateMagicToken } = require("./utils/auth");
const { sendEmail } = require("./utils/resend");

const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripe = getStripe();
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, WEBHOOK_SECRET);
    } else {
      // In dev without webhook secret, parse directly (NOT for production)
      console.warn("[stripe-webhook] No STRIPE_WEBHOOK_SECRET — skipping signature verification");
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const email = (session.customer_email || session.customer_details?.email || session.metadata?.buyer_email || "").toLowerCase();

    if (!email) {
      console.error("[stripe-webhook] No email found in checkout session");
      return { statusCode: 200, body: "No email — skipped" };
    }

    console.log(`[stripe-webhook] Processing purchase for ${email}`);

    // 1. Create enrollment record
    const enrollResult = await createEnrollment({
      email,
      name: session.customer_details?.name || "",
      stripeSessionId: session.id,
      stripeCustomerId: session.customer,
      priceId: session.metadata?.price_id || "",
      amountPaid: session.amount_total,
    });

    if (!enrollResult.success) {
      console.error("[stripe-webhook] Enrollment creation failed:", enrollResult.error);
      // Don't return 500 — Stripe will retry. Log and move on.
    }

    // 2. Sync to Kit (ConvertKit) with HC: tags
    if (process.env.KIT_API_SECRET || process.env.KIT_API_KEY) {
      try {
        await addSubscriber({
          email,
          firstName: (session.customer_details?.name || "").split(" ")[0],
          tags: [
            "HC:src:exam-prep",
            "HC:int:bchn-exam",
            "HC:stage:buyer",
            "HC:bought:exam-prep",
          ],
        });
        console.log(`[stripe-webhook] Kit subscriber synced with HC: tags: ${email}`);
      } catch (kitErr) {
        console.error("[stripe-webhook] Kit sync failed:", kitErr.message);
      }
    }

    // 3. Send magic link email for immediate access
    if (process.env.RESEND_API_KEY && process.env.MAGIC_LINK_SECRET) {
      try {
        const token = generateMagicToken(email);
        const magicUrl = `${SITE_URL}/.netlify/functions/verify-magic-link?token=${encodeURIComponent(token)}`;
        const name = (session.customer_details?.name || "").split(" ")[0] || "there";

        await sendEmail({
          to: email,
          subject: "🎉 Welcome to BCHN Exam Prep — Access Your Account",
          html: `
            <div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
              <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; color: #2A3024; margin-bottom: 8px;">
                Welcome to BCHN Exam Prep
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
          tags: [{ name: "category", value: "exam-prep-welcome" }],
        });
        console.log(`[stripe-webhook] Welcome magic link sent to ${email}`);
      } catch (emailErr) {
        console.error("[stripe-webhook] Welcome email failed:", emailErr.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true, email }) };
  }

  // Acknowledge other event types
  return { statusCode: 200, body: JSON.stringify({ received: true, type: stripeEvent.type }) };
};
