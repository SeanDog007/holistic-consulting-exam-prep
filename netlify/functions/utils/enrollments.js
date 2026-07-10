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
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("status", "active")
    .limit(1);

  if (error) {
    console.error("[enrollments] Check failed:", error.message);
    return false;
  }

  // Tolerant of duplicate active rows (avoid the .maybeSingle() error that
  // previously locked out anyone who had more than one active enrollment).
  return Array.isArray(data) && data.length > 0;
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
  const normalizedEmail = email.toLowerCase();

  // Idempotent per email: if an active enrollment already exists, reuse it
  // instead of inserting a duplicate. Prevents duplicate rows piling up from
  // repeat checkouts or retried Stripe webhook events.
  const { data: existing } = await sb
    .from("direct_enrollments")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1);

  if (Array.isArray(existing) && existing.length > 0) {
    return { success: true, enrollment: existing[0], alreadyEnrolled: true };
  }

  const { data, error } = await sb
    .from("direct_enrollments")
    .insert({
      email: normalizedEmail,
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
    .maybeSingle();

  if (error) return null;
  return data;
}

module.exports = { hasEnrollment, createEnrollment, getEnrollment };
