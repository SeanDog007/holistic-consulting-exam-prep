/**
 * Enrollment store for direct-purchase BCHN® Exam Prep.
 *
 * Uses Supabase table `direct_enrollments` to store purchase records.
 * Falls back to a simple check if the table doesn't exist yet.
 */
const { getServiceClient } = require("./supabase");

/**
 * Check if an email has an active direct-purchase enrollment.
 */
async function hasEnrollment(email) {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("direct_enrollments")
    .select("id, status")
    .eq("email", email.toLowerCase())
    .eq("status", "active")
    .limit(1);

  if (error) {
    console.error("[enrollments] Check failed:", error.message);
    // If table doesn't exist yet, return false gracefully
    if (error.code === "42P01" || error.message.includes("does not exist")) {
      return false;
    }
    return false;
  }

  return data && data.length > 0;
}

/**
 * Create an enrollment record after successful Stripe checkout.
 */
async function createEnrollment({
  email,
  name,
  stripeSessionId,
  stripeCustomerId,
  priceId,
  amountPaid,
}) {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("direct_enrollments")
    .insert({
      email: email.toLowerCase(),
      name: name || "",
      stripe_session_id: stripeSessionId,
      stripe_customer_id: stripeCustomerId,
      price_id: priceId,
      amount_paid: amountPaid,
      status: "active",
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[enrollments] Create failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, enrollment: data };
}

/**
 * Get enrollment details for an email.
 */
async function getEnrollment(email) {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("direct_enrollments")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

module.exports = { hasEnrollment, createEnrollment, getEnrollment };
