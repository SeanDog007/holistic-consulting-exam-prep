/**
 * create-checkout — Creates a Stripe Checkout session for BCHN Exam Prep.
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

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("[create-checkout] Error:", err.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Failed to create checkout session" }),
    };
  }
};
