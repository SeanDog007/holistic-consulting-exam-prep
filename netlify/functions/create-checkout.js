/**
 * create-checkout — Creates a Stripe Checkout session for BCHN® Exam Prep.
 *
 * POST /api/create-checkout
 * Body: { email: string }
 *
 * Returns: { url: string } — the Stripe Checkout URL to redirect to.
 */
const { getStripe } = require("./utils/stripe");
const { getCorsHeaders } = require("./utils/supabase");

// Product config — use env vars so we can swap test/live easily
const PRICE_ID = process.env.EXAM_PREP_PRICE_ID || "PLACEHOLDER_PRICE_ID";
const SITE_URL = process.env.SITE_URL || "https://exam.holisticconsultinghq.com";

const CRM_SUBMIT_LEAD = process.env.CRM_SUBMIT_LEAD_URL ||
  "https://holistic-consulting-crm.netlify.app/.netlify/functions/submit-lead";
const CAPTURE_TIMEOUT_MS = 2000;

/**
 * Record the checkout intent as a lead so the email isn't lost when someone
 * abandons payment. Stripe only ever tells us about *completed* purchases, so
 * without this the highest-intent traffic on the site is captured nowhere.
 *
 * Tags applied by the CRM: HC:src:exam-prep, HC:form:checkout,
 * HC:int:bchn-exam, HC:stage:lead — which routes into HC:seq:exam-prep-onboard.
 * On purchase, stripe-webhook adds HC:stage:buyer + HC:bought:exam-prep, so
 * "abandoned" is derived as: has HC:form:checkout, lacks HC:bought:exam-prep.
 *
 * Best-effort by design: never throws, never blocks checkout. A capture failure
 * must not cost us a sale.
 */
async function captureCheckoutIntent(email) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);
  try {
    const res = await fetch(CRM_SUBMIT_LEAD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        email,
        sourceSite: "exam_prep",
        sourceForm: "exam_prep_checkout",
        // interest drives the HC:int:bchn-exam routing tag; leadType makes the
        // email-only payload valid even if the CRM hasn't shipped
        // exam_prep_checkout in SUBSCRIBER_FORMS yet (no deploy ordering hazard).
        interest: "bchn_exam_prep",
        leadType: "subscriber",
      }),
    });
    if (!res.ok) {
      console.error(`[create-checkout] lead capture failed: HTTP ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    // Includes the 429 rate-limit case (same email retrying within a minute)
    // and the abort timeout. Both are safe to swallow.
    console.error("[create-checkout] lead capture error:", err.name, err.message);
  } finally {
    clearTimeout(timer);
  }
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

    const stripe = getStripe();
    console.log("[create-checkout] PRICE_ID:", PRICE_ID);
    console.log("[create-checkout] STRIPE_SECRET_KEY present:", !!process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email.toLowerCase(),
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/buy.html?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/buy.html?canceled=1`,
      metadata: {
        product: "bchn-exam-prep",
        buyer_email: email.toLowerCase(),
      },
    });

    // Capture after the session exists (so we don't record intent for a checkout
    // that never got off the ground) but before returning the redirect URL —
    // Netlify freezes the function once the handler resolves, so a detached
    // promise here would frequently be killed before it lands.
    await captureCheckoutIntent(email.toLowerCase());

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("[create-checkout] Error:", err.message, err.type || "", err.code || "");
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Failed to create checkout session", detail: err.message }),
    };
  }
};
