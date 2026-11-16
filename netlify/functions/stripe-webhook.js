/**
 * stripe-webhook — Handles Stripe webhook events for BCHN® Exam Prep.
 *
 * POST /api/stripe-webhook
 *
 * Handles checkout.session.completed:
 * 1. Creates enrollment record in Supabase
 * 2. Syncs buyer to Kit with purchase tag
 * 3. Sends magic link email for immediate access
 *
 * The Kit tags and welcome email are shared with samcart-webhook.js
 * via utils/exam-prep-access.js.
 */
const { getStripe } = require("./utils/stripe");
const { createEnrollment } = require("./utils/enrollments");
const { syncBuyerToKit, sendWelcomeMagicLink } = require("./utils/exam-prep-access");

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

    // 2. Sync to Kit (ConvertKit) with the same HC: tags SamCart uses.
    const firstName = (session.customer_details?.name || "").split(" ")[0];
    if (process.env.KIT_API_SECRET || process.env.KIT_API_KEY) {
      try {
        await syncBuyerToKit({ email, firstName });
        console.log(`[stripe-webhook] Kit subscriber synced with HC: tags: ${email}`);
      } catch (kitErr) {
        console.error("[stripe-webhook] Kit sync failed:", kitErr.message);
      }
    }

    // 3. Send magic link email for immediate access
    if (process.env.RESEND_API_KEY && process.env.MAGIC_LINK_SECRET) {
      try {
        await sendWelcomeMagicLink({ email, firstName });
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
