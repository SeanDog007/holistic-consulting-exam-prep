/**
 * Enrollment store for direct-purchase BCHN® Exam Prep.
 *
 * Uses Supabase table `direct_enrollments` to store purchase records.
 * Falls back to a simple check if the table doesn't exist yet.
 */
const { getServiceClient } = require("./supabase");

const CIRCLE_OWNED_PREFIXES = ["circle-sync:", "circle-paywall-"];
let warnedMissingSource = false;

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

function clientOrDefault(client) {
  return client || getServiceClient();
}

async function getActiveEnrollment(email, client) {
  const sb = clientOrDefault(client);
  const { data, error } = await sb
    .from("direct_enrollments")
    .select("*")
    .eq("email", String(email || "").toLowerCase())
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1);

  if (error) return { error, enrollment: null };
  const enrollment = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { enrollment };
}

async function getEnrollmentBySessionId(stripeSessionId, client) {
  const sb = clientOrDefault(client);
  const { data, error } = await sb
    .from("direct_enrollments")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .limit(1);

  if (error) return { error, enrollment: null };
  const enrollment = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { enrollment };
}

function isMissingSourceColumn(error) {
  if (!error) return false;
  const msg = String(error.message || "");
  if (error.code === "PGRST204") return /source/i.test(msg);
  return /source/i.test(msg) && /column|schema cache/i.test(msg);
}

function isUniqueViolation(error) {
  if (!error) return false;
  const text = typeof error === "string" ? error : `${error.code || ""} ${error.message || ""}`;
  return error.code === "23505" || /duplicate key|unique constraint|23505/i.test(text);
}

function warnMissingSource() {
  if (warnedMissingSource) return;
  warnedMissingSource = true;
  console.warn(
    "[enrollments] direct_enrollments.source is missing; the SamCart order id is stored on stripe_session_id only. Run migrations/003-enrollment-source.sql to add the column."
  );
}

async function insertEnrollmentRow(sb, row) {
  let result = await sb.from("direct_enrollments").insert(row).select().single();
  if (result.error && row.source != null && isMissingSourceColumn(result.error)) {
    warnMissingSource();
    const withoutSource = { ...row };
    delete withoutSource.source;
    result = await sb.from("direct_enrollments").insert(withoutSource).select().single();
  }
  return result;
}

async function updateEnrollmentRow(sb, id, patch) {
  let result = await sb.from("direct_enrollments").update(patch).eq("id", id).select().single();
  if (result.error && patch.source != null && isMissingSourceColumn(result.error)) {
    warnMissingSource();
    const withoutSource = { ...patch };
    delete withoutSource.source;
    result = await sb.from("direct_enrollments").update(withoutSource).eq("id", id).select().single();
  }
  return result;
}

/**
 * Create an enrollment record after successful Stripe checkout.
 * Optional `source` is omitted when the column does not exist yet.
 * Pass `client` only from tests.
 */
async function createEnrollment({
  email,
  name,
  stripeSessionId,
  stripeCustomerId,
  priceId,
  amountPaid,
  source,
}, client) {
  const sb = clientOrDefault(client);
  const normalizedEmail = email.toLowerCase();

  // Idempotent per email: if an active enrollment already exists, reuse it
  // instead of inserting a duplicate. Prevents duplicate rows piling up from
  // repeat checkouts or retried Stripe webhook events.
  const { enrollment: existing } = await getActiveEnrollment(normalizedEmail, sb);
  if (existing) {
    return { success: true, enrollment: existing, alreadyEnrolled: true };
  }

  const row = {
    email: normalizedEmail,
    name: name || "",
    stripe_session_id: stripeSessionId,
    stripe_customer_id: stripeCustomerId,
    price_id: priceId,
    amount_paid: amountPaid,
    status: "active",
    enrolled_at: new Date().toISOString(),
  };
  if (source) row.source = source;

  const { data, error } = await insertEnrollmentRow(sb, row);

  if (error) {
    console.error("[enrollments] Create failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, enrollment: data };
}

function samcartSessionId(orderId) {
  return `samcart:${orderId}`;
}

function isCircleOwnedSession(sessionId) {
  return CIRCLE_OWNED_PREFIXES.some((prefix) => String(sessionId || "").startsWith(prefix));
}

function validOrderId(orderId) {
  return /^[A-Za-z0-9_-]+$/.test(String(orderId || ""));
}

/**
 * Idempotently record a SamCart exam-prep order.
 *
 * The order id lives in stripe_session_id as `samcart:<order id>` (same
 * column the Circle sync uses for its own prefix). `source` is `samcart`
 * when that column exists. A retried notification for an order that is
 * already refunded or cancelled does not turn access back on.
 *
 * An active Circle grant for the same email is updated to this order so the
 * nightly sync (which only cancels `circle-sync:` / `circle-paywall:` rows)
 * will not drop someone who has now paid, and a later refund can find the
 * order. An active Stripe row, or another SamCart order, is left as-is.
 */
async function recordSamcartPurchase({
  email,
  name,
  orderId,
  productId,
  amountPaid,
}, client) {
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail || !validOrderId(orderId)) {
    return { success: false, error: "email and orderId are required" };
  }
  const sessionId = samcartSessionId(orderId);
  const sb = clientOrDefault(client);

  const found = await getEnrollmentBySessionId(sessionId, sb);
  if (found.error) return { success: false, error: found.error.message || String(found.error) };
  if (found.enrollment) {
    return { success: true, enrollment: found.enrollment, created: false, alreadyRecorded: true };
  }

  const active = await getActiveEnrollment(normalizedEmail, sb);
  if (active.error) return { success: false, error: active.error.message || String(active.error) };
  if (active.enrollment && isCircleOwnedSession(active.enrollment.stripe_session_id)) {
    const adopted = await updateEnrollmentRow(sb, active.enrollment.id, {
      stripe_session_id: sessionId,
      name: name || active.enrollment.name || "",
      price_id: productId || "",
      amount_paid: amountPaid,
      source: "samcart",
    });
    if (adopted.error) return { success: false, error: adopted.error.message || String(adopted.error) };
    return { success: true, enrollment: adopted.data, created: false, adopted: true };
  }
  if (active.enrollment) {
    return { success: true, enrollment: active.enrollment, created: false, keptExisting: true };
  }

  const inserted = await createEnrollment({
    email: normalizedEmail,
    name,
    stripeSessionId: sessionId,
    stripeCustomerId: null,
    priceId: productId || "",
    amountPaid,
    source: "samcart",
  }, sb);

  if (inserted.success && inserted.alreadyEnrolled) {
    if (isCircleOwnedSession(inserted.enrollment && inserted.enrollment.stripe_session_id)) {
      const adopted = await updateEnrollmentRow(sb, inserted.enrollment.id, {
        stripe_session_id: sessionId,
        name: name || inserted.enrollment.name || "",
        price_id: productId || "",
        amount_paid: amountPaid,
        source: "samcart",
      });
      if (adopted.error) return { success: false, error: adopted.error.message || String(adopted.error) };
      return { success: true, enrollment: adopted.data, created: false, adopted: true };
    }
    return { success: true, enrollment: inserted.enrollment, created: false, keptExisting: true };
  }

  if (!inserted.success && isUniqueViolation(inserted.error)) {
    const again = await getEnrollmentBySessionId(sessionId, sb);
    if (again.enrollment) {
      return { success: true, enrollment: again.enrollment, created: false, alreadyRecorded: true };
    }
    const activeAgain = await getActiveEnrollment(normalizedEmail, sb);
    if (activeAgain.enrollment) {
      return { success: true, enrollment: activeAgain.enrollment, created: false, keptExisting: true };
    }
  }

  if (!inserted.success) return inserted;
  return { success: true, enrollment: inserted.enrollment, created: true };
}

/**
 * Mark the SamCart order refunded or cancelled. Never updates a row whose
 * stripe_session_id is not `samcart:<order id>`. If the purchase has not been
 * stored yet, writes an inactive placeholder so a late purchase notification
 * for this same order cannot grant access.
 */
async function revokeSamcartOrder({
  email,
  name,
  orderId,
  productId,
  amountPaid,
  status,
}, client) {
  if (status !== "refunded" && status !== "cancelled") {
    return { success: false, error: "unsupported status" };
  }
  if (!validOrderId(orderId)) return { success: false, error: "orderId is required" };
  const normalizedEmail = String(email || "").toLowerCase();
  const sessionId = samcartSessionId(orderId);
  const sb = clientOrDefault(client);

  const found = await getEnrollmentBySessionId(sessionId, sb);
  if (found.error) return { success: false, error: found.error.message || String(found.error) };
  if (found.enrollment) {
    if (!String(found.enrollment.stripe_session_id || "").startsWith("samcart:")) {
      return { success: false, error: "refusing to revoke a non-samcart row" };
    }
    if (found.enrollment.status === status) {
      return { success: true, enrollment: found.enrollment, changed: false, alreadyRecorded: true };
    }
    const { data, error } = await sb
      .from("direct_enrollments")
      .update({ status })
      .eq("stripe_session_id", sessionId)
      .select();
    if (error) return { success: false, error: error.message || String(error) };
    const enrollment = Array.isArray(data) ? data[0] : data;
    if (!enrollment || !String(enrollment.stripe_session_id || "").startsWith("samcart:")) {
      return { success: false, error: "refusing to revoke a non-samcart row" };
    }
    return { success: true, enrollment, changed: true };
  }

  if (!normalizedEmail.includes("@") || /\s/.test(normalizedEmail)) {
    return { success: false, error: "email is required to record a refund" };
  }

  const inserted = await insertEnrollmentRow(sb, {
    email: normalizedEmail,
    name: name || "",
    stripe_session_id: sessionId,
    stripe_customer_id: null,
    price_id: productId || "",
    amount_paid: amountPaid,
    status,
    source: "samcart",
    enrolled_at: new Date().toISOString(),
  });
  if (inserted.error && isUniqueViolation(inserted.error)) {
    const again = await getEnrollmentBySessionId(sessionId, sb);
    if (again.enrollment) {
      return { success: true, enrollment: again.enrollment, changed: false, alreadyRecorded: true };
    }
  }
  if (inserted.error) return { success: false, error: inserted.error.message || String(inserted.error) };
  return { success: true, enrollment: inserted.data, created: true, placeholder: true, changed: true };
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

module.exports = {
  hasEnrollment,
  createEnrollment,
  getEnrollment,
  getActiveEnrollment,
  getEnrollmentBySessionId,
  recordSamcartPurchase,
  revokeSamcartOrder,
};
